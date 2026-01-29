// Workflow store - uses Redis on Vercel, in-memory locally
import { WorkflowStartRequest } from '@/types';

export interface StoredWorkflow {
  request: WorkflowStartRequest;
  status: 'running' | 'stopped' | 'completed' | 'failed';
  shouldStop: boolean;
}

// In-memory fallback for local development
const memoryStore = new Map<string, StoredWorkflow>();

// Redis client (lazy initialized)
let redisClient: import('@upstash/redis').Redis | null = null;

function getRedisClient() {
  if (redisClient) return redisClient;
  
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    const { Redis } = require('@upstash/redis');
    redisClient = new Redis({ url, token });
    console.log('[WorkflowStore] Using Upstash Redis');
    return redisClient;
  }
  
  return null;
}

function getWorkflowKey(runId: string): string {
  return `workflow:${runId}`;
}

// TTL for workflow entries (2 hours)
const WORKFLOW_TTL_SECONDS = 7200;

export async function setWorkflow(runId: string, workflow: StoredWorkflow): Promise<void> {
  const redis = getRedisClient();
  
  if (redis) {
    await redis.set(getWorkflowKey(runId), JSON.stringify(workflow), {
      ex: WORKFLOW_TTL_SECONDS,
    });
  } else {
    memoryStore.set(runId, workflow);
  }
}

export async function getWorkflow(runId: string): Promise<StoredWorkflow | null> {
  const redis = getRedisClient();
  
  if (redis) {
    const data = await redis.get<string>(getWorkflowKey(runId));
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
  } else {
    return memoryStore.get(runId) || null;
  }
}

export async function updateWorkflowStatus(
  runId: string,
  status: StoredWorkflow['status']
): Promise<void> {
  const workflow = await getWorkflow(runId);
  if (workflow) {
    workflow.status = status;
    await setWorkflow(runId, workflow);
  }
}

export async function setWorkflowShouldStop(runId: string, shouldStop: boolean): Promise<void> {
  const workflow = await getWorkflow(runId);
  if (workflow) {
    workflow.shouldStop = shouldStop;
    await setWorkflow(runId, workflow);
  }
}

export async function deleteWorkflow(runId: string): Promise<void> {
  const redis = getRedisClient();
  
  if (redis) {
    await redis.del(getWorkflowKey(runId));
  } else {
    memoryStore.delete(runId);
  }
}

