const DRAFT_PREFIX = "cms_draft:";
const ORIGINAL_PREFIX = "cms_original:";

/**
 * Save a draft to localStorage.
 */
export function saveDraft(key: string, data: unknown): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(data));
  } catch {
    // localStorage might be full or unavailable
    console.warn(`Failed to save draft for key "${key}"`);
  }
}

/**
 * Load a draft from localStorage.
 * Returns parsed data or null if no draft exists.
 */
export function loadDraft<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Check if a draft exists for the given key.
 */
export function hasDraft(key: string): boolean {
  return localStorage.getItem(DRAFT_PREFIX + key) !== null;
}

/**
 * Remove a draft for the given key.
 */
export function clearDraft(key: string): void {
  localStorage.removeItem(DRAFT_PREFIX + key);
  localStorage.removeItem(ORIGINAL_PREFIX + key);
}

/**
 * Remove all drafts and originals from localStorage.
 */
export function clearAllDrafts(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith(DRAFT_PREFIX) || k.startsWith(ORIGINAL_PREFIX))) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Store the original (server) version of data for diff comparison.
 * Called when data is first loaded from GitHub.
 */
export function setOriginal(key: string, data: unknown): void {
  try {
    localStorage.setItem(ORIGINAL_PREFIX + key, JSON.stringify(data));
  } catch {
    console.warn(`Failed to save original for key "${key}"`);
  }
}

/**
 * Get the list of keys that have drafts differing from the original version.
 * Compares JSON serialization of draft vs original.
 */
export function getDirtyKeys(): string[] {
  const dirty: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const storageKey = localStorage.key(i);
    if (!storageKey || !storageKey.startsWith(DRAFT_PREFIX)) continue;

    const key = storageKey.slice(DRAFT_PREFIX.length);
    const draftRaw = localStorage.getItem(DRAFT_PREFIX + key);
    const originalRaw = localStorage.getItem(ORIGINAL_PREFIX + key);

    if (draftRaw !== originalRaw) {
      dirty.push(key);
    }
  }

  return dirty;
}

/**
 * Get the list of content file paths that have unsaved changes.
 * Returns keys that have drafts differing from the original version.
 * Used by the Publish flow to determine which files need committing.
 */
export function getChangedFiles(): string[] {
  return getDirtyKeys();
}

/**
 * Remove the cached original for a specific key.
 */
export function invalidateOriginal(key: string): void {
  localStorage.removeItem(ORIGINAL_PREFIX + key);
}
