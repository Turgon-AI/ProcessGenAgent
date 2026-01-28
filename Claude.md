# Maker-Checker Agent - Code Documentation

## Project Guidelines

### Architecture Principles

- **Component-based, single responsibility** - Each component/function does ONE thing well
- **Shared utilities in `/lib`** - Common logic lives in lib/, never duplicated
- **Never duplicate** - Always check for existing code first before writing new
- **Composition over inheritance** - Build complex behavior by combining simple pieces
- **Separation of concerns** - UI components don't contain business logic

### Design Patterns Used

| Pattern | Location | Purpose |
|---------|----------|---------|
| Repository | `lib/storage/`, `lib/manus/`, `lib/checker/` | Data access abstraction |
| Factory | `lib/langgraph/nodes/` | Complex object creation |
| Observer | SSE events, Zustand subscriptions | Real-time updates |
| Strategy | Checker prompts | Interchangeable validation logic |

### Code Quality Standards

#### Functions
- **Maximum 30 lines** per function - if longer, extract helpers
- **Single responsibility** - one function, one job
- **Descriptive names** - `uploadIterationOutput()` not `upload()`
- **Pure when possible** - minimize side effects

#### Files
- **Maximum ~200 lines** per file - split if larger
- **One component per file** for React components
- **Group related utilities** but keep focused

#### Types
- **Type everything** - no `any` unless absolutely necessary
- **Interfaces for objects** - use `interface` for object shapes
- **Enums or unions for literals** - `type Status = 'idle' | 'running'`
- **Export types separately** - all types in `types/index.ts`

#### Constants
- **Extract magic values** - no hardcoded numbers/strings in logic
- **UPPER_SNAKE_CASE** for constants
- **Group in config files** - `lib/constants.ts` for app-wide values

```typescript
// Bad
if (iterations > 50) { ... }

// Good
const MAX_ITERATIONS = 50;
if (iterations > MAX_ITERATIONS) { ... }
```

### Process Before Writing Code

1. **List existing components** that could be reused
2. **Check for existing utilities** in `lib/`
3. **Propose structure** before implementing complex features
4. **Identify shared logic** that should be extracted

### File Organization

```
/
├── app/                          # Next.js App Router (routes only)
│   ├── api/                      # API routes - thin controllers
│   └── page.tsx                  # Page composition only
│
├── components/                   # React Components
│   ├── ui/                       # Primitive UI (shadcn)
│   ├── [Feature]/                # Feature-specific components
│   │   ├── index.ts              # Public exports
│   │   ├── FeatureComponent.tsx  # Main component
│   │   └── FeatureHelpers.tsx    # Supporting components
│   └── shared/                   # Reusable across features
│
├── lib/                          # Core business logic
│   ├── constants.ts              # App-wide constants
│   ├── utils.ts                  # General utilities
│   ├── [domain]/                 # Domain-specific logic
│   │   ├── client.ts             # External API client
│   │   ├── types.ts              # Domain types (if many)
│   │   └── utils.ts              # Domain utilities
│   └── langgraph/
│       ├── workflow.ts           # Graph definition
│       ├── state.ts              # State schema
│       └── nodes/                # Individual nodes
│
├── hooks/                        # React hooks
│   └── use[Feature].ts           # One hook per concern
│
├── store/                        # State management
│   └── [feature]Store.ts         # One store per domain
│
└── types/                        # TypeScript types
    └── index.ts                  # Central type exports
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `IterationHistory.tsx` |
| Hooks | camelCase, use prefix | `useWorkflow.ts` |
| Utilities | camelCase | `formatFileSize()` |
| Constants | UPPER_SNAKE_CASE | `MAX_ITERATIONS` |
| Types/Interfaces | PascalCase | `WorkflowState` |
| Files | Match export name | `useWorkflow.ts` exports `useWorkflow` |

### Component Guidelines

```typescript
// Good: Small, focused component
function IterationBadge({ passed, confidence }: IterationBadgeProps) {
  return (
    <Badge variant={passed ? 'success' : 'destructive'}>
      {passed ? 'Pass' : 'Fail'} ({(confidence * 100).toFixed(0)}%)
    </Badge>
  );
}

// Bad: Component doing too much
function IterationItem({ ... }) {
  // 200 lines of mixed concerns
}
```

#### Component Structure
1. Type definitions (or import)
2. Component function
3. Helper functions (or extract to separate file)
4. No inline styles - use Tailwind classes

### API Route Guidelines

API routes should be thin controllers:

```typescript
// Good: Thin controller, logic in lib/
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await workflowService.start(body); // Logic in lib/
  return NextResponse.json(result);
}

