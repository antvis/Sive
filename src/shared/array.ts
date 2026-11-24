/**
 * Returns the last item that matches the predicate, or `undefined` if none match.
 */
export function lastOf<T>(items: readonly T[], predicate: (item: T) => boolean): T | undefined {
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (predicate(item)) return item;
  }
  return undefined;
}
