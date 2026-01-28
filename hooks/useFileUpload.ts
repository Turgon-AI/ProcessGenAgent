'use client';

import { useState, useCallback } from 'react';
import { UploadedFile } from '@/types';
import { useWorkflowStore } from '@/store/workflowStore';

interface UseFileUploadOptions {
  type: 'input' | 'sample';
  maxFiles?: number;
  maxSizeBytes?: number;
  acceptedTypes?: string[];
}

interface UseFileUploadReturn {
  isUploading: boolean;
  error: string | null;
  uploadFiles: (files: FileList | File[]) => Promise<void>;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  files: UploadedFile[];
}

export function useFileUpload({
  type,
  maxFiles = 10,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB default
  acceptedTypes,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    inputFiles,
    sampleFiles,
    addInputFile,
    addSampleFile,
    removeInputFile,
    removeSampleFile,
    clearInputFiles,
    clearSampleFiles,
  } = useWorkflowStore();

  const files = type === 'input' ? inputFiles : sampleFiles;
  const addFile = type === 'input' ? addInputFile : addSampleFile;
  const removeFile = type === 'input' ? removeInputFile : removeSampleFile;
  const clearFiles = type === 'input' ? clearInputFiles : clearSampleFiles;

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setIsUploading(true);
      setError(null);

      const filesToUpload = Array.from(fileList);

      // Check max files limit
      if (files.length + filesToUpload.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        setIsUploading(false);
        return;
      }

      try {
        for (const file of filesToUpload) {
          // Validate file size
          if (file.size > maxSizeBytes) {
            setError(`File ${file.name} exceeds maximum size of ${maxSizeBytes / 1024 / 1024}MB`);
            continue;
          }

          // Validate file type
          if (acceptedTypes && !acceptedTypes.some((t) => file.type.includes(t) || file.name.endsWith(t))) {
            setError(`File type not accepted: ${file.type}`);
            continue;
          }

          // Upload to server
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', type);

          const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Upload failed');
          }

          const uploadedFile: UploadedFile = await response.json();
          addFile(uploadedFile);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [files.length, maxFiles, maxSizeBytes, acceptedTypes, type, addFile]
  );

  return {
    isUploading,
    error,
    uploadFiles,
    removeFile,
    clearFiles,
    files,
  };
}
