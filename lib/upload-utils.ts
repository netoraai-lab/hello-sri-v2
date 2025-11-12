import { ValidationResult, UploadOptions } from '@/types/upload';
import sharp from 'sharp';
import { createHash, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
};

const DANGEROUS_EXTENSIONS = [
  'php', 'php3', 'php4', 'php5', 'pht', 'phtml', 'shtml', 'asp', 'aspx',
  'jsp', 'jspx', 'cfm', 'cfc', 'pl', 'bat', 'exe', 'com', 'scr', 'msi',
  'htaccess', 'htpasswd', 'ini', 'cfg', 'conf', 'config', 'sql', 'sh',
  'bash', 'cmd', 'vbs', 'ps1'
];

export function validateImageSize(
  width: number,
  height: number,
  opts: UploadOptions
): ValidationResult {
  if (width < opts.minWidth || height < opts.minHeight) {
    return {
      valid: false,
      error: `Image too small. Minimum: ${opts.minWidth}x${opts.minHeight}px`
    };
  }

  if (width > opts.maxWidth || height > opts.maxHeight) {
    return {
      valid: false,
      error: `Image too large. Maximum: ${opts.maxWidth}x${opts.maxHeight}px`
    };
  }

  if (opts.exactWidth !== undefined && width !== opts.exactWidth) {
    return {
      valid: false,
      error: `Image width must be exactly ${opts.exactWidth}px`
    };
  }

  if (opts.exactHeight !== undefined && height !== opts.exactHeight) {
    return {
      valid: false,
      error: `Image height must be exactly ${opts.exactHeight}px`
    };
  }

  return { valid: true };
}

export async function validateImageSignature(
  buffer: Buffer,
  extension: string
): Promise<ValidationResult> {
  const signatures: Record<string, Buffer[]> = {
    jpg: [Buffer.from([0xFF, 0xD8, 0xFF])],
    jpeg: [Buffer.from([0xFF, 0xD8, 0xFF])],
    png: [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
    webp: [Buffer.from([0x52, 0x49, 0x46, 0x46])]
  };

  const expectedSignatures = signatures[extension.toLowerCase()];
  if (!expectedSignatures) {
    return { valid: false, error: 'Unsupported file type' };
  }

  const header = buffer.slice(0, 32);
  const isValid = expectedSignatures.some(signature =>
    header.indexOf(signature) === 0
  );

  if (!isValid) {
    return { valid: false, error: 'File signature invalid' };
  }

  return { valid: true };
}

export function validateMimeType(
  mimeType: string,
  allowedTypes: string[]
): ValidationResult {
  const validMimes = allowedTypes
    .map(type => ALLOWED_MIME_TYPES[type])
    .filter(Boolean);

  if (!validMimes.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid image type: ${mimeType}`
    };
  }

  return { valid: true, mimeType };
}

export function checkMaliciousContent(buffer: Buffer): ValidationResult {
  const content = buffer.toString('utf8', 0, Math.min(8192, buffer.length));

  const patterns = [
    /<\?php/i, /<\?=/i, /<script/i, /<html/i, /<body/i, /<iframe/i,
    /javascript:/i, /vbscript:/i, /data:/i, /eval\s*\(/i, /base64_decode\s*\(/i,
    /shell_exec\s*\(/i, /system\s*\(/i, /exec\s*\(/i, /passthru\s*\(/i,
    /proc_open\s*\(/i, /popen\s*\(/i, /curl_exec\s*\(/i, /file_get_contents\s*\(/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return { valid: false, error: 'Malicious content detected' };
    }
  }

  return { valid: true };
}

export function generateSecureFilename(prefix: string, extension: string): string {
  const maxPrefixLength = 184;
  const sanitizedPrefix = prefix.length > maxPrefixLength
    ? prefix.substring(0, maxPrefixLength)
    : prefix;

  const timestamp = Date.now();
  const randomHex = randomBytes(16).toString('hex');

  return `${sanitizedPrefix}${timestamp}_${randomHex}.${extension}`;
}

export function sanitizeFilename(filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const withoutLeadingDots = sanitized.replace(/^\.+/, '');
  return withoutLeadingDots.substring(0, 255);
}

export function validateFileExtension(filename: string, allowedTypes: string[]): ValidationResult {
  const extension = path.extname(filename).toLowerCase().substring(1);

  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return { valid: false, error: 'Dangerous file extension detected' };
  }

  if (!allowedTypes.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
}

export async function processAndSaveImage(
  inputBuffer: Buffer,
  outputPath: string,
  outputFormat: string,
  quality: number,
  opts: UploadOptions
): Promise<boolean> {
  try {
    let sharpInstance = sharp(inputBuffer);

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

    switch (outputFormat.toLowerCase()) {
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'jpg':
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'png':
        const pngQuality = Math.floor(9 - (quality / 100 * 9));
        sharpInstance = sharpInstance.png({
          compressionLevel: pngQuality,
          adaptiveFiltering: true
        });
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    await sharpInstance.toFile(outputPath);
    return true;

  } catch (error) {
    return false;
  }
}

export function getDefaultUploadOptions(): UploadOptions {
  return {
    uploadPath: process.env.UPLOAD_PATH || path.join(process.cwd(), 'public', 'uploads'),
    allowedTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maxSize: 25 * 1024 * 1024,
    minWidth: 100,
    minHeight: 100,
    maxWidth: 7680,
    maxHeight: 4320,
    outputSize: 500,
    cropSquare: false,
    quality: 85,
    checkMalicious: true,
    prefix: 'upload_',
    outputFormat: 'webp',
    forceReprocess: true
  };
}