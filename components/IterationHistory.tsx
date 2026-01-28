'use client';

import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DownloadIcon, EyeIcon, ChevronDownIcon } from '@/components/shared';
import { IterationRecord } from '@/types';

interface IterationHistoryProps {
  iterations: IterationRecord[];
  selectedIteration: number | null;
  onSelectIteration: (iteration: number) => void;
}

export function IterationHistory({
  iterations,
  selectedIteration,
  onSelectIteration,
}: IterationHistoryProps) {
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(new Set());

  const toggleExpanded = (iteration: number) => {
    setExpandedIterations((prev) => {
      const next = new Set(prev);
      next.has(iteration) ? next.delete(iteration) : next.add(iteration);
      return next;
    });
  };

  if (iterations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No iterations yet</p>
        <p className="text-xs mt-1">Start the workflow to see progress here</p>
      </div>
    );
  }

  const sortedIterations = [...iterations].sort((a, b) => b.iteration - a.iteration);

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-2">
        {sortedIterations.map((record) => (
          <IterationItem
            key={record.iteration}
            record={record}
            isSelected={selectedIteration === record.iteration}
            isExpanded={expandedIterations.has(record.iteration)}
            onToggleExpand={() => toggleExpanded(record.iteration)}
            onSelect={() => onSelectIteration(record.iteration)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface IterationItemProps {
  record: IterationRecord;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
}

function IterationItem({ record, isSelected, isExpanded, onToggleExpand, onSelect }: IterationItemProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className={`border rounded-lg transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-medium">#{record.iteration}</span>
            <Badge variant={record.passed ? 'secondary' : 'destructive'} className={record.passed ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : ''}>
              {record.passed ? 'Pass' : 'Fail'}
            </Badge>
            <span className="text-sm text-muted-foreground">{(record.confidence * 100).toFixed(0)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); window.open(record.outputFileUrl, '_blank'); }} title="Download">
              <DownloadIcon />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); onSelect(); }} title="Preview">
              <EyeIcon />
            </Button>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <ChevronDownIcon className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <IterationDetails record={record} />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function IterationDetails({ record }: { record: IterationRecord }) {
  return (
    <div className="px-3 pb-3 pt-0 border-t">
      <div className="mt-3 space-y-3">
        {record.feedback && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Feedback</h4>
            <p className="text-sm">{record.feedback}</p>
          </div>
        )}
        {record.issues.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Issues ({record.issues.length})</h4>
            <ul className="text-sm space-y-1">
              {record.issues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Generated: {new Date(record.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
