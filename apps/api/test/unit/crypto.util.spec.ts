import { randomBytes } from 'node:crypto';
import { encrypt, decrypt, parseMasterKey } from '../../src/tenants/secrets/crypto.util';

describe('AES-256-GCM crypto', () => {
  const masterKey = randomBytes(32);

  it('encrypts and decrypts round-trip', () => {
    const plaintext = 'my-super-secret-tenant-key-12345';
    const encrypted = encrypt(plaintext, masterKey);
    const decrypted = decrypt(encrypted, masterKey);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for same plaintext (random IV)', () => {
    const plaintext = 'same-input';
    const enc1 = encrypt(plaintext, masterKey);
    const enc2 = encrypt(plaintext, masterKey);
    expect(enc1).not.toBe(enc2); // Different IVs
  });

  it('fails to decrypt with wrong master key', () => {
    const plaintext = 'secret-data';
    const encrypted = encrypt(plaintext, masterKey);
    const wrongKey = randomBytes(32);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it('handles empty string', () => {
    const encrypted = encrypt('', masterKey);
    const decrypted = decrypt(encrypted, masterKey);
    expect(decrypted).toBe('');
  });

  it('handles unicode content', () => {
    const plaintext = 'Olá mundo! 🌍 Segredo especial: ação';
    const encrypted = encrypt(plaintext, masterKey);
    const decrypted = decrypt(encrypted, masterKey);
    expect(decrypted).toBe(plaintext);
  });
});

describe('parseMasterKey', () => {
  it('parses valid 64-char hex string', () => {
    const hex = 'a'.repeat(64);
    const buf = parseMasterKey(hex);
    expect(buf.length).toBe(32);
  });

  it('throws on invalid length', () => {
    expect(() => parseMasterKey('short')).toThrow('64 hex characters');
  });
});
