import { NextRequest, NextResponse } from 'next/server';
import { activeWorkflows } from '../../start/route';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const workflow = activeWorkflows.get(runId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Signal the workflow to stop
    activeWorkflows.set(runId, {
      ...workflow,
      shouldStop: true,
      status: 'stopped',
    });

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
