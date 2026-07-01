import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdentityManager } from '../src/identity';
import nacl from 'tweetnacl';
import { decodeBase64, encodeBase64, decodeUTF8 } from 'tweetnacl-util';

describe('IdentityManager', () => {
  let manager: IdentityManager;
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    manager = new IdentityManager();
    mockStorage = {};

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should generate a new identity if none exists in localStorage', async () => {
    const publicKeyBase64 = await manager.loadOrCreateIdentity();

    expect(mockStorage['__asstro_identity_sk__']).toBeDefined();
    expect(publicKeyBase64).toBeDefined();
    expect(typeof publicKeyBase64).toBe('string');
  });

  it('should load an existing identity from localStorage', async () => {
    const keyPair = nacl.sign.keyPair();
    const secretKeyBase64 = encodeBase64(keyPair.secretKey);
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);

    mockStorage['__asstro_identity_sk__'] = secretKeyBase64;

    const loadedPublicKey = await manager.loadOrCreateIdentity();

    expect(loadedPublicKey).toBe(publicKeyBase64);
  });

  it('should throw an error when sign is called without loading identity', () => {
    expect(() => manager.sign('test message')).toThrowError('Identity not loaded');
  });

  it('should throw an error when getPublicKey is called without loading identity', () => {
    expect(() => manager.getPublicKey()).toThrowError('Identity not loaded');
  });

  it('should correctly sign a message and return the signature', async () => {
    const publicKeyBase64 = await manager.loadOrCreateIdentity();

    const message = 'hello world';
    const signatureBase64 = manager.sign(message);

    expect(signatureBase64).toBeDefined();

    // Verify the signature using tweetnacl
    const signature = decodeBase64(signatureBase64);
    const messageBytes = decodeUTF8(message);
    const publicKey = decodeBase64(publicKeyBase64);

    const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKey);
    expect(isValid).toBe(true);
  });

  it('should return the correct public key after loading', async () => {
    const publicKeyBase64 = await manager.loadOrCreateIdentity();

    const returnedKey = manager.getPublicKey();
    expect(returnedKey).toBe(publicKeyBase64);
  });
});
