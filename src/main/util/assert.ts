export function required<T>(value: T | undefined, message: string): T {
  if (!value) throw new Error(message);
  return value;
}
