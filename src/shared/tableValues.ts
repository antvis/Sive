export type TableField = { name: string; type?: string };

// Compare decimal strings without losing BIGINT/DECIMAL precision through Number().
export function numericValue(value: unknown) {
  if (!['number', 'string', 'bigint'].includes(typeof value)) return null;
  const match = String(value)
    .trim()
    .match(/^([+-]?)(\d*\.?\d+)(?:e([+-]?\d+))?$/i);
  if (!match) return null;
  const [integer, fraction = ''] = match[2].split('.');
  const digits = (integer + fraction).replace(/^0+/, '');
  const exponent = Number(match[3] || 0);
  if (!Number.isSafeInteger(exponent)) return null;
  return {
    sign: !digits ? 0 : match[1] === '-' ? -1 : 1,
    digits: digits.replace(/0+$/, ''),
    magnitude: digits.length - fraction.length + exponent,
  };
}

export function isNumericColumn(field: TableField, rows: Record<string, unknown>[]) {
  if (field.type) {
    return (
      /^(?:(?:U)?(?:TINY|SMALL|MEDIUM|BIG|HUGE)?INT(?:EGER)?|INT\d+|UINT\d+|DECIMAL|NUMERIC|NUMBER|FLOAT\d*|DOUBLE(?: PRECISION)?|REAL)(?:\b|\()/i.test(
        field.type.trim(),
      ) && !/[\[\]<>]/.test(field.type)
    );
  }
  let hasValue = false;
  for (const row of rows) {
    const value = row[field.name];
    if (value === null || value === undefined || value === '') continue;
    if (numericValue(value) === null) return false;
    hasValue = true;
  }
  return hasValue;
}
