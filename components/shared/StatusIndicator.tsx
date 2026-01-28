'use client';

import { cn } from '@/lib/utils';

type Status = 'idle' | 'running' | 'success' | 'error' | 'warning';

interface StatusIndicatorProps {
  status: Status;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const statusColors: Record<Status, string> = {
  idle: 'bg-muted-foreground',
  running: 'bg-blue-500',
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
};

export function StatusIndicator({
  status,
  pulse = false,
  size = 'md',
  className,
}: StatusIndicatorProps) {
  const shouldPulse = pulse || status === 'running';

  return (
    <span className={cn('relative inline-flex', className)}>
      <span
        className={cn(
          'rounded-full',
          sizeClasses[size],
          statusColors[status],
          shouldPulse && 'animate-pulse'
        )}
      />
      {shouldPulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            statusColors[status]
          )}
        />
      )}
    </span>
  );
}
