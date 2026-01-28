# Product Requirements Document: Maker-Checker Agent System

## Overview

Build a Next.js web application that orchestrates an AI-powered document generation workflow using a maker-checker pattern. The system uses the Manus API to generate PowerPoint presentations and an LLM-based reviewer to validate outputs, iterating until quality standards are met.

## Technical Stack

- **Framework**: Next.js 14+ (App Router)
- **Deployment**: Vercel
- **Agent Orchestration**: LangGraph.js
- **Document Generation**: Manus API
- **Review Agent**: Anthropic Claude API (or OpenAI)
- **State Management**: React hooks + Zustand (for complex state)
- **Styling**: Tailwind CSS
- **Real-time Updates**: Server-Sent Events (SSE) or Vercel AI SDK streaming

---

## Core Architecture

### Agent Flow

```
User Input → Maker Agent (Manus) → Checker Agent (LLM) → Pass? → Output
                    ↑                      │
                    └──────── No ──────────┘
                         (with feedback)
```

### System Components

1. **Frontend**: React-based UI for configuration, execution, and monitoring
2. **API Routes**: Next.js API routes handling agent orchestration
3. **LangGraph Workflow**: Defines the cyclic maker-checker graph
4. **Manus Integration**: Service layer for Manus API calls
5. **Checker Agent**: LLM-based validation service

---

## Feature Requirements

### 1. Prompt Configuration Panel

#### 1.1 Maker Prompt Editor
- Large textarea for entering the maker (generation) prompt
- This prompt instructs Manus on how to generate the PowerPoint
- Support for template variables (e.g., `{{filename}}`, `{{context}}`)
- Character count display
- Save/load prompt presets (localStorage initially, database later)
- Syntax highlighting for any structured portions (nice-to-have)

#### 1.2 Checker Prompt Editor
- Separate textarea for the checker (validation) prompt
- This prompt instructs the reviewer LLM on how to evaluate the output
- Should include sections for:
  - Evaluation criteria
  - Pass/fail conditions
  - Feedback format instructions
- Support for referencing uploaded sample files in the prompt
- Save/load prompt presets

#### 1.3 Guidelines & Samples Section
- File upload area for reference samples (example good PowerPoints)
- Text area for written guidelines the checker should follow
- These get injected into the checker prompt context

### 2. File Upload Section

- Drag-and-drop zone for uploading input files
- Support multiple file types that Manus accepts
- Display uploaded file list with:
  - File name
  - File size
  - Remove button
- Store files temporarily for the session using Vercel Blob
- Files are ephemeral - they only need to persist during the workflow run
- User downloads the final file at the end; no long-term storage needed

### 3. Execution Controls

#### 3.1 Configuration Options
- **Max Iterations**: Number input (1-50, default 20)
- **Confidence Threshold**: Slider (0.0-1.0, default 0.8) - minimum confidence score from checker to pass
- **Auto-stop on pass**: Toggle (default: true)

#### 3.2 Run Button
- Primary action button to start the workflow
- Disabled state when:
  - No files uploaded
  - Prompts are empty
  - Workflow already running
- Shows loading spinner during execution

#### 3.3 Stop Button
- Appears when workflow is running
- Gracefully stops the loop after current iteration completes
- Outputs whatever was generated in the last iteration

### 4. Status & Progress Display

#### 4.1 Overall Progress
- Progress bar showing current iteration / max iterations
- Elapsed time counter
- Current status text (e.g., "Generating with Manus...", "Reviewing output...", "Applying feedback...")

#### 4.2 Iteration History (Critical Feature)
- Scrollable list showing each iteration's details:
  - Iteration number
  - Timestamp
  - Checker verdict (Pass/Fail)
  - Confidence score
  - **Download button for the PPTX generated in that iteration** - Users must be able to download any historical iteration's output, not just the final one
  - **Preview button** - Opens a modal or side panel showing a preview of the PowerPoint (can be slide thumbnails or embedded viewer)
  - Expandable feedback text from the checker
  - Expandable list of specific issues found
- Visual indicators (green checkmark for pass, red X for fail)
- Click to expand/collapse detailed feedback
- **Each iteration's PPTX file must be persisted** (not overwritten) so users can compare outputs across iterations

