import { writeFile } from 'node:fs/promises';
import { ClipboardItem, clipboard, dialog, nativeImage } from 'electron';
import type { BrowserWindow } from 'electron';
import { snippetExportSchema } from '@shared/api';
import type { SnippetExportInput } from '@shared/api';

export async function exportSnippet(input: SnippetExportInput, parent: BrowserWindow) {
  const { image, title, target } = snippetExportSchema.parse(input);
  const png = nativeImage.createFromBuffer(Buffer.from(image));
  if (png.isEmpty()) throw new Error('无法读取 Snippet 图片，请重新生成。');

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
    title: '保存 Snippet 图片',
    defaultPath: `Snippet${name ? ` - ${name}` : ''}.png`,
    filters: [{ name: 'PNG 图片', extensions: ['png'] }],
  });
  if (result.canceled || !result.filePath) return false;

  await writeFile(result.filePath, png.toPNG());
  return true;
}
