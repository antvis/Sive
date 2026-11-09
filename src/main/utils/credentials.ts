import { safeStorage } from 'electron';
import { WorkbenchError } from '../../shared/errors';

export const encrypt = (s: string) => {
  if (
    !safeStorage.isEncryptionAvailable() ||
    (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
  )
    throw new WorkbenchError('CREDENTIALS', '系统安全存储不可用，无法保存密钥');
  return safeStorage.encryptString(s).toString('base64');
};
export const decrypt = (s: string) => safeStorage.decryptString(Buffer.from(s, 'base64'));