#### 4.3 Live Preview Panel
- **Dedicated panel showing the LATEST generated PowerPoint** - This should update automatically after each maker iteration completes
- Preview options:
  - Slide thumbnails (preferred - show all slides as a grid or carousel)
  - Or embedded PowerPoint viewer if available
  - Download button for the currently displayed file
- **Alongside the preview, show the checker's feedback** for that specific file
  - Display the feedback in a clear, readable format
  - Highlight specific issues mentioned
  - Show the confidence score prominently

#### 4.3 Live Logs (Optional but Recommended)
- Collapsible panel showing real-time logs
- Useful for debugging
- Shows API calls, responses, timing

### 5. Output Section

#### 5.1 Final Output Display
- When workflow completes successfully:
  - Download button for the generated PowerPoint
  - Preview of the file (if possible, or metadata)
  - Success message with iteration count
- When workflow fails (max iterations reached):
  - Download button for last attempt
  - Warning message explaining it didn't pass validation
  - Summary of remaining issues

#### 5.2 History/Runs List (Nice-to-have)
- List of previous runs
- Each shows: timestamp, status, iteration count
- Click to view details of past run

---

## API Design

### API Routes Structure

```
/api/
├── workflow/
│   ├── start/          POST - Initiate new workflow run
│   ├── status/[runId]  GET  - Get current status (SSE for streaming)
│   └── stop/[runId]    POST - Stop a running workflow
├── manus/
│   └── generate/       POST - Internal: Call Manus API
├── checker/
│   └── review/         POST - Internal: Call checker LLM
└── files/
    ├── upload/         POST - Upload input files
    └── download/[id]   GET  - Download generated output
```

### Workflow Start Request

```typescript
POST /api/workflow/start
{
  fileIds: string[],           // Previously uploaded file IDs
  makerPrompt: string,         // The generation prompt
  checkerPrompt: string,       // The validation prompt
  guidelines: string,          // Written guidelines
  sampleFileIds: string[],     // Reference sample file IDs
  config: {
    maxIterations: number,
    confidenceThreshold: number,
    autoStopOnPass: boolean
  }
}

Response: {
  runId: string,
  status: "started"
}
```

### Status Stream Response

```typescript
GET /api/workflow/status/[runId]
// Server-Sent Events stream

Event types:
- iteration_start: { iteration: number }
- maker_complete: { 
    iteration: number, 
    timestamp: string,
    outputFileId: string,           // ID of the generated PPTX
    outputFileUrl: string,          // Download URL for the PPTX
    thumbnailUrls: string[]         // Array of slide thumbnail URLs for preview
  }
- checker_complete: { 
    iteration: number, 
    passed: boolean, 
    confidence: number,
    feedback: string,
    issues: string[]
  }
- workflow_complete: {
    success: boolean,
    totalIterations: number,
    finalOutputFileId: string,
    finalOutputFileUrl: string
  }
- error: { message: string, iteration: number }
```

**Important**: The `maker_complete` event includes all URLs needed for the UI to immediately display the preview and enable downloads, without needing a separate API call.

---

## LangGraph Implementation

### Graph Structure

Define a LangGraph workflow with the following nodes:

1. **maker_node**: 
   - Receives current state (files, prompt, feedback from previous iteration)
   - Calls Manus API
   - Returns generated file

2. **checker_node**:
   - Receives generated file and checker prompt
   - Calls LLM to evaluate
   - Returns pass/fail, confidence, feedback

3. **router_node** (conditional edge):
   - If passed and confidence >= threshold: route to END
   - If iteration >= maxIterations: route to END
   - Otherwise: route back to maker_node with feedback

### State Schema

```typescript
interface WorkflowState {
  // Inputs
  inputFiles: File[];
  makerPrompt: string;
  checkerPrompt: string;
  guidelines: string;
  sampleFiles: File[];
  
  // Configuration
  maxIterations: number;
  confidenceThreshold: number;
  
  // Runtime state
  currentIteration: number;
  currentOutput: File | null;
  feedback: string | null;
  
  // History - IMPORTANT: Each iteration stores its own output file
  iterationHistory: IterationRecord[];
  
  // Result
  finalOutput: File | null;
  success: boolean;
}

interface IterationRecord {
  iteration: number;
  timestamp: Date;
  makerDuration: number;
  checkerDuration: number;
  
  // Generated file for THIS iteration (must be persisted, not overwritten)
  outputFileId: string;        // Reference to stored file
  outputFileUrl: string;       // Download URL for this iteration's PPTX
  
  // Checker results
  passed: boolean;
  confidence: number;
  feedback: string;            // Full feedback text
  issues: string[];            // Specific issues as a list
}
```

