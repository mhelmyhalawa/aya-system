// Service to fetch image files from a public Google Drive folder
// Usage requires the folder to be shared publicly (Anyone with the link - Viewer)
// and a Google API Key with Drive API enabled.

import { setCache, getCache, driveImageDataKey, CacheKeys, clearByPrefix } from './cache';

export type DriveImage = {
  id: string;
  name: string;
  mimeType: string;
  url: string; // Direct or blob/object URL
  size?: number; // bytes (optional if Drive returns / not fetched)
  debugTried?: string[]; // candidate URLs tried
  sourceType?: 'direct' | 'blob';
};

const buildPublicImageUrl = (id: string) => `https://drive.google.com/uc?export=view&id=${id}`;
// Default large thumbnail (Drive auto-resizes preserving aspect ratio)
const buildThumbnailUrl = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w1920`;
// Custom sized thumbnail (smaller = faster). Google Drive supports sz=w{width}
const buildThumbnailSizedUrl = (id: string, size: number) => `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
const buildUcIdUrl = (id: string) => `https://drive.google.com/uc?id=${id}`;
const buildDownloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;

// Generate ordered list of candidate URLs for an image ID
function candidateUrls(id: string, preferredThumbnailSize?: number): string[] {
  const thumb = preferredThumbnailSize && preferredThumbnailSize > 0
    ? buildThumbnailSizedUrl(id, preferredThumbnailSize)
    : buildThumbnailUrl(id);
  return [
    // Try direct public view first (often cached by browser if repeated)
    buildPublicImageUrl(id),
    // Then a sized thumbnail to reduce bytes over network
    thumb,
    // Alternate UC forms
    buildUcIdUrl(id),
    // Direct download (may trigger auth / slower but last resort for some images)
    buildDownloadUrl(id)
  ];
}

// Attempt to resolve first loadable URL for each image by probing <img> load events.
// Added apiKey optional param to allow early blob fallback for large/direct-failing images.
export async function resolvePublicImageUrls(
  images: DriveImage[],
  timeoutMs: number = 6000,
  apiKey?: string,
  opts?: { preferredThumbnailSize?: number }
): Promise<DriveImage[]> {
  const resolveOne = (img: DriveImage): Promise<DriveImage> => {
    const tried: string[] = [];
    let blobAttempted = false;
    return new Promise((resolve) => {
      const urls = candidateUrls(img.id, opts?.preferredThumbnailSize);
      let settled = false;
      let idx = 0;
      const tryNext = () => {
        if (idx >= urls.length) {
          // Final fallback: if we still haven't tried blob and apiKey exists, attempt blob once now.
          if (!blobAttempted && apiKey) {
            blobAttempted = true;
            fetchDriveImageBlob(img.id, apiKey).then(b => {
              if (!settled && b) {
                settled = true;
                tried.push('BLOB_FALLBACK');
                resolve({ ...img, url: b, debugTried: tried, sourceType: 'blob' });
              } else if (!settled) {
                settled = true;
                resolve({ ...img, url: buildPublicImageUrl(img.id), debugTried: tried, sourceType: 'direct' });
              }
            }).catch(() => {
              if (!settled) {
                settled = true;
                resolve({ ...img, url: buildPublicImageUrl(img.id), debugTried: tried, sourceType: 'direct' });
              }
            });
            return;
          }
          settled = true;
          resolve({ ...img, url: buildPublicImageUrl(img.id), debugTried: tried, sourceType: 'direct' });
          return;
        }
        const u = urls[idx++];
        tried.push(u);
        const imageEl = new Image();
        let timer: any = setTimeout(() => {
          imageEl.src = '';
          if (!settled) {
            // Early blob attempt after first timeout failure (for large images) before exhausting all candidates
            if (!blobAttempted && apiKey && tried.length === 1) {
              blobAttempted = true;
              fetchDriveImageBlob(img.id, apiKey).then(b => {
                if (!settled && b) {
                  settled = true;
                  tried.push('BLOB_EARLY_TIMEOUT');
                  resolve({ ...img, url: b, debugTried: tried, sourceType: 'blob' });
                } else if (!settled) {
                  tryNext();
                }
              }).catch(() => {
                if (!settled) tryNext();
              });
            } else {
              tryNext();
            }
          }
        }, timeoutMs);
        imageEl.onload = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ ...img, url: u, debugTried: tried, sourceType: 'direct' });
        };
        imageEl.onerror = () => {
          clearTimeout(timer);
          if (!settled) {
            // Early blob attempt after first error if direct fails fast
            if (!blobAttempted && apiKey && tried.length === 1) {
              blobAttempted = true;
              fetchDriveImageBlob(img.id, apiKey).then(b => {
                if (!settled && b) {
                  settled = true;
                  tried.push('BLOB_EARLY_ERROR');
                  resolve({ ...img, url: b, debugTried: tried, sourceType: 'blob' });
                } else if (!settled) {
                  tryNext();
                }
              }).catch(() => {
                if (!settled) tryNext();
              });
            } else {
              tryNext();
            }
          }
        };
        imageEl.src = u;
      };
      tryNext();
    });
  };
  const resolved: DriveImage[] = [];
  for (const img of images) {
    try {
      const r = await resolveOne(img);
      resolved.push(r);
    } catch (_) {
      resolved.push(img); // fallback unchanged
    }
  }
  console.log('[DriveBanner] Resolved image URLs:', resolved.map(r => ({ name: r.name, finalUrl: r.url, tried: r.debugTried })));
  // Attempt blob fallback for failed images (those whose url points to a direct candidate but still might fail in <img>)
  const final: DriveImage[] = [];
  for (const r of resolved) {
    // We don't know yet which failed until component tries to load; preemptively we can skip. We'll return as-is; blob fallback handled separately.
    final.push(r);
  }
  return final;
}

