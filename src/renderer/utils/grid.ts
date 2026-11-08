import type { TableField } from '@shared/tableValues';
import { compareNumeric } from '@shared/tableValues';
import type { ColumnDef, SortingState } from '@tanstack/react-table';

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
        sorting.find((item) => item.id === id)?.desc ? 'descend' : 'ascend',
      ),
  }));
}

function textWidth(value: unknown) {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
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
    const minimum = numeric ? 100 : /DATE|TIME/i.test(field.type || '') ? 176 : 140;
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
