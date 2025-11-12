import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UploadResult, UploadOptions } from '@/types/upload';
import {
  validateImageSize,
  validateImageSignature,
  validateMimeType,
  checkMaliciousContent,
  generateSecureFilename,
  sanitizeFilename,
  validateFileExtension,
  processAndSaveImage,
  getDefaultUploadOptions
} from '@/lib/upload-utils';
import { gcsUploader } from '@/lib/gcs-utils';
import sharp from 'sharp';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function ensureUploadDir(uploadPath: string): Promise<void> {
  try {
    await fs.access(uploadPath);
  } catch {
    await fs.mkdir(uploadPath, { recursive: true });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResult>> {
  try {

    const headers = new Headers();
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const optionsString = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400, headers }
      );
    }

    const customOptions = optionsString ? JSON.parse(optionsString) : {};
    const opts: UploadOptions = { ...getDefaultUploadOptions(), ...customOptions };

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Empty file uploaded' },
        { status: 400, headers }
      );
    }

    if (file.size > opts.maxSize) {
      const maxMB = Math.round(opts.maxSize / 1024 / 1024 * 10) / 10;
      return NextResponse.json(
        { success: false, error: `File too large. Max: ${maxMB}MB` },
        { status: 400, headers }
      );
    }

    const sanitizedFilename = sanitizeFilename(file.name);
    if (!sanitizedFilename) {
      return NextResponse.json(
        { success: false, error: 'Invalid filename' },
        { status: 400, headers }
      );
    }

    const extensionResult = validateFileExtension(sanitizedFilename, opts.allowedTypes);
    if (!extensionResult.valid) {
      return NextResponse.json(
        { success: false, error: extensionResult.error },
        { status: 400, headers }
      );
    }

    const extension = path.extname(sanitizedFilename).toLowerCase().substring(1);

    const buffer = Buffer.from(await file.arrayBuffer());

    const signatureResult = await validateImageSignature(buffer, extension);
    if (!signatureResult.valid) {
      return NextResponse.json(
        { success: false, error: signatureResult.error },
        { status: 400, headers }
      );
    }

    const mimeResult = validateMimeType(file.type, opts.allowedTypes);
    if (!mimeResult.valid) {
      return NextResponse.json(
        { success: false, error: mimeResult.error },
        { status: 400, headers }
      );
    }

    if (opts.checkMalicious) {
      const maliciousResult = checkMaliciousContent(buffer);
      if (!maliciousResult.valid) {
        return NextResponse.json(
          { success: false, error: maliciousResult.error },
          { status: 400, headers }
        );
      }
    }

    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions');
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Not a valid image file' },
        { status: 400, headers }
      );
    }

    const sizeResult = validateImageSize(metadata.width, metadata.height, opts);
    if (!sizeResult.valid) {
      return NextResponse.json(
        { success: false, error: sizeResult.error },
        { status: 400, headers }
      );
    }

    let finalBuffer: Buffer;
    let finalFormat: string;
    let finalMetadata: any;

    try {
      let sharpInstance = sharp(buffer);

      const metadata = await sharpInstance.metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions');
      }

      let { width, height } = metadata;

      if (opts.cropSquare) {
        const size = Math.min(width, height);
        const left = Math.floor((width - size) / 2);
        const top = Math.floor((height - size) / 2);

        sharpInstance = sharpInstance.extract({
          left,
          top,
          width: size,
          height: size
        });

        width = height = size;
      }

      if (opts.outputSize > 0 && (width > opts.outputSize || height > opts.outputSize)) {
        const ratio = Math.min(opts.outputSize / width, opts.outputSize / height);
        const newWidth = Math.floor(width * ratio);
        const newHeight = Math.floor(height * ratio);

        sharpInstance = sharpInstance.resize(newWidth, newHeight, {
          kernel: sharp.kernel.lanczos3,
          withoutEnlargement: true
        });
      }

      finalFormat = opts.outputFormat === 'original' ? extension : opts.outputFormat;

      switch (finalFormat.toLowerCase()) {
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: opts.quality });
          break;
        case 'jpg':
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality: opts.quality });
          break;
        case 'png':
          const pngQuality = Math.floor(9 - (opts.quality / 100 * 9));
          sharpInstance = sharpInstance.png({
            compressionLevel: pngQuality,
            adaptiveFiltering: true
          });
          break;
        default:
          throw new Error(`Unsupported output format: ${finalFormat}`);
      }

      finalMetadata = await sharpInstance.metadata();

      finalBuffer = await sharpInstance.toBuffer();

    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to process image' },
        { status: 500, headers }
      );
    }

    const outputFilename = generateSecureFilename(opts.prefix, finalFormat);

    let uploadResult: UploadResult;
    let gcsResult: UploadResult | null = null;
    let localFilePath: string | null = null;

    try {
      localFilePath = path.join(opts.uploadPath, outputFilename);
      await ensureUploadDir(opts.uploadPath);
      await fs.writeFile(localFilePath, finalBuffer);
    } catch (localError) {
      localFilePath = null;
    }
    try {
      gcsResult = await gcsUploader.uploadImageForVertexAI(
        finalBuffer,
        sanitizedFilename,
        mimeResult.mimeType
      );

      if (gcsResult.success && gcsResult.path) {
        try {
          const signedUrl = await gcsUploader.getFileUrl(gcsResult.path);

          uploadResult = {
            success: true,
            filename: outputFilename,
            path: signedUrl,
            size: finalBuffer.length,
            dimensions: finalMetadata.width && finalMetadata.height
              ? { width: finalMetadata.width, height: finalMetadata.height }
              : undefined,
            type: mimeResult.mimeType,
            format: finalFormat,
            reprocessed: true,
            gcsUrl: gcsResult.path,
            useGcsPreview: true
          };

          if (localFilePath) {
            try {
              await fs.unlink(localFilePath);
            } catch (cleanupError) {
            }
          }
        } catch (urlError) {
          uploadResult = {
            success: true,
            filename: outputFilename,
            path: localFilePath ? `/uploads/${outputFilename}` : '',
            size: finalBuffer.length,
            dimensions: finalMetadata.width && finalMetadata.height
              ? { width: finalMetadata.width, height: finalMetadata.height }
              : undefined,
            type: mimeResult.mimeType,
            format: finalFormat,
            reprocessed: true,
            gcsUrl: gcsResult.path,
            useGcsPreview: false
          };
        }
      } else {
        throw new Error(gcsResult?.error || 'GCS upload failed');
      }
    } catch (gcsError) {
      if (localFilePath) {
        uploadResult = {
          success: true,
          filename: outputFilename,
          path: `/uploads/${outputFilename}`,
          size: finalBuffer.length,
          dimensions: finalMetadata.width && finalMetadata.height
            ? { width: finalMetadata.width, height: finalMetadata.height }
            : undefined,
          type: mimeResult.mimeType,
          format: finalFormat,
          reprocessed: true,
          gcsUrl: undefined,
          useGcsPreview: false
        };
      } else {
        throw new Error('Failed to upload to GCS and local storage also failed');
      }
    }

    if (!localFilePath && !gcsResult?.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save file for preview or cloud storage'
        },
        { status: 500, headers }
      );
    }

    return NextResponse.json(uploadResult, { headers });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload files.' },
    { status: 405 }
  );
}