"use client";

import React, { useCallback, useState, useRef } from 'react';
import { Upload, X, FileImage, AlertCircle, CheckCircle } from 'lucide-react';
import { UploadResult, UploadOptions } from '@/types/upload';

interface FileUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  options?: Partial<UploadOptions>;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  accept?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  result: UploadResult | null;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  options = {},
  className = '',
  disabled = false,
  multiple = false,
  accept = 'image/*'
}: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    result: null
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);  
  const resetState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      result: null
    });
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (!file) return;

    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      error: null,
      result: null
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (Object.keys(options).length > 0) {
        formData.append('options', JSON.stringify(options));
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResult = await response.json();

      if (result.success) {
        setUploadState(prev => ({
          ...prev,
          isUploading: false,
          progress: 100,
          result
        }));
        onUploadComplete?.(result);
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: errorMessage
      }));
      onUploadError?.(errorMessage);
    }
  }, [options, onUploadComplete, onUploadError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadFile(file);
    }
  }, [uploadFile]);

  const openFileSelector = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const clearUpload = useCallback(() => {
    resetState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [resetState]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept={accept}
        multiple={multiple}
        disabled={disabled || uploadState.isUploading}
        className="hidden"
      />

      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploadState.error ? 'border-red-300 bg-red-50' : ''}
          ${uploadState.result ? 'border-green-300 bg-green-50' : ''}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        {uploadState.isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin mx-auto w-8 h-8">
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-600">Uploading...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          </div>
        ) : uploadState.error ? (
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <p className="text-sm font-medium text-red-600">Upload Failed</p>
              <p className="text-xs text-red-500 mt-1">{uploadState.error}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearUpload();
              }}
              className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </button>
          </div>
        ) : uploadState.result ? (
          <div className="space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="text-sm font-medium text-green-600">Upload Successful</p>
              <p className="text-xs text-gray-500 mt-1">
                {uploadState.result.filename}
                {uploadState.result.dimensions && (
                  <span className="ml-2">
                    {uploadState.result.dimensions.width} × {uploadState.result.dimensions.height}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearUpload();
              }}
              className="inline-flex items-center px-3 py-1 text-sm text-green-600 hover:text-green-700"
            >
              Upload Another
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <FileImage className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-600">
                Drop images here or click to upload
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports: JPG, PNG, WebP (max 25MB, 8K resolution)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}