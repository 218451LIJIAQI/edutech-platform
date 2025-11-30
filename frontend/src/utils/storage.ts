/**
 * Safe localStorage wrapper with type support and error handling
 * Handles cases where localStorage is unavailable (private browsing, etc.)
 */

/**
 * Storage configuration
 */
const STORAGE_PREFIX = 'edutech_';

/**
 * Check if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get item from localStorage with type safety
 * @param key - Storage key
 * @param defaultValue - Default value if key doesn't exist
 */
export function getItem<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue;
  
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Set item in localStorage
 * @param key - Storage key
 * @param value - Value to store
 */
export function setItem<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) return false;
  
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    return true;
  } catch {
    console.warn('Failed to save to localStorage:', key);
    return false;
  }
}

/**
 * Remove item from localStorage
 * @param key - Storage key
 */
export function removeItem(key: string): boolean {
  if (!isStorageAvailable()) return false;
  
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all items with the app prefix
 */
export function clearAll(): boolean {
  if (!isStorageAvailable()) return false;
  
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all stored keys (without prefix)
 */
export function getAllKeys(): string[] {
  if (!isStorageAvailable()) return [];
  
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key.replace(STORAGE_PREFIX, ''));
    }
  }
  return keys;
}

/**
 * Session storage wrapper
 */
export const session = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): boolean => {
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    try {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return true;
    } catch {
      return false;
    }
  },
  
  clear: (): boolean => {
    try {
      sessionStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Storage with expiration support
 */
interface StoredItem<T> {
  value: T;
  expiry: number | null;
}

export const withExpiry = {
  /**
   * Set item with expiration time
   * @param key - Storage key
   * @param value - Value to store
   * @param ttl - Time to live in milliseconds
   */
  set: <T>(key: string, value: T, ttl: number): boolean => {
    const item: StoredItem<T> = {
      value,
      expiry: Date.now() + ttl,
    };
    return setItem(key, item);
  },
  
  /**
   * Get item, returns null if expired
   * @param key - Storage key
   */
  get: <T>(key: string): T | null => {
    const item = getItem<StoredItem<T> | null>(key, null);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      removeItem(key);
      return null;
    }
    
    return item.value;
  },
};

// Default export for simple usage
export default {
  get: getItem,
  set: setItem,
  remove: removeItem,
  clear: clearAll,
  keys: getAllKeys,
  session,
  withExpiry,
  isAvailable: isStorageAvailable,
};