// Fetch raw image data using Drive API alt=media and convert to object URL
export async function fetchDriveImageBlob(fileId: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[DriveBanner] blob fetch failed', fileId, res.status);
      return null;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return objectUrl;
  } catch (e) {
    console.error('[DriveBanner] blob fetch error', fileId, e);
    return null;
  }
}

// =============================
// Persistent DataURL Caching API
// =============================
// We store small image blobs as Data URLs in localStorage to allow immediate banner rendering
// even before network requests complete. Large images may exceed storage quota; we guard by size.

const DRIVE_META_PREFIX = 'drive_images_meta_'; // retained for legacy prefix matching
const DRIVE_DATA_PREFIX = 'drive_image_data_';   // retained for legacy prefix matching
const DRIVE_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_STORE_BYTES = 1024 * 300; // ~300KB per image safety cap
const FOLDER_NAME_RESOLVE_TTL_MS = 12 * 60 * 60 * 1000; // 12h cache for folder name->id

type StoredMeta = {
  folderId: string;
  timestamp: number;
  images: Array<{ id: string; name: string; mimeType: string }>;
};

function now() { return Date.now(); }

function metaKey(folderId: string) { return `${CacheKeys.DRIVE_IMAGES_META}_${folderId}`; }
function dataKey(imageId: string) { return driveImageDataKey(imageId); }

export function getCachedDriveImages(folderId?: string) {
  if (!folderId) return null;
  try {
    const meta = getCache<StoredMeta>(metaKey(folderId));
    if (!meta) return null;
    if (now() - meta.timestamp > DRIVE_CACHE_TTL_MS) return null;
    const dataUrls: Record<string, string> = {};
    meta.images.forEach(img => {
      const d = getCache<string>(dataKey(img.id));
      if (d) dataUrls[img.id] = d;
    });
    return { meta, dataUrls };
  } catch (e) {
    console.warn('[DriveBanner] getCachedDriveImages parse error', e);
    return null;
  }
}

function storeMeta(folderId: string, images: Array<{ id: string; name: string; mimeType: string }>) {
  try {
    const payload: StoredMeta = { folderId, timestamp: now(), images };
    setCache(metaKey(folderId), payload, { persist: true, ttlMs: DRIVE_CACHE_TTL_MS });
  } catch (e) {
    console.warn('[DriveBanner] storeMeta failed', e);
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function fetchDriveImageDataUrl(fileId: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[DriveBanner] dataURL fetch failed', fileId, res.status);
      return null;
    }
    const blob = await res.blob();
    if (blob.size > MAX_STORE_BYTES) {
      // Too large to store persistently; create transient object URL instead.
      return URL.createObjectURL(blob);
    }
    const dataUrl = await blobToDataUrl(blob);
    return dataUrl;
  } catch (e) {
    console.error('[DriveBanner] fetchDriveImageDataUrl error', fileId, e);
    return null;
  }
}

