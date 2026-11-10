// Leave room below common 255-byte filename limits, including the extension.
// Count UTF-8 bytes: 100 Chinese characters can already exceed that limit.
export function exportFilename(title: string, format: 'html' | 'pdf' | 'png') {
  const extension = `.${format}`;
  const cleaned = title
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\x00-\x1f\x7f-\x9f]/g, '_')
    .trim();
  let name = '';
  let bytes = Buffer.byteLength(extension, 'utf8');
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(cleaned)) {
    const size = Buffer.byteLength(segment, 'utf8');
    // Reserve one byte for the reserved-name prefix below.
    if (bytes + size > 179) break;
    name += segment;
    bytes += size;
  }
  name =
    name
      .replace(/[. ]+$/g, '')
      .replace(/^\.+/, '')
      .trim() || 'Sive-分析';
  // Windows reserves these names even when followed by an extension.
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name)) name = `_${name}`;
  return name + extension;
}
