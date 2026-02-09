/**
 * Tests for Storage Factory
 */

import { createSafeStorage } from '@stores/storage-factory';

describe('createSafeStorage', () => {
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
