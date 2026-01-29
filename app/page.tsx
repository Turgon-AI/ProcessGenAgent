'use client';

import { useWorkflowStore } from '@/store/workflowStore';
import { useWorkflow } from '@/hooks/useWorkflow';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useToastNotifications } from '@/hooks/useToastNotifications';

import { ConfigPanel } from '@/components/ConfigPanel';
import { RunControls } from '@/components/RunControls';
import { ProgressDisplay } from '@/components/ProgressDisplay';
import { OutputPanel } from '@/components/OutputPanel';
import {
  PageHeader,
  PromptEditorsSection,
  FilesSection,
  WorkflowSection,
} from '@/components/sections';

import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';

export default function Home() {
  // Store state
  const {
    makerPrompt,
    setMakerPrompt,
    checkerPrompt,
    setCheckerPrompt,
    guidelines,
    setGuidelines,
    config,
    setConfig,
    status,
    currentIteration,
    iterationHistory,
    selectedIteration,
    setSelectedIteration,
    finalOutput,
    success,
    startTime,
    makerPresets,
    checkerPresets,
    saveMakerPreset,
    saveCheckerPreset,
    loadMakerPreset,
    loadCheckerPreset,
    deleteMakerPreset,
    deleteCheckerPreset,
  } = useWorkflowStore();

  // Workflow hook
  const { isRunning, canStart, startWorkflow, stopWorkflow, error } = useWorkflow();

  // Toast notifications for workflow events
  useToastNotifications();

  // File upload hooks
  const inputFileUpload = useFileUpload({
    type: 'input',
    maxFiles: 10,
    acceptedTypes: ['.pdf'],
  });

  const sampleFileUpload = useFileUpload({
    type: 'sample',
    maxFiles: 5,
    acceptedTypes: ['.pptx', '.ppt', '.pdf', '.png', '.jpg', '.jpeg', '.gif'],
  });

  // Get last iteration for output panel
  const lastIteration =
    iterationHistory.length > 0 ? iterationHistory[iterationHistory.length - 1] : null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader status={status} success={success} />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Prompt Editors Row */}
          <PromptEditorsSection
            makerPrompt={makerPrompt}
            checkerPrompt={checkerPrompt}
            makerPresets={makerPresets}
            checkerPresets={checkerPresets}
            onMakerPromptChange={setMakerPrompt}
            onCheckerPromptChange={setCheckerPrompt}
            onSaveMakerPreset={saveMakerPreset}
            onSaveCheckerPreset={saveCheckerPreset}
            onLoadMakerPreset={loadMakerPreset}
            onLoadCheckerPreset={loadCheckerPreset}
            onDeleteMakerPreset={deleteMakerPreset}
            onDeleteCheckerPreset={deleteCheckerPreset}
            disabled={isRunning}
          />

          {/* Files and Guidelines Row */}
          <FilesSection
            inputFileUpload={inputFileUpload}
            sampleFileUpload={sampleFileUpload}
            guidelines={guidelines}
            onGuidelinesChange={setGuidelines}
            disabled={isRunning}
          />

          {/* Configuration and Controls */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <ConfigPanel config={config} onChange={setConfig} disabled={isRunning} />
                <RunControls
                  isRunning={isRunning}
                  canStart={canStart}
                  onStart={startWorkflow}
                  onStop={stopWorkflow}
                />
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Progress Display */}
          {status !== 'idle' && (
            <ProgressDisplay
              status={status}
              currentIteration={currentIteration}
              maxIterations={config.maxIterations}
              startTime={startTime}
            />
          )}

          {/* Iteration History and Live Preview */}
          {(status !== 'idle' || iterationHistory.length > 0) && (
            <WorkflowSection
              iterationHistory={iterationHistory}
              selectedIteration={selectedIteration}
              onSelectIteration={setSelectedIteration}
            />
          )}

          {/* Output Panel */}
          <OutputPanel
            status={status}
            finalOutput={finalOutput}
            success={success}
            totalIterations={iterationHistory.length}
            lastIteration={lastIteration}
          />
        </div>
      </main>

      <Toaster />
    </div>
  );
}
