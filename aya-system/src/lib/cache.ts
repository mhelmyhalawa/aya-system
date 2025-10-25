// Generic caching utility for the application
// Layered approach: in-memory (fast, per session) + localStorage (persistent) + optional IndexedDB (large blobs)
// Features:
// - TTL support
// - Version-aware invalidation
// - Prefix-based bulk clearing
// - JSON serialization with error isolation
// - Pluggable strategies (future: IndexedDB for > size threshold)

export type CacheEntry<T = any> = {
  v: T;              // value
  t: number;         // stored timestamp (ms)
  ttl?: number;      // time-to-live in ms
  version?: string;  // version tag for invalidation
};

// In-memory map
const memory: Record<string, CacheEntry> = {};

// Namespace prefix to avoid collisions
const LS_PREFIX = 'app_cache_';

// Get full storage key
function k(key: string) { return LS_PREFIX + key; }

// Fetch current time
function now() { return Date.now(); }

// Determine if entry expired
function isExpired(entry: CacheEntry) {
  if (!entry.ttl) return false;
  return now() - entry.t > entry.ttl;
}

// Read persistent cache
function readPersistent<T>(key: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(k(key));
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (isExpired(parsed)) return null;
    return parsed;
  } catch { return null; }
}

// Write persistent cache
function writePersistent<T>(key: string, entry: CacheEntry<T>) {
  try { localStorage.setItem(k(key), JSON.stringify(entry)); } catch { /* ignore quota errors */ }
}

// Public API
export function setCache<T>(key: string, value: T, opts: { ttlMs?: number; persist?: boolean; version?: string } = {}): CacheEntry<T> {
  const entry: CacheEntry<T> = { v: value, t: now(), ttl: opts.ttlMs, version: opts.version };
  memory[key] = entry;
  if (opts.persist) writePersistent(key, entry);
  return entry;
}

export function getCache<T>(key: string, opts: { expectedVersion?: string } = {}): T | null {
  // 1. Memory first
  let entry = memory[key];
  if (entry && isExpired(entry)) { delete memory[key]; entry = undefined; }
  if (!entry) {
    // 2. Persistent fallback
    const p = readPersistent<T>(key);
    if (p) memory[key] = p; // hydrate memory
    entry = p || null;
  }
  if (!entry) return null;
  if (opts.expectedVersion && entry.version && entry.version !== opts.expectedVersion) return null;
  return entry.v as T;
}

export function hasCache(key: string): boolean {
  return getCache(key) !== null;
}

export function deleteCache(key: string) {
  delete memory[key];
  try { localStorage.removeItem(k(key)); } catch {}
}

export function clearByPrefix(prefix: string) {
  // Clear memory
  Object.keys(memory).forEach(mk => { if (mk.startsWith(prefix)) delete memory[mk]; });
  // Clear localStorage
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const sk = localStorage.key(i);
      if (!sk) continue;
      if (sk.startsWith(LS_PREFIX + prefix)) localStorage.removeItem(sk);
    }
  } catch {}
}

export function clearExpired() {
  // Memory
  Object.entries(memory).forEach(([key, entry]) => { if (isExpired(entry)) delete memory[key]; });
  // Persistent
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const sk = localStorage.key(i);
      if (!sk || !sk.startsWith(LS_PREFIX)) continue;
      try {
        const parsed: CacheEntry = JSON.parse(localStorage.getItem(sk) || 'null');
        if (parsed && isExpired(parsed)) localStorage.removeItem(sk);
      } catch { /* ignore parse errors */ }
    }
  } catch {}
}

export function invalidateVersion(version: string) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const sk = localStorage.key(i);
      if (!sk || !sk.startsWith(LS_PREFIX)) continue;
      try {
        const parsed: CacheEntry = JSON.parse(localStorage.getItem(sk) || 'null');
        if (parsed && parsed.version && parsed.version !== version) {
          localStorage.removeItem(sk);
        }
      } catch {}
    }
  } catch {}
  // Also clear mismatched memory entries
  Object.entries(memory).forEach(([key, entry]) => {
    if (entry.version && entry.version !== version) delete memory[key];
  });
}

// Type-safe suggested keys
export const CacheKeys = {
  DRIVE_IMAGES_META: 'drive_images_meta',
  DRIVE_IMAGE_DATA_PREFIX: 'drive_image_data', // use drive_image_data_<id>
  USER_PROFILE: 'user_profile',
  LABELS_AR: 'labels_ar',
} as const;

// Helper to compose per-image key
export function driveImageDataKey(id: string) {
  return `${CacheKeys.DRIVE_IMAGE_DATA_PREFIX}_${id}`;
}

// Optional placeholder for large binary via IndexedDB (future expansion)
export async function putLargeBinaryPlaceholder(key: string, _blob: Blob): Promise<void> {
  // TODO: integrate indexed-db-service.ts if available
  console.log('[Cache] Large binary placeholder not implemented yet for', key);
}

export function getMemorySnapshot(): Record<string, CacheEntry> {
  return { ...memory };
}
