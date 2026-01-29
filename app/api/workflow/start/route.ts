import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowStartRequest, WorkflowStartResponse } from '@/types';
import { setWorkflow } from '@/lib/storage/workflow-store';

export async function POST(request: NextRequest) {
  try {
    const body: WorkflowStartRequest = await request.json();

    // Validate required fields
    if (!body.fileIds || body.fileIds.length === 0) {
      return NextResponse.json(
        { error: 'No input files provided' },
        { status: 400 }
      );
    }

    if (!body.makerPrompt?.trim()) {
      return NextResponse.json(
        { error: 'Maker prompt is required' },
        { status: 400 }
      );
    }

    if (!body.checkerPrompt?.trim()) {
      return NextResponse.json(
        { error: 'Checker prompt is required' },
        { status: 400 }
      );
    }

    // Generate a unique run ID
    const runId = uuidv4();

    // Store the workflow request (uses Redis on Vercel, in-memory locally)
    await setWorkflow(runId, {
      request: body,
      status: 'running',
      shouldStop: false,
    });

    const response: WorkflowStartResponse = {
      runId,
      status: 'started',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Workflow start error:', error);
    return NextResponse.json(
      { error: 'Failed to start workflow' },
      { status: 500 }
    );
  }
}
