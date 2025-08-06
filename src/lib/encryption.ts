// src/lib/encryption.ts
import crypto from 'crypto';
import { z } from 'zod';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// Environment variables for encryption
const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || 'your-master-key-change-in-production-must-be-32-chars';
const KEY_ROTATION_INTERVAL = parseInt(process.env.KEY_ROTATION_INTERVAL || '86400000'); // 24 hours in ms

interface EncryptedData {
  data: string;
  iv: string;
  keyId: string;
  algorithm: string;
  timestamp: number;
}

interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: Date;
  expiresAt: Date;
  active: boolean;
}

class KeyManager {
  private keys = new Map<string, EncryptionKey>();
  private currentKeyId: string | null = null;

  constructor() {
    this.generateInitialKey();
    
    // Rotate keys periodically
    setInterval(() => this.rotateKeys(), KEY_ROTATION_INTERVAL);
  }

  private generateInitialKey(): void {
    const keyId = this.generateKeyId();
    const key = this.deriveKey(MASTER_KEY, keyId);
    
    const encryptionKey: EncryptionKey = {
      id: keyId,
      key,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + KEY_ROTATION_INTERVAL * 2), // Keep for 2 rotation periods
      active: true
    };

    this.keys.set(keyId, encryptionKey);
    this.currentKeyId = keyId;
  }

  private generateKeyId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private deriveKey(masterKey: string, keyId: string): Buffer {
    // Use PBKDF2 to derive encryption key from master key and key ID
    return crypto.pbkdf2Sync(masterKey, keyId, 100000, KEY_LENGTH, 'sha256');
  }

  getCurrentKey(): EncryptionKey | null {
    if (!this.currentKeyId) return null;
    return this.keys.get(this.currentKeyId) || null;
  }

  getKey(keyId: string): EncryptionKey | null {
    return this.keys.get(keyId) || null;
  }

  rotateKeys(): void {
    console.log('Rotating encryption keys...');
    
    // Mark current key as inactive
    if (this.currentKeyId) {
      const currentKey = this.keys.get(this.currentKeyId);
      if (currentKey) {
        currentKey.active = false;
      }
    }

    // Generate new key
    const newKeyId = this.generateKeyId();
    const newKey = this.deriveKey(MASTER_KEY, newKeyId);
    
    const encryptionKey: EncryptionKey = {
      id: newKeyId,
      key: newKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + KEY_ROTATION_INTERVAL * 2),
      active: true
    };

    this.keys.set(newKeyId, encryptionKey);
    this.currentKeyId = newKeyId;

    // Clean up expired keys
    this.cleanupExpiredKeys();
  }

  private cleanupExpiredKeys(): void {
    const now = new Date();
    for (const [keyId, key] of this.keys.entries()) {
      if (now > key.expiresAt) {
        this.keys.delete(keyId);
        console.log(`Cleaned up expired encryption key: ${keyId}`);
      }
    }
  }

  getAllActiveKeys(): EncryptionKey[] {
    return Array.from(this.keys.values()).filter(key => !key.active || new Date() <= key.expiresAt);
  }
}

const keyManager = new KeyManager();

// Encryption functions
export const encrypt = (plaintext: string): EncryptedData => {
  const currentKey = keyManager.getCurrentKey();
  if (!currentKey) {
    throw new Error('No encryption key available');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, currentKey.key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    data: encrypted,
    iv: iv.toString('hex'),
    keyId: currentKey.id,
    algorithm: ALGORITHM,
    timestamp: Date.now()
  };
};

export const decrypt = (encryptedData: EncryptedData): string => {
  const key = keyManager.getKey(encryptedData.keyId);
  if (!key) {
    throw new Error(`Encryption key not found: ${encryptedData.keyId}`);
  }

  const iv = Buffer.from(encryptedData.iv, 'hex');
  const decipher = crypto.createDecipheriv(encryptedData.algorithm, key.key, iv);

  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// Utility functions for common data types
export const encryptObject = (obj: any): string => {
  const jsonString = JSON.stringify(obj);
  const encrypted = encrypt(jsonString);
  return JSON.stringify(encrypted);
};

export const decryptObject = <T = any>(encryptedString: string): T => {
  const encryptedData = JSON.parse(encryptedString) as EncryptedData;
  const decryptedString = decrypt(encryptedData);
  return JSON.parse(decryptedString);
};

export const encryptSensitiveFields = (obj: any, sensitiveFields: string[]): any => {
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encryptObject(result[field]);
    }
  }
  
  return result;
};

export const decryptSensitiveFields = (obj: any, sensitiveFields: string[]): any => {
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    if (result[field] !== undefined && result[field] !== null) {
      try {
        result[field] = decryptObject(result[field]);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        result[field] = null;
      }
    }
  }
  
  return result;
};

// Hash functions for passwords and sensitive data
export const hashSensitiveData = (data: string, salt?: string): { hash: string; salt: string } => {
  const actualSalt = salt || crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha256').toString('hex');
  
  return { hash, salt: actualSalt };
};

export const verifySensitiveData = (data: string, hash: string, salt: string): boolean => {
  const { hash: computedHash } = hashSensitiveData(data, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
};

// Secure random token generation
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateSecureId = (): string => {
  return crypto.randomUUID();
};

// Data masking for logging
export const maskSensitiveData = (data: any, fieldsToMask: string[] = ['password', 'token', 'secret', 'key']): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, fieldsToMask));
  }

  const masked = { ...data };
  
  for (const [key, value] of Object.entries(masked)) {
    const lowerKey = key.toLowerCase();
    
    if (fieldsToMask.some(field => lowerKey.includes(field.toLowerCase()))) {
      if (typeof value === 'string' && value.length > 0) {
        masked[key] = '[MASKED]';
      } else {
        masked[key] = '[MASKED]';
      }
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, fieldsToMask);
    }
  }
  
  return masked;
};

// Validation schemas for encrypted data
export const EncryptedDataSchema = z.object({
  data: z.string(),
  iv: z.string(),
  keyId: z.string(),
  algorithm: z.string(),
  timestamp: z.number()
});

// Key management API
export const getKeyInfo = () => {
  const currentKey = keyManager.getCurrentKey();
  const allKeys = keyManager.getAllActiveKeys();
  
  return {
    currentKeyId: currentKey?.id || null,
    currentKeyCreatedAt: currentKey?.createdAt || null,
    currentKeyExpiresAt: currentKey?.expiresAt || null,
    totalActiveKeys: allKeys.length,
    nextRotation: currentKey ? new Date(currentKey.createdAt.getTime() + KEY_ROTATION_INTERVAL) : null
  };
};

export const forceKeyRotation = (): void => {
  keyManager.rotateKeys();
};

// Secure comparison function
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// Export key manager for advanced usage
export { keyManager };