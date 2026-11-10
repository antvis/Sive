// Local result storage and model context have separate budgets.
export const QUERY_OPTIONS = {
  maxRows: 10000,
  maxResultBytes: 4 * 1024 * 1024,
};

// AVA's internal loop feeds each query result back to the model.
export const LOOP_QUERY_OPTIONS = { maxRows: 100, maxResultBytes: 32 * 1024 };
