import BigNumber from 'bignumber.js';

export type TableColumn = { name: string; type?: string };

export function tableValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object')
    return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? String(item) : item));
  return String(value);
}

// Keep BIGINT and DECIMAL values precise instead of coercing them through Number().
function numericValue(value: unknown) {
  if (!['number', 'string', 'bigint'].includes(typeof value)) return null;
  const number = new BigNumber(String(value));
  return number.isFinite() ? number : null;
}

export function isNumericColumn(column: TableColumn) {
  return (
    /^(?:(?:U)?(?:TINY|SMALL|MEDIUM|BIG|HUGE)?INT(?:EGER)?|INT\d+|UINT\d+|DECIMAL|NUMERIC|NUMBER|FLOAT\d*|DOUBLE(?: PRECISION)?|REAL)(?:\b|\()/i.test(
      column.type ?? '',
    ) && !/[[\]<>]/.test(column.type ?? '')
  );
}

export function compareTableValues(a: unknown, b: unknown, numeric: boolean, descending: boolean) {
  const direction = descending ? -1 : 1;
  if (numeric) {
    const left = numericValue(a),
      right = numericValue(b);
    if (!left || !right) return left ? -1 : right ? 1 : 0;
    return left.comparedTo(right)! * direction;
  }
  // Nulls stay at the end in both directions.
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
  return tableValue(a).localeCompare(tableValue(b), 'zh-CN') * direction;
}
