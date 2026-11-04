import { isNumericColumn, type TableField } from '../../shared/table-values';

export const MIN_COLUMN_WIDTH = 80;
export const MAX_COLUMN_WIDTH = 1000;
export const clampColumnWidth = (width: number) =>
  Math.round(Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, width)));

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
) {
  const widths = fields.map((field) => {
    const numeric = isNumericColumn(field, rows);
    const sample = rows.slice(0, 100).map((row) => textWidth(row[field.name]));
    const minimum = numeric ? 100 : /DATE|TIME/i.test(field.type || '') ? 176 : 140;
    return Math.min(
      360,
      Math.max(minimum, textWidth(field.name) + (numeric ? 52 : 32), ...sample.map((width) => width + 32)),
    );
  });
  // Give spare space to the main text column, keeping IDs, metrics and dates compact.
  const flexible = fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => !isNumericColumn(field, rows) && !/DATE|TIME|BOOL/i.test(field.type || ''))
    .sort((a, b) => widths[b.index] - widths[a.index])[0];
  const spare = available - widths.reduce((sum, width) => sum + width, 0);
  if (flexible && spare > 0)
    widths[flexible.index] = Math.min(MAX_COLUMN_WIDTH, widths[flexible.index] + spare);
  return widths;
}
