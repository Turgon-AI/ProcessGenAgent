'use client';

import { IterationHistory } from '@/components/IterationHistory';
import { LivePreview } from '@/components/LivePreview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IterationRecord } from '@/types';

interface WorkflowSectionProps {
  iterationHistory: IterationRecord[];
  selectedIteration: number | null;
  onSelectIteration: (iteration: number) => void;
}

export function WorkflowSection({
  iterationHistory,
  selectedIteration,
  onSelectIteration,
}: WorkflowSectionProps) {
  const selectedIterationRecord =
    selectedIteration !== null
      ? iterationHistory.find((r) => r.iteration === selectedIteration)
      : iterationHistory.length > 0
        ? iterationHistory[iterationHistory.length - 1]
        : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Iteration History</CardTitle>
        </CardHeader>
        <CardContent>
          <IterationHistory
            iterations={iterationHistory}
            selectedIteration={selectedIteration}
            onSelectIteration={onSelectIteration}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Live Preview
            {selectedIterationRecord && ` - Iteration #${selectedIterationRecord.iteration}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[400px]">
          <LivePreview iteration={selectedIterationRecord || null} />
        </CardContent>
      </Card>
    </div>
  );
}
