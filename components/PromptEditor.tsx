'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PromptPreset } from '@/types';

interface PromptEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  presets: PromptPreset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
  disabled?: boolean;
}

export function PromptEditor({
  label,
  value,
  onChange,
  placeholder,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  disabled = false,
}: PromptEditorProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSave = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim());
      setPresetName('');
      setSaveDialogOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                Load
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {presets.length === 0 ? (
                <DropdownMenuItem disabled>No saved presets</DropdownMenuItem>
              ) : (
                presets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    className="flex items-center justify-between"
                  >
                    <span
                      onClick={() => onLoadPreset(preset.id)}
                      className="flex-1 cursor-pointer"
                    >
                      {preset.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePreset(preset.id);
                      }}
                    >
                      ×
                    </Button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            disabled={disabled || !value.trim()}
          >
            Save
          </Button>
        </div>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-[200px] font-mono text-sm resize-y"
      />

      <div className="text-xs text-muted-foreground text-right">
        {value.length} characters
      </div>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Prompt Preset</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="preset-name">Preset Name</Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Enter a name for this preset"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!presetName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
