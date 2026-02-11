// @vitest-environment jsdom
/**
 * Tests for Storage Factory (REQ-STATE-010)
 *
 * Verifies safe localStorage wrapper with in-memory fallback
 * and isMemoryFallback detection flag.
 */

import { createSafeStorage, isMemoryFallback, resetStorageState } from '@stores/storage-factory';

describe('createSafeStorage', () => {
  afterEach(() => {
    resetStorageState();
  });

  it('returns an object with getItem, setItem, removeItem', () => {
    const storage = createSafeStorage();
    expect(typeof storage.getItem).toBe('function');
    expect(typeof storage.setItem).toBe('function');
    expect(typeof storage.removeItem).toBe('function');
  });

  it('can store and retrieve values', () => {
    const storage = createSafeStorage();
    storage.setItem('test-key', 'test-value');
    expect(storage.getItem('test-key')).toBe('test-value');
  });

  it('returns null for missing keys', () => {
    const storage = createSafeStorage();
    expect(storage.getItem('nonexistent')).toBeNull();
  });

  it('can remove items', () => {
    const storage = createSafeStorage();
    storage.setItem('to-remove', 'value');
    storage.removeItem('to-remove');
    expect(storage.getItem('to-remove')).toBeNull();
  });
});

describe('isMemoryFallback (REQ-STATE-010)', () => {
  afterEach(() => {
    resetStorageState();
  });

  it('returns false when localStorage is available', () => {
    createSafeStorage();
    expect(isMemoryFallback()).toBe(false);
  });

  it('returns true when localStorage throws', () => {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new DOMException('Storage disabled', 'SecurityError');
      },
      configurable: true,
    });

    try {
      createSafeStorage();
      expect(isMemoryFallback()).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });

  it('memory fallback storage still works correctly', () => {
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new DOMException('Storage disabled', 'SecurityError');
      },
      configurable: true,
    });

    try {
      const storage = createSafeStorage();
      storage.setItem('key', 'value');
      expect(storage.getItem('key')).toBe('value');
      storage.removeItem('key');
      expect(storage.getItem('key')).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});