**Critical Implementation Note**: Each iteration's PPTX must be stored separately (e.g., `iteration_1_output.pptx`, `iteration_2_output.pptx`, etc.) so users can download and compare any historical version. Do NOT overwrite the previous iteration's file.
```

---

## File Storage Strategy

### Storage Provider: Vercel Blob

Use Vercel Blob for all file storage. It integrates natively with Next.js on Vercel and requires minimal setup.

### File Types Stored

| File Type | When Created | Retention |
|-----------|--------------|-----------|
| User input files | Upload before workflow | Session only |
| Sample/reference files | Upload before workflow | Session only |
| Iteration PPTX outputs | After each maker iteration | Session only |
| Slide thumbnails | After PPTX generation | Session only |

### Retention Policy

- **All files are ephemeral** - stored only for the duration of the workflow session
- **No long-term storage required** - user downloads the final PPTX when satisfied
- **Auto-cleanup**: Use Vercel Blob's `expiresAt` option to auto-delete files after 24 hours as a safety net
- **Manual cleanup**: Delete all files associated with a `runId` when the user closes the session or downloads the final file

### Implementation

```typescript
import { put, del } from '@vercel/blob';

// Upload with 24-hour expiration
const blob = await put(`runs/${runId}/iteration_${iteration}.pptx`, file, {
  access: 'public',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
});

// Cleanup when session ends
async function cleanupRun(runId: string) {
  // Delete all blobs with prefix `runs/${runId}/`
  // ... implementation
}
```

### File Naming Convention

```
runs/
└── {runId}/
    ├── inputs/
    │   ├── input_file_1.pdf
    │   └── input_file_2.docx
    ├── samples/
    │   └── sample_1.pptx
    └── iterations/
        ├── iteration_1/
        │   ├── output.pptx
        │   └── thumbnails/
        │       ├── slide_1.png
        │       ├── slide_2.png
        │       └── ...
        ├── iteration_2/
        │   ├── output.pptx
        │   └── thumbnails/
        │       └── ...
        └── ...
```

---

## Manus API Integration

### Expected Manus API Interface

Note: Adjust based on actual Manus API documentation.

```typescript
interface ManusRequest {
  files: File[];           // Input files for context
  prompt: string;          // Generation instructions
  outputFormat: "pptx";    // We want PowerPoint output
  // Any other Manus-specific parameters
}

interface ManusResponse {
  outputFile: Buffer;      // The generated PPTX
  metadata: {
    slideCount: number;
    // Other metadata
  };
}
```

### Error Handling
- Retry on transient failures (429, 500, 503) with exponential backoff
- Surface clear error messages to the user
- Don't count failed API calls toward iteration limit

---

## PowerPoint Preview Implementation

Since PPTX files cannot be natively rendered in the browser, implement one of these approaches:

### Option 1: Slide Thumbnail Generation (Recommended)
- When Manus returns a PPTX, convert it to images server-side
- Use a library like `libreoffice --headless --convert-to png` to extract slide images
- Store thumbnails alongside the PPTX file
- Display thumbnails in a grid or carousel in the UI

### Option 2: PDF Conversion
- Convert PPTX to PDF server-side
- Use a PDF viewer component (like `react-pdf`) to display in the browser
- Simpler than image extraction but loses some fidelity

### Option 3: Embedded Viewer (if available)
- If hosting files on a public URL, can use Google Docs Viewer or Microsoft Office Online viewer
- Requires files to be publicly accessible (may not be suitable for sensitive content)

### Implementation Notes
- Thumbnail generation should happen asynchronously after each Manus task completes
- Store thumbnails in Vercel Blob alongside the PPTX file
- Return thumbnail URLs in the SSE event for immediate UI update

---

## Checker Agent Implementation

### Prompt Structure

The checker prompt should be structured to produce consistent, parseable output:

```
You are a PowerPoint presentation reviewer. Evaluate the attached presentation against the following criteria and guidelines.