// Bad: Business logic in route
export async function POST(request: NextRequest) {
  // 100 lines of business logic here
}
```

### Error Handling

- Use custom error types for domain errors
- Always handle errors at API boundaries
- Provide user-friendly error messages
- Log technical details server-side

```typescript
// lib/errors.ts
export class WorkflowError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// Usage
throw new WorkflowError('Max iterations exceeded', 'MAX_ITERATIONS');
```

---

## Project Overview

This is a Next.js 14+ application implementing an AI-powered document generation workflow using a maker-checker pattern:
- **Manus API** generates PowerPoint presentations
- **Claude API** (Anthropic) validates outputs
- **LangGraph.js** orchestrates the agent workflow

The workflow iterates until quality standards are met or max iterations are reached.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Agent Orchestration | LangGraph.js |
| File Storage | Vercel Blob |
| Real-time Updates | Server-Sent Events (SSE) |

## Directory Structure

```
/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page (composition)
│   ├── globals.css              # Global styles
│   └── api/                     # API Routes (thin controllers)
│       ├── workflow/
│       │   ├── start/route.ts
│       │   ├── status/[runId]/route.ts
│       │   └── stop/[runId]/route.ts
│       ├── files/
│       │   ├── upload/route.ts
│       │   └── download/[id]/route.ts
│       └── health/route.ts
│
├── components/                   # React Components
│   ├── ui/                      # shadcn/ui primitives
│   ├── shared/                  # Reusable components
│   │   ├── LoadingSpinner.tsx   # Animated spinner
│   │   ├── StatusIndicator.tsx  # Status dot with pulse
│   │   └── Icons.tsx            # SVG icon components
│   ├── sections/                # Page sections
│   │   ├── PageHeader.tsx       # Header with status
│   │   ├── PromptEditorsSection.tsx
│   │   ├── FilesSection.tsx
│   │   └── WorkflowSection.tsx
│   ├── PromptEditor.tsx         # Prompt textarea + presets
│   ├── FileUploader.tsx         # Drag-drop upload
│   ├── ConfigPanel.tsx          # Settings controls
│   ├── RunControls.tsx          # Start/Stop buttons
│   ├── ProgressDisplay.tsx      # Progress bar
│   ├── IterationHistory.tsx     # Iteration list
│   ├── LivePreview.tsx          # Preview panel
│   └── OutputPanel.tsx          # Final output
│
├── lib/                         # Core Libraries
│   ├── utils.ts                 # General utilities
│   ├── constants.ts             # App constants
│   ├── errors.ts                # Custom error types
│   ├── langgraph/               # LangGraph workflow
│   │   ├── workflow.ts          # Graph definition
│   │   ├── state.ts             # State schema
│   │   ├── service.ts           # Workflow execution
│   │   ├── mock.ts              # Mock workflow
│   │   └── nodes/
│   │       ├── maker.ts         # Maker node
│   │       └── checker.ts       # Checker node
│   ├── manus/                   # Manus API
│   │   ├── client.ts            # API client
│   │   └── types.ts             # Manus-specific types
│   ├── checker/                 # LLM checker
│   │   ├── client.ts            # Claude client
│   │   ├── types.ts             # Checker types
│   │   └── prompts.ts           # Prompt templates
│   ├── conversion/              # File conversion
│   │   ├── types.ts             # Conversion types
│   │   └── service.ts           # PPTX to PDF service
│   ├── thumbnails/              # Thumbnail generation
│   │   ├── types.ts             # Thumbnail types
│   │   └── service.ts           # Thumbnail service
│   ├── sse/                     # SSE utilities
│   │   └── handlers.ts          # Event handlers
│   └── storage/
│       ├── files.ts             # Vercel Blob utilities
│       └── registry.ts          # File URL registry
│
├── hooks/                       # React Hooks
│   ├── useWorkflow.ts           # Workflow execution
│   ├── useFileUpload.ts         # File upload
│   └── useToastNotifications.ts # Workflow event toasts
│
├── store/                       # State Management
│   ├── types.ts                 # Store interface
│   ├── initialState.ts          # Initial state
│   ├── workflowStore.ts         # Main store (composition)
│   └── actions/                 # Modular actions
│       ├── fileActions.ts       # File management
│       ├── promptActions.ts     # Prompt management
│       └── workflowActions.ts   # Workflow execution
│
├── types/                       # TypeScript Types
│   └── index.ts                 # All type definitions
│
└── docs/
    └── prd.md                   # Product Requirements
```

## Key Types (`types/index.ts`)

```typescript
// File metadata
interface UploadedFile { id, name, size, type, url, uploadedAt }

// Configuration
interface WorkflowConfig { maxIterations, confidenceThreshold, autoStopOnPass }