export async function warmDriveImagesCache(folderId?: string, apiKey?: string): Promise<number> {
  if (!folderId || !apiKey) return 0;
  try {
    const images = await fetchDriveImages(folderId, apiKey, { force: true });
    if (!images.length) return 0;
    storeMeta(folderId, images.map(i => ({ id: i.id, name: i.name, mimeType: i.mimeType })));
    let storedCount = 0;
    for (const img of images) {
      // Skip if already cached and fresh
      const existing = getCache<string>(dataKey(img.id));
      if (existing) { storedCount++; continue; }
      const url = await fetchDriveImageDataUrl(img.id, apiKey);
      if (!url) continue;
      try {
        if (!url.startsWith('blob:')) {
          setCache(dataKey(img.id), url, { persist: true, ttlMs: DRIVE_CACHE_TTL_MS });
        } else {
          setCache(dataKey(img.id), url); // memory only
        }
        storedCount++;
      } catch (e) {
        console.warn('[DriveBanner] storing image data failed', img.id, e);
      }
    }
    console.log('[DriveBanner] warm cache stored', storedCount, 'images');
    return storedCount;
  } catch (e) {
    console.warn('[DriveBanner] warmDriveImagesCache failed', e);
    return 0;
  }
}

// إزالة كاش الصور لمجلد محدد
export function clearDriveImageCache(folderId?: string) {
  if (!folderId) return;
  try {
    // Remove meta for this folder and associated data keys (prefix-based)
    clearByPrefix(`${CacheKeys.DRIVE_IMAGES_META}_${folderId}`);
    clearByPrefix(CacheKeys.DRIVE_IMAGE_DATA_PREFIX); // all image blobs
    console.log('[DriveBanner] Cleared image cache for folder', folderId);
  } catch (e) {
    console.warn('[DriveBanner] clearDriveImageCache error', e);
  }
}

// إزالة كل مفاتيح كاش الصور بغض النظر عن المجلد
export function clearAllDriveImageCache() {
  try {
    clearByPrefix(CacheKeys.DRIVE_IMAGES_META);
    clearByPrefix(CacheKeys.DRIVE_IMAGE_DATA_PREFIX);
    console.log('[DriveBanner] Cleared all drive image cache keys');
  } catch (e) {
    console.warn('[DriveBanner] clearAllDriveImageCache error', e);
  }
}

// Simple in-memory + sessionStorage cache to avoid repeated API calls.
const memoryCache: Record<string, DriveImage[]> = {};

export async function fetchDriveImages(
  folderId: string,
  apiKey: string,
  opts: { force?: boolean } = {}
): Promise<DriveImage[]> {
  if (!folderId || !apiKey) return [];
  const { force } = opts;
  const storageKey = `driveImages_${folderId}`;

  if (!force) {
    if (memoryCache[folderId]) return memoryCache[folderId];
    try {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        const parsed: DriveImage[] = JSON.parse(cached);
        memoryCache[folderId] = parsed;
        return parsed;
      }
    } catch (_) {
      // ignore JSON/Storage errors
    }
  }

  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  // نطلب روابط إضافية لمزيد من المرونة (thumbnailLink, webContentLink)
  const fields = encodeURIComponent('files(id,name,mimeType,size,thumbnailLink,webContentLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&key=${apiKey}`;

  console.log('[DriveBanner] Fetching images URL:', url);
  const res = await fetch(url, {
    // محاولة ضمان إرسال Referer (قد لا تحل مشكلة إضافات المتصفح التي تمنعه)
    referrerPolicy: 'strict-origin-when-cross-origin',
    // لا حاجة لإرسال بيانات اعتماد
    credentials: 'omit',
    cache: 'no-store'
  }).catch(err => {
    console.error('Network error fetching Drive images', err);
    return null;
  });
  if (!res) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn('Failed to fetch Drive images', res.status, text);
    return [];
  }
  try {
    const data = await res.json();
  const files = (data.files || []) as Array<{ id: string; name: string; mimeType: string; size?: string | number }>;
    const images: DriveImage[] = files
      .filter(f => f.mimeType?.startsWith('image/'))
      // ترتيب حسب الاسم يضمن استقرار العرض (يمكن تعديل ترتيب مخصص لاحقاً)
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))
      .map(f => {
        const direct = buildPublicImageUrl(f.id);
        const sizeNum = typeof f.size === 'string' ? parseInt(f.size, 10) : f.size;
        return {
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          url: direct,
          size: Number.isFinite(sizeNum as number) ? sizeNum : undefined
        } as DriveImage;
      });
    console.log('[DriveBanner] mapped images:', images.map(i => ({ id: i.id, name: i.name, url: i.url })));
    memoryCache[folderId] = images;
    try { sessionStorage.setItem(storageKey, JSON.stringify(images)); } catch (_) {}
    return images;
  } catch (err) {
    console.error('Parse error fetching Drive images', err);
    return [];
  }
}

