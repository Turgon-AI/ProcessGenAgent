'use client';

import { StatusIndicator } from '@/components/shared';
import { WorkflowStatus } from '@/types';

interface PageHeaderProps {
  status: WorkflowStatus;
  success: boolean;
}

export function PageHeader({ status, success }: PageHeaderProps) {
  const getStatusIndicator = () => {
    if (status === 'running') return 'running';
    if (status === 'completed' && success) return 'success';
    if (status === 'failed') return 'error';
    return 'warning';
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Maker-Checker Agent</h1>
            {status !== 'idle' && <StatusIndicator status={getStatusIndicator()} />}
          </div>
          <div className="text-sm text-muted-foreground">
            AI-Powered Document Generation
          </div>
        </div>
      </div>
    </header>
  );
}
