'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UploadedFile } from '@/types';

interface FileUploaderProps {
  files: UploadedFile[];
  onFilesAdded: (files: FileList | File[]) => Promise<void>;
  onFileRemoved: (fileId: string) => void;
  isUploading: boolean;
  error: string | null;
  disabled?: boolean;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  title: string;
  description?: string;
}

export function FileUploader({
  files,
  onFilesAdded,
  onFileRemoved,
  isUploading,
  error,
  disabled = false,
  accept,
  maxFiles = 10,
  title,
  description,
}: FileUploaderProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        await onFilesAdded(acceptedFiles);
      }
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || isUploading,
    accept,
    maxFiles: maxFiles - files.length,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        {files.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {files.length} / {maxFiles} files
          </span>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <Card
        {...getRootProps()}
        className={`
          border-2 border-dashed p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : isDragActive ? (
          <p className="text-sm text-primary">Drop files here...</p>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="h-8 w-8 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or click to select
            </p>
          </div>
        )}
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {files.length > 0 && (
        <ScrollArea className="h-[120px]">
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg
                    className="h-4 w-4 text-muted-foreground flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onFileRemoved(file.id)}
                  disabled={disabled}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
