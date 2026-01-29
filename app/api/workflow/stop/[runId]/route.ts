import { NextRequest, NextResponse } from 'next/server';
import { getWorkflow, setWorkflowShouldStop, updateWorkflowStatus } from '@/lib/storage/workflow-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const workflow = await getWorkflow(runId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Signal the workflow to stop
    await setWorkflowShouldStop(runId, true);
    await updateWorkflowStatus(runId, 'stopped');

    return NextResponse.json({
      runId,
      status: 'stopped',
    });
  } catch (error) {
    console.error('Workflow stop error:', error);
    return NextResponse.json(
      { error: 'Failed to stop workflow' },
      { status: 500 }
    );
  }
}
