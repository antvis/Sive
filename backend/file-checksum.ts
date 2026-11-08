import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { WorkbenchError } from '../shared/errors';

export async function fileChecksum(file: string) {
  try {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return hash.digest('hex');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new WorkbenchError(
      'CONNECTION',
      code === 'ENOENT' || code === 'ENOTDIR'
        ? '源文件不存在，可能已移动、改名或删除。请重新选择源文件。'
        : '无法读取源文件，请检查文件权限，或重新选择源文件。',
    );
  }
}
