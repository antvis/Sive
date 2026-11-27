import { i18n } from './i18n';
import { writeFile } from 'node:fs/promises';
import { ClipboardItem, clipboard, dialog, nativeImage } from 'electron';
import type { BrowserWindow } from 'electron';
import { snippetExportSchema } from '@shared/api';
import type { SnippetExportInput } from '@shared/api';

export async function exportSnippet(input: SnippetExportInput, parent: BrowserWindow) {
  const { image, title, target } = snippetExportSchema.parse(input);
  const png = nativeImage.createFromBuffer(Buffer.from(image));
  if (png.isEmpty()) throw new Error(i18n('errors.snippet.imageUnreadable'));

  if (target === 'clipboard') {
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png.toPNG())]) })]);
    return true;
  }

  const name = title
    .replace(/[<>:"/\\|?*\p{Cc}]/gu, ' ')
    .trim()
    .slice(0, 80)
    .trim();
  const result = await dialog.showSaveDialog(parent, {
    title: i18n('snippet.export.saveDialogTitle'),
    defaultPath: `Snippet${name ? ` - ${name}` : ''}.png`,
    filters: [{ name: i18n('snippet.export.pngFilter'), extensions: ['png'] }],
  });
  if (result.canceled || !result.filePath) return false;

  await writeFile(result.filePath, png.toPNG());
  return true;
}
