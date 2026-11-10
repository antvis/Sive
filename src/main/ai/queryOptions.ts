// Bound direct SQL reads used by data preparation and saved-snippet refresh.
export const QUERY_OPTIONS = {
  maxRows: 10000,
  maxResultBytes: 4 * 1024 * 1024,
};
