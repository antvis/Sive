export const TASK_TIMEOUT_MS = 30 * 60 * 1000;

export const MODEL_REQUEST_TIMEOUT_MS = 3 * 60 * 1000;

export const SUGGEST_TIMEOUT_MS = 60 * 1000;

export const MODEL_TEST_TIMEOUT_MS = 30 * 1000;

export const MODEL_LIST_TIMEOUT_MS = 15 * 1000;

export const MYSQL_CONNECT_TIMEOUT_MS = 10 * 1000;

export const MYSQL_QUERY_TIMEOUT_MS = 10 * 1000;

export const MODEL_TEST_CONCURRENCY = 3;

export const AVA_ENGINE_OPTIONS = {
  memoryLimit: '512MB',
  threads: 2,
  queryTimeoutMs: 30 * 1000,
};

// Bound direct SQL reads used by data preparation and saved-snippet refresh.
export const QUERY_OPTIONS = {
  maxRows: 10000,
  maxResultBytes: 4 * 1024 * 1024,
};

export const RECENT_TURN_COUNT = 4;

export const HISTORY_EXCERPT_COUNT = 4;

export const HISTORY_BUDGET_BYTES = 16000;

export const EVIDENCE_MAX_ROWS = 50;

export const EVIDENCE_MAX_BYTES = 12000;
