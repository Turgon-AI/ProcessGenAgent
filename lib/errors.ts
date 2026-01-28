// Custom error types for the application

export enum ErrorCode {
  // Workflow errors
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  WORKFLOW_ALREADY_RUNNING = 'WORKFLOW_ALREADY_RUNNING',
  MAX_ITERATIONS_EXCEEDED = 'MAX_ITERATIONS_EXCEEDED',
  WORKFLOW_STOPPED = 'WORKFLOW_STOPPED',

  // Manus errors
  MANUS_API_ERROR = 'MANUS_API_ERROR',
  MANUS_TIMEOUT = 'MANUS_TIMEOUT',
  MANUS_INVALID_RESPONSE = 'MANUS_INVALID_RESPONSE',

  // Checker errors
  CHECKER_API_ERROR = 'CHECKER_API_ERROR',
  CHECKER_INVALID_RESPONSE = 'CHECKER_INVALID_RESPONSE',
  CHECKER_PARSE_ERROR = 'CHECKER_PARSE_ERROR',

  // File errors
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ManusError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.MANUS_API_ERROR, details);
    this.name = 'ManusError';
  }
}

export class CheckerError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.CHECKER_API_ERROR, details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'CheckerError';
  }
}

export class WorkflowError extends AppError {
  constructor(message: string, code: ErrorCode, details?: Record<string, unknown>) {
    super(message, code, details);
    this.name = 'WorkflowError';
  }
}

/** Check if error is retryable */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return [
      ErrorCode.MANUS_API_ERROR,
      ErrorCode.MANUS_TIMEOUT,
      ErrorCode.CHECKER_API_ERROR,
    ].includes(error.code);
  }
  return false;
}
