export type TableField = { name: string; type?: string };

// Compare decimal strings without losing BIGINT/DECIMAL precision through Number().
function numeric(value: unknown) {
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
  const values = rows
    .map((row) => row[field.name])
    .filter((value) => value !== null && value !== undefined && value !== '');
  return values.length > 0 && values.every((value) => numeric(value) !== null);
}

export function compareNumeric(a: unknown, b: unknown, order?: 'ascend' | 'descend' | null) {
  const left = numeric(a),
    right = numeric(b);
  // The grid reverses the comparator for descending. Keep missing/invalid values last in both orders.
  if (!left || !right) return (left ? -1 : right ? 1 : 0) * (order === 'descend' ? -1 : 1);
  if (left.sign !== right.sign) return left.sign - right.sign;
  if (!left.sign) return 0;
  const magnitude = Math.sign(left.magnitude - right.magnitude);
  const length = Math.max(left.digits.length, right.digits.length);
  const l = left.digits.padEnd(length, '0'),
    r = right.digits.padEnd(length, '0');
  return (magnitude || (l < r ? -1 : l > r ? 1 : 0)) * left.sign;
}