## Guidelines
{user_provided_guidelines}

## Reference Samples
The following are examples of good presentations:
{sample_file_contents_or_descriptions}

## Evaluation Criteria
1. Content accuracy and completeness
2. Visual design and consistency
3. Slide structure and flow
4. Adherence to guidelines
5. Professional quality

## Your Task
Review the presentation and provide:
1. A pass/fail verdict
2. A confidence score (0.0 to 1.0)
3. Specific feedback for improvement
4. A list of individual issues found

Respond in the following JSON format:
{
  "passed": boolean,
  "confidence": number,
  "feedback": "Overall feedback string",
  "issues": ["Issue 1", "Issue 2", ...]
}
```

### LLM Selection
- Use Claude (claude-sonnet-4-20250514) for the checker
- Ensure the model can handle file attachments (PDF/image export of PPTX may be needed)
- Consider using vision capabilities to actually "see" the slides

---

## UI/UX Requirements

### Layout

The UI uses a two-column layout during execution: left side for configuration and history, right side for live preview.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Header: "Maker-Checker Agent"                                    [Settings]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐                  │
│  │    Maker Prompt         │  │     Checker Prompt          │                  │
│  │    [textarea]           │  │     [textarea]              │                  │
│  │                         │  │                             │                  │
│  │    [Save] [Load]        │  │     [Save] [Load]           │                  │
│  └─────────────────────────┘  └─────────────────────────────┘                  │
│                                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐                  │
│  │    Input Files          │  │     Guidelines & Samples    │                  │
│  │    [Drop zone]          │  │     [textarea]              │                  │
│  │    - file1.pdf   [x]    │  │     [Upload samples]        │                  │
│  │    - file2.docx  [x]    │  │     - sample1.pptx  [x]     │                  │
│  └─────────────────────────┘  └─────────────────────────────┘                  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  Config: Max Iterations [20]  Threshold [0.8]    [▶ Run Workflow] [⏹ Stop]│ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  Progress: [████████░░░░░░░░░░░░] 8/20  |  2m 34s  |  Reviewing output... │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐ │
│  │  Iteration History              │  │  Live Preview: Iteration #8        │ │
│  │  ┌───────────────────────────┐  │  │  ┌─────────────────────────────┐   │ │
│  │  │ #8 ❌ 0.72  [📥] [👁]     │  │  │  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐  │   │ │
│  │  │ "Missing executive..."    │  │  │  │  │ 1 │ │ 2 │ │ 3 │ │ 4 │  │   │ │
│  │  └───────────────────────────┘  │  │  │  └───┘ └───┘ └───┘ └───┘  │   │ │
│  │  ┌───────────────────────────┐  │  │  │  (slide thumbnails)        │   │ │
│  │  │ #7 ❌ 0.68  [📥] [👁]     │  │  │  └─────────────────────────────┘   │ │
│  │  └───────────────────────────┘  │  │                                     │ │
│  │  ┌───────────────────────────┐  │  │  [Download PPTX]                    │ │
│  │  │ #6 ❌ 0.61  [📥] [👁]     │  │  │                                     │ │
│  │  └───────────────────────────┘  │  │  ┌─────────────────────────────┐   │ │
│  │  ┌───────────────────────────┐  │  │  │ Checker Feedback:           │   │ │
│  │  │ #5 ❌ 0.55  [📥] [👁]     │  │  │  │ • Missing executive summary │   │ │
│  │  └───────────────────────────┘  │  │  │ • Slide 3 lacks data viz    │   │ │
│  │  ... (scrollable)               │  │  │ • Inconsistent font sizes   │   │ │
│  │                                 │  │  │ Confidence: 72%             │   │ │
│  │  [📥] = Download  [👁] = Preview│  │  └─────────────────────────────┘   │ │
│  └─────────────────────────────────┘  └─────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

Legend:
- Clicking [👁] Preview on any iteration updates the right panel to show that iteration's PPTX and feedback
- The right panel auto-updates to show the latest iteration as the workflow runs
- [📥] Download lets you download that specific iteration's PPTX file
```

