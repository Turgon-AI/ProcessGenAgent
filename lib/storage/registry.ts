// File registry for tracking uploaded files
// In production, use Redis or database for persistence

import { UploadedFile } from '@/types';

// In-memory file registry (per-instance, not persisted across restarts)
const fileRegistry = new Map<string, UploadedFile>();

/** Register an uploaded file */
export function registerFile(file: UploadedFile): void {
  fileRegistry.set(file.id, file);
}

/** Get a file by ID */
export function getFile(fileId: string): UploadedFile | null {
  return fileRegistry.get(fileId) || null;
}

/** Get multiple files by IDs */
export function getFiles(fileIds: string[]): UploadedFile[] {
  return fileIds
    .map((id) => fileRegistry.get(id))
    .filter((file): file is UploadedFile => file !== null);
}

/** Remove a file from registry */
export function unregisterFile(fileId: string): boolean {
  return fileRegistry.delete(fileId);
}

/** Clear all files for a run */
export function clearRunFiles(runId: string): void {
  for (const [id, file] of fileRegistry.entries()) {
    if (file.url.includes(`runs/${runId}/`)) {
      fileRegistry.delete(id);
    }
  }
}

/** Get all registered files */
export function getAllFiles(): UploadedFile[] {
  return Array.from(fileRegistry.values());
}
