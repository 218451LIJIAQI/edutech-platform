import CryptoJS from 'crypto-js';

/**
 * Encryption Utility
 * Provides AES encryption/decryption for sensitive data
 * Used for wallet info, bank details, and other sensitive fields
 */

// Encryption key from environment (should be 32+ characters)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-min-32-chars!!';

// Ensure key is at least 32 characters
if (ENCRYPTION_KEY.length < 32) {
  console.warn('WARNING: ENCRYPTION_KEY should be at least 32 characters for security');
}

/**
 * Encrypt sensitive data using AES-256
 * @param data - Plain text data to encrypt
 * @returns Encrypted string (Base64 encoded)
 */
export const encrypt = (data: string): string => {
  if (!data) return '';
  
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY);
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt encrypted data
 * @param encryptedData - Encrypted string (Base64 encoded)
 * @returns Decrypted plain text
 */
export const decrypt = (encryptedData: string): string => {
  if (!encryptedData) return '';
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const plainText = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!plainText) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
    
    return plainText;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Encrypt an object (converts to JSON first)
 * @param obj - Object to encrypt
 * @returns Encrypted string
 */
export const encryptObject = <T extends object>(obj: T): string => {
  return encrypt(JSON.stringify(obj));
};

/**
 * Decrypt to an object
 * @param encryptedData - Encrypted string
 * @returns Decrypted object
 */
export const decryptObject = <T extends object>(encryptedData: string): T => {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted) as T;
};

/**
 * Hash sensitive data (one-way, for comparison purposes)
 * @param data - Data to hash
 * @returns SHA-256 hash
 */
export const hash = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

/**
 * Generate a random encryption key
 * @param length - Key length in bytes (default 32 for AES-256)
 * @returns Random hex string
 */
export const generateKey = (length: number = 32): string => {
  return CryptoJS.lib.WordArray.random(length).toString();
};

/**
 * Mask sensitive data for display (e.g., bank account numbers)
 * @param data - Data to mask
 * @param visibleChars - Number of characters to show at the end
 * @returns Masked string
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (!data || data.length <= visibleChars) return data;
  
  const masked = '*'.repeat(data.length - visibleChars);
  const visible = data.slice(-visibleChars);
  return masked + visible;
};

/**
 * Encrypt bank information
 */
export interface BankInfo {
  accountNumber: string;
  routingNumber?: string;
  bankName: string;
  accountHolderName: string;
}

export const encryptBankInfo = (bankInfo: BankInfo): string => {
  return encryptObject(bankInfo);
};

export const decryptBankInfo = (encryptedData: string): BankInfo => {
  return decryptObject<BankInfo>(encryptedData);
};

/**
 * Secure comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns Boolean indicating equality
 */
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

/**
 * Field-level encryption decorator for Prisma
 * Usage in services: encryptField('accountNumber', data)
 */
export const encryptField = <T extends Record<string, unknown>>(
  fieldName: keyof T,
  data: T
): T => {
  if (data[fieldName] && typeof data[fieldName] === 'string') {
    return {
      ...data,
      [fieldName]: encrypt(data[fieldName] as string),
    };
  }
  return data;
};

export const decryptField = <T extends Record<string, unknown>>(
  fieldName: keyof T,
  data: T
): T => {
  if (data[fieldName] && typeof data[fieldName] === 'string') {
    return {
      ...data,
      [fieldName]: decrypt(data[fieldName] as string),
    };
  }
  return data;
};

export default {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  hash,
  generateKey,
  maskSensitiveData,
  encryptBankInfo,
  decryptBankInfo,
  secureCompare,
  encryptField,
  decryptField,
};
