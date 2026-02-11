/**
 * Storage Factory (REQ-STATE-010)
 *
 * Creates a safe localStorage wrapper for zustand persist middleware.
 * Falls back to in-memory storage when localStorage is unavailable
 * (e.g., SSR, private browsing, or testing environments).
 *
 * Exposes isMemoryFallback() so the UI can display a WARN-severity
 * ErrorBanner when persistence is unavailable.
 */

export interface SafeStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

let _isMemoryFallback = false;

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

/** Returns true if createSafeStorage fell back to in-memory storage. */
export function isMemoryFallback(): boolean {
  return _isMemoryFallback;
}

/** Reset internal state (for testing only). */
export function resetStorageState(): void {
  _isMemoryFallback = false;
}

export function createSafeStorage(): SafeStorage {
  if (isLocalStorageAvailable()) {
    _isMemoryFallback = false;
    return {
      getItem: (name) => localStorage.getItem(name),
      setItem: (name, value) => localStorage.setItem(name, value),
      removeItem: (name) => localStorage.removeItem(name),
    };
  }

  // In-memory fallback (REQ-ERR-018: log WARN on fallback activation)
  _isMemoryFallback = true;
  console.warn('Browser storage unavailable -- falling back to in-memory storage. Data will not persist between sessions.');
  const store = new Map<string, string>();
  return {
    getItem: (name) => store.get(name) ?? null,
    setItem: (name, value) => store.set(name, value),
    removeItem: (name) => store.delete(name),
  };
}
