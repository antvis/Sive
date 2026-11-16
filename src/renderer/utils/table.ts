import BigNumber from 'bignumber.js';
import type { Profile } from '@antv/ava';

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

export function compareTableColumn(
  a: unknown,
  b: unknown,
  column: Profile['models'][number]['columns'][number] | undefined,
  descending: boolean,
) {
  const direction = descending ? -1 : 1;

  if (column?.properties.logicalType === 'numeric') {
    const [left, right] = [numericValue(a), numericValue(b)];

    if (!left || !right) return left ? -1 : right ? 1 : 0;
    return left.comparedTo(right)! * direction;
  }

  // Nulls stay at the end in both directions.
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
  return tableValue(a).localeCompare(tableValue(b), 'zh-CN') * direction;
}
