'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { IterationRecord } from '@/types';

interface LivePreviewProps {
  iteration: IterationRecord | null;
}

export function LivePreview({ iteration }: LivePreviewProps) {
  if (!iteration) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <svg
          className="h-16 w-16 text-muted-foreground/30 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <p className="text-muted-foreground">No preview available</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Start the workflow or select an iteration to preview
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <h3 className="font-medium">Iteration #{iteration.iteration}</h3>
          {iteration.passed ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              Pass
            </Badge>
          ) : (
            <Badge variant="destructive">Fail</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(iteration.outputFileUrl, '_blank')}
        >
          <svg
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download PPTX
        </Button>
      </div>

      {/* Thumbnails */}
      <div className="flex-1 py-4 min-h-0">
        {iteration.thumbnailUrls.length > 0 ? (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 gap-3">
              {iteration.thumbnailUrls.map((url, index) => (
                <Card
                  key={index}
                  className="overflow-hidden aspect-[16/9] bg-muted flex items-center justify-center"
                >
                  <img
                    src={url}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-contain"
                  />
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg
              className="h-12 w-12 text-muted-foreground/30 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-muted-foreground">
              Thumbnails not available
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Download the file to view the presentation
            </p>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      <div className="pt-4 border-t space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Checker Feedback</h4>
          <Badge variant="outline">
            Confidence: {(iteration.confidence * 100).toFixed(0)}%
          </Badge>
        </div>

        {iteration.feedback && (
          <p className="text-sm text-muted-foreground">{iteration.feedback}</p>
        )}

        {iteration.issues.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground">
              Issues Found ({iteration.issues.length})
            </h5>
            <ScrollArea className="h-[100px]">
              <ul className="space-y-1">
                {iteration.issues.map((issue, index) => (
                  <li
                    key={index}
                    className="text-sm flex items-start gap-2 text-muted-foreground"
                  >
                    <span className="text-destructive">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
