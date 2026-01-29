import { NextRequest } from 'next/server';
import { activeWorkflows } from '../../start/route';
import { SSEEvent, WorkflowStartRequest } from '@/types';
import { executeWorkflow, getWorkflowConfig } from '@/lib/langgraph';
import { runMockWorkflow } from '@/lib/langgraph/mock';
import { getFiles } from '@/lib/storage/registry';
import { SSE_HEARTBEAT_INTERVAL_MS } from '@/lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Maximize function timeout (Pro: 300s, Enterprise: up to 900s)
export const maxDuration = 800;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  const workflow = activeWorkflows.get(runId);
  if (!workflow) {
    return notFoundResponse();
  }

  return createSSEResponse(runId, workflow);
}

/** Create SSE stream response */
function createSSEResponse(
  runId: string,
  workflow: { request: WorkflowStartRequest; status: string; shouldStop: boolean }
) {
  const encoder = new TextEncoder();
  let heartbeatInterval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: SSEEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const sendHeartbeat = () => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      };

      const shouldStop = () => activeWorkflows.get(runId)?.shouldStop ?? false;

      // Start heartbeat to keep connection alive
      heartbeatInterval = setInterval(sendHeartbeat, SSE_HEARTBEAT_INTERVAL_MS);

      try {
        await runWorkflow(runId, workflow.request, sendEvent, shouldStop);
        updateWorkflowStatus(runId, workflow, 'completed');
      } catch (error) {
        handleWorkflowError(error, sendEvent);
        updateWorkflowStatus(runId, workflow, 'failed');
      } finally {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/** Run the appropriate workflow (real or mock) */
async function runWorkflow(
  runId: string,
  request: WorkflowStartRequest,
  sendEvent: (event: SSEEvent) => void,
  shouldStop: () => boolean
): Promise<void> {
  const useMock = process.env.USE_MOCK_WORKFLOW === 'true';
  const hasConfig = process.env.MANUS_API_KEY && process.env.ANTHROPIC_API_KEY;

  if (hasConfig && !useMock) {
    await runRealWorkflow(runId, request, sendEvent, shouldStop);
  } else {
    await runMockWorkflow(runId, request, sendEvent, shouldStop);
  }
}

/** Run the real LangGraph workflow */
async function runRealWorkflow(
  runId: string,
  request: WorkflowStartRequest,
  sendEvent: (event: SSEEvent) => void,
  shouldStop: () => boolean
): Promise<void> {
  const config = getWorkflowConfig();

  // Resolve file IDs to actual file objects from registry
  const inputFiles = getFiles(request.fileIds);
  const sampleFiles = getFiles(request.sampleFileIds);

  if (inputFiles.length === 0) {
    throw new Error('No input files found. Files may have expired.');
  }

  await executeWorkflow(
    config,
    {
      runId,
      inputFiles,
      makerPrompt: request.makerPrompt,
      checkerPrompt: request.checkerPrompt,
      guidelines: request.guidelines,
      sampleFiles,
      maxIterations: request.config.maxIterations,
      confidenceThreshold: request.config.confidenceThreshold,
      autoStopOnPass: request.config.autoStopOnPass,
    },
    sendEvent,
    shouldStop
  );
}

/** Handle workflow execution error */
function handleWorkflowError(error: unknown, sendEvent: (event: SSEEvent) => void): void {
  console.error('Workflow execution error:', error);
  sendEvent({
    type: 'error',
    message: error instanceof Error ? error.message : 'Unknown error',
    iteration: 0,
  });
}

/** Update workflow status in registry */
function updateWorkflowStatus(
  runId: string,
  workflow: { request: WorkflowStartRequest; status: string; shouldStop: boolean },
  status: 'running' | 'stopped' | 'completed' | 'failed'
): void {
  activeWorkflows.set(runId, { ...workflow, status });
}

/** Return 404 response */
function notFoundResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Workflow not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}