// =============================
// Folder Name Resolution Helper
// =============================
// Allow using a folder name (e.g. "Aya-Office-Banner") instead of explicit folder ID.
// We query Drive for a folder with that exact name and mimeType application/vnd.google-apps.folder.
// Caches the resolved ID for a TTL to avoid repeated lookups.
interface ResolvedFolderCache { id: string; timestamp: number; name: string; }
function folderNameCacheKey(name: string) { return `drive_folder_name_${name}`; }

export async function resolveDriveFolderId(opts: { folderName: string; apiKey?: string; accessToken?: string; force?: boolean }): Promise<string | null> {
  const { folderName, apiKey, accessToken, force } = opts;
  if (!folderName) return null;
  const key = folderNameCacheKey(folderName);
  if (!force) {
    try {
      const cached = getCache<ResolvedFolderCache>(key);
      if (cached && (Date.now() - cached.timestamp) < FOLDER_NAME_RESOLVE_TTL_MS) {
        return cached.id;
      }
    } catch (_) { /* ignore */ }
  }
  // Need either apiKey (public search) or accessToken (authenticated search)
  if (!apiKey && !accessToken) return null;
  const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`);
  const fields = encodeURIComponent('files(id,name)');
  const base = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}`;
  const url = apiKey ? `${base}&key=${apiKey}` : base;
  try {
    const res = await fetch(url, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    });
    if (!res.ok) {
      console.warn('[DriveBanner] resolve folder name failed', res.status);
      return null;
    }
    const data = await res.json();
    const files = (data.files || []) as Array<{ id: string; name: string }>;
    if (!files.length) return null;
    const id = files[0].id; // choose first match
    try {
      setCache(key, { id, name: folderName, timestamp: Date.now() }, { persist: true, ttlMs: FOLDER_NAME_RESOLVE_TTL_MS });
    } catch (_) {}
    console.log('[DriveBanner] Resolved folder name', folderName, '->', id);
    return id;
  } catch (e) {
    console.warn('[DriveBanner] resolveDriveFolderId error', e);
    return null;
  }
}

export async function fetchDriveImagesWithStatus(
  folderId: string,
  apiKey: string,
  opts: { force?: boolean } = {}
): Promise<{ images: DriveImage[]; error?: string; status?: number; rawCount?: number }> {
  if (!folderId || !apiKey) {
    return { images: [], error: 'المتغيرات البيئية غير مكتملة (Folder / API Key)' };
  }
  // Attempt raw fetch to get status before parsing via helper (duplicate logic but gives diagnostics)
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,size)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&key=${apiKey}`;
  let status: number | undefined;
  let rawCount: number | undefined;
  try {
    const res = await fetch(url);
    status = res.status;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { images: [], error: `فشل طلب Google Drive (HTTP ${res.status})`, status };
    }
  const data = await res.json();
  const files = (data.files || []) as Array<{ id: string; name: string; mimeType: string; size?: string | number }>;
    rawCount = files.length;
  const imageFiles = files.filter(f => f.mimeType?.startsWith('image/'));
    if (imageFiles.length === 0) {
      return {
        images: [],
        error: rawCount === 0
          ? 'المجلد فارغ أو لا توجد صلاحية لعرض الملفات.'
          : 'لا توجد ملفات صور (jpg/png/webp) في هذا المجلد. تأكد أنها ليست داخل مجلد فرعي.',
        status,
        rawCount
      };
    }
    // Delegate caching through base function (force ensures refresh)
    const images = await fetchDriveImages(folderId, apiKey, opts);
    return { images, status, rawCount };
  } catch (e: any) {
    return { images: [], error: e?.message || 'خطأ شبكة أثناء جلب الملفات.', status, rawCount };
  }
}