// Per-iteration record
interface IterationRecord {
  iteration, timestamp, outputFileId, outputFileUrl,
  thumbnailUrls, passed, confidence, feedback, issues
}

// Complete workflow state
interface WorkflowState {
  inputFiles, makerPrompt, checkerPrompt, guidelines, sampleFiles,
  config, runId, status, currentIteration, iterationHistory, finalOutput
}

// SSE event types
type SSEEvent =
  | SSEIterationStartEvent
  | SSEMakerCompleteEvent
  | SSECheckerCompleteEvent
  | SSEWorkflowCompleteEvent
  | SSEErrorEvent
```

## Data Flow

```
1. User configures prompts and uploads files
2. User clicks "Run Workflow"
3. Frontend POSTs to /api/workflow/start
4. Frontend connects to /api/workflow/status/[runId] (SSE)
5. Backend runs maker-checker loop:
   a. Maker generates PPTX → SSE: maker_complete
   b. Checker validates → SSE: checker_complete
   c. If passed or max iterations → SSE: workflow_complete
   d. Else: loop with feedback
6. Frontend updates UI via SSE events
7. User downloads any iteration's PPTX
```

## Development Phases

### Phase 1: Core Infrastructure ✅
- [x] Next.js project setup
- [x] UI components
- [x] File upload functionality
- [x] API route structure
- [x] Mock SSE workflow
- [x] Zustand store with persistence

### Phase 2: Agent Implementation ✅
- [x] `lib/constants.ts` - App constants (22 lines)
- [x] `lib/errors.ts` - Custom error types (68 lines)
- [x] `lib/manus/types.ts` - Manus types (44 lines)
- [x] `lib/manus/client.ts` - Manus API client (113 lines)
- [x] `lib/checker/types.ts` - Checker types (24 lines)
- [x] `lib/checker/prompts.ts` - Prompt templates (92 lines)
- [x] `lib/checker/client.ts` - Claude checker client (113 lines)
- [x] `lib/langgraph/state.ts` - LangGraph state (66 lines)
- [x] `lib/langgraph/nodes/maker.ts` - Maker node (88 lines)
- [x] `lib/langgraph/nodes/checker.ts` - Checker node (110 lines)
- [x] `lib/langgraph/workflow.ts` - Graph definition (130 lines)
- [x] `lib/langgraph/service.ts` - Workflow service (96 lines)
- [x] `lib/langgraph/index.ts` - Module exports (9 lines)
- [x] Updated status route with mock fallback

### Phase 3: Real-time Updates ✅
- [x] `lib/conversion/types.ts` - Conversion types (20 lines)
- [x] `lib/conversion/service.ts` - PDF conversion service (100 lines)
- [x] `lib/storage/registry.ts` - File registry for URL resolution (43 lines)
- [x] `lib/langgraph/mock.ts` - Extracted mock workflow (130 lines)
- [x] SSE heartbeat for connection keep-alive
- [x] Updated checker to use PDF when available
- [x] Updated status route with file resolution (149 lines)

### Phase 4: Polish & Features ✅
- [x] `lib/sse/handlers.ts` - Extracted SSE event handlers (96 lines)
- [x] `lib/sse/index.ts` - SSE module exports (5 lines)
- [x] `lib/thumbnails/types.ts` - Thumbnail types (26 lines)
- [x] `lib/thumbnails/service.ts` - Thumbnail service (57 lines)
- [x] `components/shared/LoadingSpinner.tsx` - Animated spinner (26 lines)
- [x] `components/shared/StatusIndicator.tsx` - Status dot with pulse (56 lines)
- [x] `components/shared/Icons.tsx` - Reusable SVG icons (65 lines)
- [x] `hooks/useToastNotifications.ts` - Toast notifications hook (70 lines)
- [x] `components/sections/PageHeader.tsx` - Page header section (34 lines)
- [x] `components/sections/PromptEditorsSection.tsx` - Prompt editors (106 lines)
- [x] `components/sections/FilesSection.tsx` - Files section (97 lines)
- [x] `components/sections/WorkflowSection.tsx` - Workflow section (52 lines)
- [x] Store refactored: `store/types.ts`, `store/initialState.ts`, `store/actions/`
- [x] All files now under 200 lines (main store: 328 → 41 lines, page: 320 → 161 lines)
- [x] Thumbnail infrastructure ready (actual conversion in Phase 5)

### Phase 5: Production Readiness (Next)
- [ ] Actual PPTX-to-PDF conversion (LibreOffice or cloud service)
- [ ] Thumbnail generation integration
- [ ] Logging and monitoring
- [ ] Rate limiting
- [ ] Deployment optimization

## Environment Variables

```env
MANUS_API_KEY=           # Manus API key
ANTHROPIC_API_KEY=       # Anthropic Claude API key
BLOB_READ_WRITE_TOKEN=   # Vercel Blob storage token

