'use client';

import { FileUploader } from '@/components/FileUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadedFile } from '@/types';

interface FileUploadState {
  files: UploadedFile[];
  isUploading: boolean;
  error: string | null;
  uploadFiles: (files: File[] | FileList) => Promise<void>;
  removeFile: (fileId: string) => void;
}

interface FilesSectionProps {
  inputFileUpload: FileUploadState;
  sampleFileUpload: FileUploadState;
  guidelines: string;
  onGuidelinesChange: (guidelines: string) => void;
  disabled: boolean;
}

const INPUT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
};

const SAMPLE_ACCEPT = {
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/pdf': ['.pdf'],
};

export function FilesSection({
  inputFileUpload,
  sampleFileUpload,
  guidelines,
  onGuidelinesChange,
  disabled,
}: FilesSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Input Files</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploader
            files={inputFileUpload.files}
            onFilesAdded={inputFileUpload.uploadFiles}
            onFileRemoved={inputFileUpload.removeFile}
            isUploading={inputFileUpload.isUploading}
            error={inputFileUpload.error}
            disabled={disabled}
            title=""
            description="Upload documents to be used as source material"
            accept={INPUT_ACCEPT}
            maxFiles={10}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Guidelines & Samples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Written Guidelines</label>
            <textarea
              value={guidelines}
              onChange={(e) => onGuidelinesChange(e.target.value)}
              placeholder="Enter additional guidelines for the checker to follow..."
              disabled={disabled}
              className="mt-2 w-full min-h-[100px] p-3 rounded-md border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <FileUploader
            files={sampleFileUpload.files}
            onFilesAdded={sampleFileUpload.uploadFiles}
            onFileRemoved={sampleFileUpload.removeFile}
            isUploading={sampleFileUpload.isUploading}
            error={sampleFileUpload.error}
            disabled={disabled}
            title="Reference Samples"
            description="Upload example presentations for the checker to reference"
            accept={SAMPLE_ACCEPT}
            maxFiles={5}
          />
        </CardContent>
      </Card>
    </div>
  );
}
