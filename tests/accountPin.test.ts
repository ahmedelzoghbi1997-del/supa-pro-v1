import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, isLegacyPinHash } from '../lib/accountManager';

describe('Account PIN Management (PBKDF2 with Salt)', () => {
  it('hashes a PIN in the pbkdf2$100000$salt$hash format', async () => {
    const pin = '123456';
    const hash = await hashPin(pin);

    expect(hash).toMatch(/^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  });

  it('generates distinct salts and hashes for the same PIN on multiple calls', async () => {
    const pin = '4321';
    const hash1 = await hashPin(pin);
    const hash2 = await hashPin(pin);

    expect(hash1).not.toBe(hash2);

    // Both distinct hashes should successfully verify the correct PIN
    expect(await verifyPin(pin, hash1)).toBe(true);
    expect(await verifyPin(pin, hash2)).toBe(true);
  });

  it('successfully verifies the correct PIN', async () => {
    const pin = '987654';
    const hash = await hashPin(pin);

    const isValid = await verifyPin('987654', hash);
    expect(isValid).toBe(true);
  });

  it('rejects an incorrect PIN', async () => {
    const pin = '112233';
    const hash = await hashPin(pin);

    const isWrongValid = await verifyPin('112234', hash);
    expect(isWrongValid).toBe(false);
  });

  it('strictly rejects plain-text PIN comparison', async () => {
    const plainPin = '1234';

    // Plain text matching must NEVER succeed
    const isPlainMatch = await verifyPin(plainPin, plainPin);
    expect(isPlainMatch).toBe(false);

    // Any plain text stored string must be rejected
    expect(await verifyPin('5555', '5555')).toBe(false);
  });

  it('rejects legacy SHA-256 hashes and treats them as invalid', async () => {
    // Standard 64-char SHA-256 hex string from legacy version
    const legacySha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const testPin = '1234';

    const isValid = await verifyPin(testPin, legacySha256);
    expect(isValid).toBe(false);

    // Legacy format detector
    expect(isLegacyPinHash(legacySha256)).toBe(true);
    expect(isLegacyPinHash('1234')).toBe(true);

    const modernHash = await hashPin(testPin);
    expect(isLegacyPinHash(modernHash)).toBe(false);
  });

  it('handles empty, undefined, or malformed hashes safely without crashing', async () => {
    expect(await verifyPin('', 'pbkdf2$100000$abc$def')).toBe(false);
    expect(await verifyPin('1234', undefined)).toBe(false);
    expect(await verifyPin('1234', '')).toBe(false);
    expect(await verifyPin('1234', 'pbkdf2$invalid$salt$hash')).toBe(false);
    expect(await verifyPin('1234', 'pbkdf2$100000$nothex$nothex')).toBe(false);
    expect(await verifyPin('1234', 'corrupted_hash')).toBe(false);
  });
});