# Optional
USE_MOCK_WORKFLOW=true   # Use mock workflow for UI testing
CONVERSION_API_URL=      # Cloud conversion service URL
CONVERSION_API_KEY=      # Cloud conversion service API key
```

## Running Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Phase 2 Implementation Summary ✅

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `lib/constants.ts` | 22 | App-wide constants |
| `lib/errors.ts` | 68 | Custom error types with codes |
| `lib/manus/types.ts` | 44 | Manus API types |
| `lib/manus/client.ts` | 113 | Manus client with retry logic |
| `lib/checker/types.ts` | 24 | Checker types |
| `lib/checker/prompts.ts` | 92 | Prompt builder functions |
| `lib/checker/client.ts` | 113 | Claude API client |
| `lib/langgraph/state.ts` | 66 | LangGraph state annotation |
| `lib/langgraph/nodes/maker.ts` | 88 | Maker node |
| `lib/langgraph/nodes/checker.ts` | 110 | Checker node |
| `lib/langgraph/workflow.ts` | 130 | Graph definition |
| `lib/langgraph/service.ts` | 96 | Workflow execution service |
| `lib/langgraph/index.ts` | 9 | Module exports |

### Architecture Notes

1. **Factory Pattern**: `createManusClient()` and `createCheckerClient()` for dependency injection
2. **Small Functions**: All functions < 30 lines
3. **Separation of Concerns**: Types, clients, prompts in separate files
4. **Error Handling**: Custom error types with error codes
5. **Mock Fallback**: Status route runs mock workflow when `USE_MOCK_WORKFLOW=true`

### Known Limitations (Phase 3/4)

- **PPTX Review**: Claude only supports PDF documents; PPTX needs conversion
- **File Resolution**: Placeholder file objects used; need proper URL resolution
- **Thumbnails**: Not yet implemented

### Code Reused

- `types/index.ts` - All type definitions
- `lib/storage/files.ts` - File upload utilities
- `store/workflowStore.ts` - State management
- `hooks/useWorkflow.ts` - SSE event handling

## Phase 4 Implementation Summary ✅

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `lib/sse/handlers.ts` | 96 | SSE event handler factory |
| `lib/sse/index.ts` | 5 | Module exports |
| `lib/thumbnails/types.ts` | 26 | Thumbnail types |
| `lib/thumbnails/service.ts` | 57 | Thumbnail generation service |
| `components/shared/LoadingSpinner.tsx` | 26 | Animated loading spinner |
| `components/shared/StatusIndicator.tsx` | 56 | Status dot with pulse animation |
| `components/shared/Icons.tsx` | 65 | Reusable SVG icon components |
| `components/shared/index.ts` | 14 | Shared component exports |
| `components/sections/PageHeader.tsx` | 34 | Page header section |
| `components/sections/PromptEditorsSection.tsx` | 106 | Prompt editors section |
| `components/sections/FilesSection.tsx` | 97 | Files upload section |
| `components/sections/WorkflowSection.tsx` | 52 | Iteration history + preview |
| `components/sections/index.ts` | 6 | Section exports |
| `hooks/useToastNotifications.ts` | 70 | Toast notifications for workflow events |
| `store/types.ts` | 70 | Store interface |
| `store/initialState.ts` | 28 | Initial state |
| `store/actions/fileActions.ts` | 40 | File management actions |
| `store/actions/promptActions.ts` | 79 | Prompt management actions |
| `store/actions/workflowActions.ts` | 127 | Workflow execution actions |
| `store/actions/index.ts` | 5 | Action exports |

### Refactoring Summary

| File | Before | After | Change |
|------|--------|-------|--------|
| `store/workflowStore.ts` | 328 | 41 | -287 lines |
| `app/page.tsx` | 320 | 161 | -159 lines |
| `hooks/useWorkflow.ts` | 213 | 161 | -52 lines |
| `components/IterationHistory.tsx` | 202 | 134 | -68 lines |

### Architecture Improvements

1. **Modular Store**: Actions split into domain-specific modules (file, prompt, workflow)
2. **Page Sections**: Large page component split into focused section components
3. **Shared Components**: Icons and indicators extracted for reuse
4. **SSE Handler Factory**: Event handling logic extracted from hook

## Code Review Checklist

Before committing, verify:
- [ ] No function exceeds 30 lines
- [ ] No file exceeds 200 lines
- [ ] All types are explicit (no `any`)
- [ ] Magic values extracted to constants
- [ ] Error handling at API boundaries
- [ ] Existing utilities reused
- [ ] Single responsibility per function/component
