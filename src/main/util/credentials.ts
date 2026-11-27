import { i18n } from './i18n';
import { safeStorage } from 'electron';

function assertAvailable() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(i18n('errors.credentials.encryptionUnavailable'));
  }
}

export function encrypt(value: string) {
  assertAvailable();
  return safeStorage.encryptString(value).toString('base64');
}

export function decrypt(value: string) {
  assertAvailable();
  try {
    return safeStorage.decryptString(Buffer.from(value, 'base64'));
  } catch {
    throw new Error(i18n('errors.credentials.decryptionFailed'));
  }
}
