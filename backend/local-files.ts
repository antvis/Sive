import { createReadStream } from 'node:fs';
import { copyFile, chmod, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export async function fingerprintFile(file: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export async function copySource(file: string, destination: string) {
  try {
    await copyFile(file, destination);
    await chmod(destination, 0o600);
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }
}
