import { Storage } from '@google-cloud/storage';
import { GoogleAuth } from 'google-auth-library';
import { UploadResult } from '@/types/upload';

export interface GCSUploadOptions {
  bucketName: string;
  destination: string;
  contentType: string;
  metadata?: Record<string, string>;
}

export class GCSUploader {
  private storage: Storage | null;
  private bucketName: string;

  constructor() {
    const projectId = process.env.GAPI_PROJECT_ID;
    const clientEmail = process.env.GAPI_CLIENT_EMAIL;
    const privateKey = process.env.GAPI_PRIVATE_KEY;


    if (!projectId || !clientEmail || !privateKey) {
      this.storage = null;
      this.bucketName = '';
      return;
    }

    try {
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');


      this.storage = new Storage({
        projectId: projectId,
        credentials: {
          client_email: clientEmail,
          private_key: formattedPrivateKey,
          project_id: projectId,
        },
        retryOptions: {
          autoRetry: true,
          maxRetries: 3,
        },
      });

      this.bucketName = process.env.GCS_BUCKET_NAME || 'sri-travel-attachments';
    } catch (error) {
      this.storage = null;
      this.bucketName = '';
    }
  }

  async uploadFile(
    buffer: Buffer,
    options: GCSUploadOptions
  ): Promise<UploadResult> {
    if (!this.storage) {
      return {
        success: false,
        error: 'GCS Storage client not initialized',
      };
    }

    try {
      const bucket = this.storage.bucket(options.bucketName || this.bucketName);
      const file = bucket.file(options.destination);

      const stream = file.createWriteStream({
        metadata: {
          contentType: options.contentType,
          metadata: options.metadata || {},
        },
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          reject(error);
        });

        stream.on('finish', async () => {
          try {
            const [metadata] = await file.getMetadata();

            const result: UploadResult = {
              success: true,
              filename: options.destination,
              path: `gs://${options.bucketName || this.bucketName}/${options.destination}`,
              size: metadata.size,
              type: options.contentType,
            };

            resolve(result);
          } catch (error) {
            reject(error);
          }
        });

        stream.end(buffer);
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload to GCS',
      };
    }
  }

  async uploadImageForVertexAI(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    if (!this.storage || !this.bucketName) {
      return {
        success: false,
        error: 'GCS not properly configured',
      };
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = mimeType.split('/')[1] || 'jpg';
    const destination = `chat-images/${timestamp}-${randomString}.${extension}`;

    const options: GCSUploadOptions = {
      bucketName: this.bucketName,
      destination,
      contentType: mimeType,
      metadata: {
        purpose: 'vertex-ai-chat',
        uploadedAt: new Date().toISOString(),
        originalFilename: filename,
      },
    };

    return this.uploadFile(buffer, options);
  }

  async deleteFile(gcsPath: string): Promise<boolean> {
    if (!this.storage) {
      return false;
    }

    try {
      const match = gcsPath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
      if (!match) {
        throw new Error('Invalid GCS path format');
      }

      const [, bucketName, filePath] = match;
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);

      await file.delete();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileUrl(gcsPath: string): Promise<string> {
    if (!this.storage) {
      throw new Error('GCS Storage client not initialized');
    }

    try {
      const match = gcsPath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
      if (!match) {
        throw new Error('Invalid GCS path format');
      }

      const [, bucketName, filePath] = match;
      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(filePath);

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60,
      });

      return url;
    } catch (error) {
      throw error;
    }
  }
}

export const gcsUploader = new GCSUploader();

export default gcsUploader;