### Responsive Design
- Mobile-friendly but optimized for desktop use
- Prompts should stack vertically on smaller screens
- Progress and history should remain visible during execution

### Visual Feedback
- Smooth animations for progress updates
- Color coding: green for pass, red for fail, yellow for in-progress
- Skeleton loaders while waiting for responses
- Toast notifications for errors and completion

---

## File Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Main application page
│   ├── api/
│   │   ├── workflow/
│   │   │   ├── start/route.ts
│   │   │   ├── status/[runId]/route.ts
│   │   │   └── stop/[runId]/route.ts
│   │   ├── files/
│   │   │   ├── upload/route.ts
│   │   │   └── download/[id]/route.ts
│   │   └── health/route.ts
│   └── globals.css
├── components/
│   ├── PromptEditor.tsx            # Reusable prompt textarea with save/load
│   ├── FileUploader.tsx            # Drag-drop file upload
│   ├── ConfigPanel.tsx             # Iteration/threshold settings
│   ├── RunControls.tsx             # Run/Stop buttons
│   ├── ProgressDisplay.tsx         # Progress bar and status
│   ├── IterationHistory.tsx        # List of iteration results
│   ├── OutputPanel.tsx             # Final output download
│   └── ui/                         # Shadcn/ui components
├── lib/
│   ├── langgraph/
│   │   ├── workflow.ts             # LangGraph workflow definition
│   │   ├── nodes/
│   │   │   ├── maker.ts            # Maker node implementation
│   │   │   └── checker.ts          # Checker node implementation
│   │   └── state.ts                # State schema definitions
│   ├── manus/
│   │   └── client.ts               # Manus API client
│   ├── checker/
│   │   └── client.ts               # LLM checker client
│   └── storage/
│       └── files.ts                # File storage utilities
├── hooks/
│   ├── useWorkflow.ts              # Workflow execution hook
│   └── useFileUpload.ts            # File upload hook
├── store/
│   └── workflowStore.ts            # Zustand store for app state
├── types/
│   └── index.ts                    # TypeScript type definitions
└── .env.local                      # Environment variables
```

---

## Environment Variables

```
# Manus API
MANUS_API_KEY=
MANUS_API_URL=

# Anthropic (for checker)
ANTHROPIC_API_KEY=

# Vercel Blob Storage (for temporary file storage during workflow runs)
BLOB_READ_WRITE_TOKEN=

# Optional: Database for run history
DATABASE_URL=
```

---

## Development Phases

### Phase 1: Core Infrastructure
1. Set up Next.js project with TypeScript and Tailwind
2. Create basic UI layout and components
3. Implement file upload functionality
4. Set up environment variables and API route structure

### Phase 2: Agent Implementation
1. Implement Manus API client
2. Implement checker LLM client
3. Build LangGraph workflow
4. Create workflow execution API routes

### Phase 3: Real-time Updates
1. Implement SSE for status streaming
2. Build progress display components
3. Add iteration history tracking
4. Handle workflow completion and errors

### Phase 4: Polish & Features
1. Add prompt save/load functionality
2. Implement proper error handling and retries
3. Add configuration options
4. Improve UI/UX with animations and feedback

### Phase 5: Production Readiness
1. Add proper logging and monitoring
2. Implement rate limiting
3. Add authentication (if needed)
4. Optimize for Vercel deployment

---

## Testing Considerations

- Mock Manus API for development without burning API credits
- Create sample test files for consistent testing
- Test the iteration loop with artificially failing checker
- Test SSE connection resilience
- Test stop functionality mid-workflow

---

## Open Questions / Decisions Needed

1. **Manus API specifics**: Need actual API documentation to finalize integration
2. **File format for checker**: Can the checker LLM read PPTX directly, or do we need to convert to PDF/images?
3. **Authentication**: Should this be a protected application or open?
4. **Persistence**: Do we need to persist run history to a database, or is session-based sufficient?
5. **Concurrent runs**: Should we support multiple simultaneous workflow runs?

---

## Success Criteria

1. User can configure prompts and upload files through the UI
2. Clicking "Run" initiates the maker-checker loop
3. Real-time progress is visible during execution
4. Workflow correctly iterates until pass or max iterations
5. User can download the final output
6. User can stop a running workflow
7. All errors are handled gracefully with clear user feedback
