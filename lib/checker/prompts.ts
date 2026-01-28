// Checker prompt templates

export interface PromptContext {
  userPrompt: string;
  guidelines?: string;
  sampleDescriptions?: string[];
  iterationNumber: number;
  previousFeedback?: string;
}

/** Build the complete checker prompt */
export function buildCheckerPrompt(context: PromptContext): string {
  const sections = [
    buildRoleSection(),
    buildUserCriteriaSection(context.userPrompt),
    buildGuidelinesSection(context.guidelines),
    buildSamplesSection(context.sampleDescriptions),
    buildContextSection(context.iterationNumber, context.previousFeedback),
    buildInstructionsSection(),
    buildResponseFormatSection(),
  ];

  return sections.filter(Boolean).join('\n\n');
}

function buildRoleSection(): string {
  return `You are a PowerPoint presentation reviewer. Your job is to evaluate presentations against specific criteria and provide actionable feedback.`;
}

function buildUserCriteriaSection(userPrompt: string): string {
  return `## Evaluation Criteria

${userPrompt}`;
}

function buildGuidelinesSection(guidelines?: string): string {
  if (!guidelines?.trim()) return '';

  return `## Additional Guidelines

${guidelines}`;
}

function buildSamplesSection(sampleDescriptions?: string[]): string {
  if (!sampleDescriptions?.length) return '';

  const formatted = sampleDescriptions.map((desc, i) => `${i + 1}. ${desc}`).join('\n');

  return `## Reference Samples

The following are descriptions of example good presentations:
${formatted}`;
}

function buildContextSection(iteration: number, previousFeedback?: string): string {
  let section = `## Context

This is iteration #${iteration} of the generation process.`;

  if (previousFeedback) {
    section += `

Previous feedback that should have been addressed:
${previousFeedback}`;
  }

  return section;
}

function buildInstructionsSection(): string {
  return `## Your Task

Review the attached presentation and:
1. Evaluate against ALL criteria above
2. Determine if it passes quality standards
3. Assign a confidence score (0.0 to 1.0)
4. List specific, actionable issues if any`;
}

function buildResponseFormatSection(): string {
  return `## Response Format

Respond ONLY with valid JSON in this exact format:
{
  "passed": boolean,
  "confidence": number,
  "feedback": "Overall assessment in 1-2 sentences",
  "issues": ["Specific issue 1", "Specific issue 2"]
}

Do not include any text outside the JSON object.`;
}
