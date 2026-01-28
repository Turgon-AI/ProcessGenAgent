import { put, del, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const FILE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// File Upload
// ============================================================================

export async function uploadFile(
  file: File | Buffer,
  runId: string,
  category: 'inputs' | 'samples' | 'iterations',
  filename: string,
  iteration?: number
): Promise<UploadedFile> {
  const fileId = uuidv4();
  const path =
    category === 'iterations' && iteration !== undefined
      ? `runs/${runId}/${category}/iteration_${iteration}/${filename}`
      : `runs/${runId}/${category}/${filename}`;

  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: false,
  });

  return {
    id: fileId,
    name: filename,
    size: file instanceof File ? file.size : file.length,
    type: file instanceof File ? file.type : 'application/octet-stream',
    url: blob.url,
    uploadedAt: new Date(),
  };
}

// ============================================================================
// Upload Input File
// ============================================================================

export async function uploadInputFile(
  file: File,
  runId: string
): Promise<UploadedFile> {
  return uploadFile(file, runId, 'inputs', file.name);
}

// ============================================================================
// Upload Sample File
// ============================================================================

export async function uploadSampleFile(
  file: File,
  runId: string
): Promise<UploadedFile> {
  return uploadFile(file, runId, 'samples', file.name);
}

// ============================================================================
// Upload Iteration Output
// ============================================================================

export async function uploadIterationOutput(
  buffer: Buffer,
  runId: string,
  iteration: number,
  filename: string = 'output.pptx'
): Promise<UploadedFile> {
  return uploadFile(buffer, runId, 'iterations', filename, iteration);
}

// ============================================================================
// Upload Thumbnail
// ============================================================================

export async function uploadThumbnail(
  buffer: Buffer,
  runId: string,
  iteration: number,
  slideNumber: number
): Promise<string> {
  const filename = `slide_${slideNumber}.png`;
  const path = `runs/${runId}/iterations/iteration_${iteration}/thumbnails/${filename}`;

  const blob = await put(path, buffer, {
    access: 'public',
    addRandomSuffix: false,
  });

  return blob.url;
}

// ============================================================================
// Delete File
// ============================================================================

export async function deleteFile(url: string): Promise<void> {
  await del(url);
}

// ============================================================================
// Cleanup Run
// ============================================================================

export async function cleanupRun(runId: string): Promise<void> {
  const prefix = `runs/${runId}/`;

  // List all blobs with the run prefix
  const { blobs } = await list({ prefix });

  // Delete all blobs
  const deletePromises = blobs.map((blob) => del(blob.url));
  await Promise.all(deletePromises);
}

// ============================================================================
// Get File URL
// ============================================================================

export function getFileUrl(runId: string, path: string): string {
  // This would construct the URL based on your blob storage configuration
  return `${process.env.BLOB_BASE_URL || ''}/runs/${runId}/${path}`;
}

// ============================================================================
// Download File Helper
// ============================================================================

export async function downloadFileAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
