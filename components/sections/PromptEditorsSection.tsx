'use client';

import { PromptEditor } from '@/components/PromptEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PromptPreset } from '@/types';

interface PromptEditorsSectionProps {
  makerPrompt: string;
  checkerPrompt: string;
  makerPresets: PromptPreset[];
  checkerPresets: PromptPreset[];
  onMakerPromptChange: (prompt: string) => void;
  onCheckerPromptChange: (prompt: string) => void;
  onSaveMakerPreset: (name: string) => void;
  onSaveCheckerPreset: (name: string) => void;
  onLoadMakerPreset: (id: string) => void;
  onLoadCheckerPreset: (id: string) => void;
  onDeleteMakerPreset: (id: string) => void;
  onDeleteCheckerPreset: (id: string) => void;
  disabled: boolean;
}

const MAKER_PLACEHOLDER = `Enter instructions for the document generator...

Example:
Create a professional presentation about {{topic}} with the following structure:
- Executive summary
- Key findings
- Detailed analysis
- Recommendations
- Next steps`;

const CHECKER_PLACEHOLDER = `Enter validation criteria for the reviewer...

Example:
Evaluate the presentation against these criteria:
1. Content accuracy and completeness
2. Visual design and consistency
3. Slide structure and flow
4. Professional quality

Provide a pass/fail verdict with confidence score.`;

export function PromptEditorsSection({
  makerPrompt,
  checkerPrompt,
  makerPresets,
  checkerPresets,
  onMakerPromptChange,
  onCheckerPromptChange,
  onSaveMakerPreset,
  onSaveCheckerPreset,
  onLoadMakerPreset,
  onLoadCheckerPreset,
  onDeleteMakerPreset,
  onDeleteCheckerPreset,
  disabled,
}: PromptEditorsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Maker Prompt</CardTitle>
          <p className="text-sm text-muted-foreground">
            Instructions for generating the PowerPoint presentation
          </p>
        </CardHeader>
        <CardContent>
          <PromptEditor
            label=""
            value={makerPrompt}
            onChange={onMakerPromptChange}
            placeholder={MAKER_PLACEHOLDER}
            presets={makerPresets}
            onSavePreset={onSaveMakerPreset}
            onLoadPreset={onLoadMakerPreset}
            onDeletePreset={onDeleteMakerPreset}
            disabled={disabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Checker Prompt</CardTitle>
          <p className="text-sm text-muted-foreground">
            Criteria for validating the generated presentation
          </p>
        </CardHeader>
        <CardContent>
          <PromptEditor
            label=""
            value={checkerPrompt}
            onChange={onCheckerPromptChange}
            placeholder={CHECKER_PLACEHOLDER}
            presets={checkerPresets}
            onSavePreset={onSaveCheckerPreset}
            onLoadPreset={onLoadCheckerPreset}
            onDeletePreset={onDeleteCheckerPreset}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
