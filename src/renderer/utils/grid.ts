import type { TableField } from '@shared/tableValues';
import { numericValue, tableValue } from '@shared/tableValues';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

function compareNumeric(a: unknown, b: unknown, descending: boolean) {
  const left = numericValue(a),
    right = numericValue(b);
  // The grid reverses the comparator for descending. Keep missing/invalid values last in both orders.
  if (!left && !right) return 0;
  if (!left) return descending ? -1 : 1;
  if (!right) return descending ? 1 : -1;
  if (left.sign !== right.sign) return left.sign - right.sign;
  if (!left.sign) return 0;
  const magnitude = Math.sign(left.magnitude - right.magnitude);
  if (magnitude) return magnitude * left.sign;
  const length = Math.max(left.digits.length, right.digits.length);
  const l = left.digits.padEnd(length, '0'),
    r = right.digits.padEnd(length, '0');
  if (l === r) return 0;
  return (l > r ? 1 : -1) * left.sign;
}

export const MIN_COLUMN_WIDTH = 80;

export const MAX_COLUMN_WIDTH = 1000;

export const clampColumnWidth = (width: number) =>
  Math.round(Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width)));

export function gridColumns(
  fields: TableField[],
  widths: number[],
  numeric: ReadonlySet<string>,
  sorting: SortingState,
): ColumnDef<Record<string, unknown>>[] {
  return fields.map(({ name }, index) => ({
    id: name,
    header: name,
    // Accessor functions preserve literal field names containing dots.
    accessorFn: (row) => row[name],
    size: widths[index],
    minSize: MIN_COLUMN_WIDTH,
    maxSize: MAX_COLUMN_WIDTH,
    enableSorting: numeric.has(name),
    sortDescFirst: false,
    sortUndefined: false,
    sortingFn: (left, right, id) =>
      compareNumeric(
        left.getValue(id),
        right.getValue(id),
        sorting.find((item) => item.id === id)?.desc ?? false,
      ),
  }));
}

function textWidth(value: unknown) {
  const text = tableValue(value, '');
  return Array.from(text.slice(0, 100)).reduce(
    (width, char) => width + (char.charCodeAt(0) > 255 ? 13 : 7),
    0,
  );
}

export function contentColumnWidths(
  fields: TableField[],
  rows: Record<string, unknown>[],
  available: number,
  numericColumns: ReadonlySet<string>,
) {
  const sample = rows.slice(0, 100);
  const widths = fields.map((field) => {
    const numeric = numericColumns.has(field.name);
    let minimum = /DATE|TIME/i.test(field.type || '') ? 176 : 140;
    if (numeric) minimum = 100;
    return Math.min(
      360,
      Math.max(
        minimum,
        textWidth(field.name) + (numeric ? 52 : 32),
        ...sample.map((row) => textWidth(row[field.name]) + 32),
      ),
    );
  });
  // Give spare space to the main text column, keeping IDs, metrics and dates compact.
  const flexible = fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => !numericColumns.has(field.name) && !/DATE|TIME|BOOL/i.test(field.type || ''))
    .sort((a, b) => widths[b.index] - widths[a.index])[0];
  const spare = available - widths.reduce((sum, width) => sum + width, 0);
  if (flexible && spare > 0)
    widths[flexible.index] = Math.min(MAX_COLUMN_WIDTH, widths[flexible.index] + spare);
  return widths;
}
