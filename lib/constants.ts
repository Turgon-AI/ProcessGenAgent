// Application-wide constants

// Workflow limits
export const MAX_ITERATIONS_LIMIT = 50;
export const MIN_ITERATIONS = 1;
export const DEFAULT_MAX_ITERATIONS = 20;
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;

// API configuration
export const MANUS_API_TIMEOUT_MS = 300000; // 5 minutes
export const CHECKER_API_TIMEOUT_MS = 60000; // 1 minute
export const API_RETRY_COUNT = 3;
export const API_RETRY_DELAY_MS = 1000;

// File storage
export const FILE_EXPIRATION_HOURS = 24;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_INPUT_FILES = 10;
export const MAX_SAMPLE_FILES = 5;

// SSE
export const SSE_HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
