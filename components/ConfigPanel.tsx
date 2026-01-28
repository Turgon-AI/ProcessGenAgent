'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { WorkflowConfig } from '@/types';

interface ConfigPanelProps {
  config: WorkflowConfig;
  onChange: (config: Partial<WorkflowConfig>) => void;
  disabled?: boolean;
}

export function ConfigPanel({ config, onChange, disabled = false }: ConfigPanelProps) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* Max Iterations */}
      <div className="flex items-center gap-2">
        <Label htmlFor="max-iterations" className="text-sm whitespace-nowrap">
          Max Iterations
        </Label>
        <Input
          id="max-iterations"
          type="number"
          min={1}
          max={50}
          value={config.maxIterations}
          onChange={(e) =>
            onChange({ maxIterations: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) })
          }
          disabled={disabled}
          className="w-20"
        />
      </div>

      {/* Confidence Threshold */}
      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">
          Threshold: {(config.confidenceThreshold * 100).toFixed(0)}%
        </Label>
        <Slider
          value={[config.confidenceThreshold]}
          onValueChange={([value]) => onChange({ confidenceThreshold: value })}
          min={0}
          max={1}
          step={0.05}
          disabled={disabled}
          className="w-32"
        />
      </div>

      {/* Auto-stop on pass */}
      <div className="flex items-center gap-2">
        <Switch
          id="auto-stop"
          checked={config.autoStopOnPass}
          onCheckedChange={(checked) => onChange({ autoStopOnPass: checked })}
          disabled={disabled}
        />
        <Label htmlFor="auto-stop" className="text-sm cursor-pointer">
          Auto-stop on pass
        </Label>
      </div>
    </div>
  );
}
