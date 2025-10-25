// Google Drive OAuth & file operations helper (client-side token acquisition)
// Uses Google Identity Services (GIS) token flow to obtain an access token scoped to drive.file.
// Prerequisites:
// 1. Add <script src="https://accounts.google.com/gsi/client" async defer></script> to index.html OR rely on dynamic loader below.
// 2. Define VITE_GOOGLE_OAUTH_CLIENT_ID in your environment (.env.local).
// 3. Folder must be shared appropriately (service depends on user permission).
//
// Security notes:
// - drive.file scope restricts access primarily to files created/opened by the app via the picker; for broad folder editing you may need drive.readonly or drive.
// - Tokens are short-lived; DO NOT persist long-term. Store ephemeral in memory.
// - For refresh flows, implement server-side Authorization Code exchange w/ PKCE. This helper covers only implicit token acquisition.
//
// Upload implementation: uses multipart/related for metadata + file body.
// Delete and list operations use standard Drive v3 endpoints with bearer token.
//
// If you need more robust flows (refresh tokens, offline access), create a small backend endpoint that exchanges an auth code.

export interface GoogleDriveFileMeta {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  thumbnailLink?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined;
const TOKEN_SCOPES_DEFAULT = ['https://www.googleapis.com/auth/drive.file'];

let tokenPromise: Promise<string> | null = null;
let activeToken: string | null = null;

function loadGsiScript(): Promise<void> {
  if (window.google && window.google.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('GIS load error')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-gsi', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.head.appendChild(script);
  });
}

export async function getDriveAccessToken(scopes: string[] = TOKEN_SCOPES_DEFAULT): Promise<string> {
  if (!CLIENT_ID) throw new Error('Missing VITE_GOOGLE_OAUTH_CLIENT_ID');
  if (activeToken) return activeToken; // naive reuse until expiry (could decode & check exp if needed)
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    await loadGsiScript();
    return new Promise<string>((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services oauth2 not available'));
        return;
      }
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: scopes.join(' '),
        callback: (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          activeToken = resp.access_token;
          resolve(activeToken);
        }
      });
      // Request token (if no previous granted scope user will see consent screen)
      tokenClient.requestAccessToken();
    });
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null; // allow new fetch after completion
  }
}

export function clearDriveAccessToken() {
  activeToken = null;
}

// === Drive API Helpers ===

async function authFetch(url: string, init: RequestInit & { accessToken: string }): Promise<Response> {
  const { accessToken, ...rest } = init;
  return fetch(url, {
    ...rest,
    headers: {
      ...(rest.headers || {}),
      Authorization: `Bearer ${accessToken}`
    }
  });
}

// List image files directly under a folder (no recursion) matching image/*
export async function listDriveFolderImages(folderId: string, accessToken: string): Promise<GoogleDriveFileMeta[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  // Include size for filtering and ordering; may be undefined for some types.
  const fields = encodeURIComponent('files(id,name,mimeType,size,thumbnailLink,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}`;
  const res = await authFetch(url, { method: 'GET', accessToken });
  if (!res.ok) throw new Error(`List failed: ${res.status}`);
  const data = await res.json();
  const files = (data.files || []) as GoogleDriveFileMeta[];
  return files.filter(f => f.mimeType?.startsWith('image/'));
}

// Upload image to folder. Returns new file id.
export async function uploadDriveImage(file: File, folderId: string, accessToken: string): Promise<{ id: string; name: string } | null> {
  const boundary = `====drive_${Date.now()}`;
  const metadata = {
    name: file.name,
    parents: [folderId]
  };
  const bodyParts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
  ];

  const arrayBuffer = await file.arrayBuffer();
  const metaBlob = new Blob(bodyParts, { type: 'text/plain' });
  const fileBlob = new Blob([new Uint8Array(arrayBuffer)], { type: file.type || 'application/octet-stream' });
  const closing = new Blob([`\r\n--${boundary}--`]);
  const fullBody = new Blob([metaBlob, fileBlob, closing]);

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await authFetch(uploadUrl, {
    method: 'POST',
    accessToken,
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: fullBody
  });
  if (!res.ok) {
    console.warn('Upload failed', res.status, await res.text().catch(() => ''));
    return null;
  }
  const json = await res.json();
  return { id: json.id, name: json.name };
}

export async function deleteDriveFile(fileId: string, accessToken: string): Promise<boolean> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await authFetch(url, { method: 'DELETE', accessToken });
  if (res.status === 204) return true;
  console.warn('Delete failed', res.status, await res.text().catch(() => ''));
  return false;
}

export async function getDriveFileMeta(fileId: string, accessToken: string): Promise<GoogleDriveFileMeta | null> {
  const fields = encodeURIComponent('id,name,mimeType,parents,thumbnailLink,webViewLink');
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${fields}`;
  const res = await authFetch(url, { method: 'GET', accessToken });
  if (!res.ok) return null;
  return await res.json();
}

// Download raw image blob (if needed for fallback transformation)
export async function downloadDriveImageBlob(fileId: string, accessToken: string): Promise<Blob | null> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await authFetch(url, { method: 'GET', accessToken });
  if (!res.ok) return null;
  return await res.blob();
}

// Simple helper to convert a Blob to Data URL for caching
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Example integrated flow (pseudo usage):
// const token = await getDriveAccessToken();
// const uploaded = await uploadDriveImage(file, FOLDER_ID, token);
// const images = await listDriveFolderImages(FOLDER_ID, token);
// await deleteDriveFile(imageId, token);

// For production consider:
// - Expiry tracking (tokens typically ~1h) and re-request when needed.
// - Graceful error surfacing (quota, permission).
// - Optional migration to server-side code exchange for refresh tokens.
