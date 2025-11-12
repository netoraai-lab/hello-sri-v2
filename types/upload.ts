export interface UploadOptions {
  uploadPath: string;
  allowedTypes: string[];
  maxSize: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  exactWidth?: number;
  exactHeight?: number;
  outputSize: number;
  cropSquare: boolean;
  quality: number;
  checkMalicious: boolean;
  prefix: string;
  outputFormat: string;
  forceReprocess: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
}

export interface UploadResult {
  success: boolean;
  error?: string;
  filename?: string;
  path?: string;
  size?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  type?: string;
  format?: string;
  reprocessed?: boolean;
  gcsUrl?: string;
  useGcsPreview?: boolean;
}

export interface FileUploadRequest {
  file: File;
  options?: Partial<UploadOptions>;
}