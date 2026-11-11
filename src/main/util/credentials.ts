import { safeStorage } from 'electron';

function assertAvailable() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('系统加密能力不可用，无法安全保存凭据。');
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
    throw new Error('凭据无法解密，请重新配置数据源或模型服务。');
  }
}
