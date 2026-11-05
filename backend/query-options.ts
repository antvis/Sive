// Avoid AVA's default 200-row / 1 MiB result budgets. AVA still enforces
// its own 1,000,000-row and 1 MiB-per-field limits.
export const queryOptions = {
  maxRows: Number.MAX_SAFE_INTEGER,
  maxResultBytes: Number.MAX_SAFE_INTEGER,
};
