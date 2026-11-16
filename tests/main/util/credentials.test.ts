import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ available: true }));

// safeStorage is only available inside Electron; emulate a base64-encoded round-trip.
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => state.available,
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`),
    decryptString: (value: Buffer) => {
      const text = value.toString();
      if (!text.startsWith('encrypted:')) throw new Error('invalid ciphertext');
      return text.slice('encrypted:'.length);
    },
  },
}));

import { decrypt, encrypt } from '../../../src/main/util/credentials';

describe('credentials', () => {
  beforeEach(() => {
    state.available = true;
  });

  afterEach(() => {
    state.available = true;
  });

  it('encrypts a value into base64 text', () => {
    expect(encrypt('secret')).toBe(Buffer.from('encrypted:secret').toString('base64'));
  });

  it('round-trips a value through encrypt and decrypt', () => {
    expect(decrypt(encrypt('secret'))).toBe('secret');
  });

  it('throws when system encryption is unavailable', () => {
    state.available = false;

    expect(() => encrypt('secret')).toThrow('系统加密能力不可用');
    expect(() => decrypt('c2VjcmV0')).toThrow('系统加密能力不可用');
  });

  it('throws a friendly error when the ciphertext cannot be decrypted', () => {
    expect(() => decrypt(Buffer.from('garbage').toString('base64'))).toThrow(
      '凭据无法解密，请重新配置数据源或模型服务。',
    );
  });
});
