/**
 * Storage Factory
 *
 * Creates a safe localStorage wrapper for zustand persist middleware.
 * Falls back to in-memory storage when localStorage is unavailable
 * (e.g., SSR, private browsing, or testing environments).
 */

export interface SafeStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

function isLocalStorageAvailable(): boolean {
  try {
    const key = '__bl_storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function createSafeStorage(): SafeStorage {
  if (isLocalStorageAvailable()) {
    return {
      getItem: (name) => localStorage.getItem(name),
      setItem: (name, value) => localStorage.setItem(name, value),
      removeItem: (name) => localStorage.removeItem(name),
    };
  }

  // In-memory fallback
  const store = new Map<string, string>();
  return {
    getItem: (name) => store.get(name) ?? null,
    setItem: (name, value) => store.set(name, value),
    removeItem: (name) => store.delete(name),
  };
}
