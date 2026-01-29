// File registry - uses Redis on Vercel, in-memory locally
import { UploadedFile } from '@/types';

// In-memory fallback
const memoryStore = new Map<string, UploadedFile>();

// Redis client (lazy initialized)
let redisClient: import('@upstash/redis').Redis | null = null;

function getRedisClient() {
  if (redisClient) return redisClient;
  
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    try {
      const { Redis } = require('@upstash/redis');
      redisClient = new Redis({ url, token });
      return redisClient;
    } catch (error) {
      console.error('[FileRegistry] Failed to initialize Redis:', error);
      return null;
    }
  }
  return null;
}

function getFileKey(fileId: string): string {
  return `file:${fileId}`;
}

// TTL: 24 hours
const FILE_TTL_SECONDS = 86400;

/** Register an uploaded file */
export async function registerFile(file: UploadedFile): Promise<void> {
  if (!file || !file.id) {
    console.warn('[Registry] Attempted to register file without id:', file);
    return;
  }

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(getFileKey(file.id), JSON.stringify(file), {
        ex: FILE_TTL_SECONDS,
      });
    } catch (error) {
      console.error(`[Registry] Redis error saving file ${file.id}:`, error);
      memoryStore.set(file.id, file);
    }
  } else {
    memoryStore.set(file.id, file);
  }
}

/** Get a file by ID */
export async function getFile(fileId: string): Promise<UploadedFile | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const data = await redis.get<string>(getFileKey(fileId));
      if (!data) return null;
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      console.error(`[Registry] Redis error fetching file ${fileId}:`, error);
      return null;
    }
  }
  return memoryStore.get(fileId) || null;
}

/** Get multiple files by IDs */
export async function getFiles(fileIds: string[]): Promise<UploadedFile[]> {
  if (!fileIds || fileIds.length === 0) return [];

  const redis = getRedisClient();
  if (redis) {
    try {
      // Use pipeline for efficiency if possible, or parallel fetches
      const keys = fileIds.map(getFileKey);
      // Upstash mget returns (string | null)[]
      const results = await redis.mget<string[]>(...keys);
      
      return results
        .filter(data => data !== null)
        .map(data => (typeof data === 'string' ? JSON.parse(data) : data) as UploadedFile);
    } catch (error) {
      console.error('[Registry] Redis mget error:', error);
      // Fallback to sequential fetch
      const files: UploadedFile[] = [];
      for (const id of fileIds) {
        const file = await getFile(id);
        if (file) files.push(file);
      }
      return files;
    }
  }

  return fileIds
    .map((id) => memoryStore.get(id))
    .filter((file): file is UploadedFile => file !== undefined);
}

/** Remove a file from registry */
export async function unregisterFile(fileId: string): Promise<boolean> {
  const redis = getRedisClient();
  if (redis) {
    await redis.del(getFileKey(fileId));
    return true;
  }
  return memoryStore.delete(fileId);
}

/** Clear all files for a run (Best effort for Redis) */
export async function clearRunFiles(runId: string): Promise<void> {
  // Clearing by runId is hard in key-value store without indexing
  // We rely on TTL for cleanup in Redis
  // For memory store we can scan
  for (const [id, file] of memoryStore.entries()) {
    if (file.url.includes(`runs/${runId}/`)) {
      memoryStore.delete(id);
    }
  }
}

/** Get all registered files (Memory only - impractical for Redis) */
export async function getAllFiles(): Promise<UploadedFile[]> {
  // Only returns memory files
  return Array.from(memoryStore.values());
}
