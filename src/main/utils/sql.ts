export function identifier(s: string) {
  return '"' + s.replaceAll('"', '""') + '"';
}
