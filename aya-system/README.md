# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/09224215-a195-4ef2-83a3-8f69e5893bb6

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/09224215-a195-4ef2-83a3-8f69e5893bb6) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/09224215-a195-4ef2-83a3-8f69e5893bb6) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Dynamic Banner Images from Google Drive

The home page banner can load images dynamically from a public Google Drive folder instead of using the bundled local assets.

### 1. Share a Google Drive Folder Publicly
1. Create (or choose) a folder in Google Drive for your banner images.
2. Right click the folder → Share → General access: "Anyone with the link" (Viewer).
3. Copy the folder ID from the URL. Example URL:
	`https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp` → Folder ID is `1AbCdEfGhIjKlMnOp`.

### 2. Enable Google Drive API & Create an API Key
1. Go to Google Cloud Console.
2. Create a project (if you don’t have one).
3. APIs & Services → Enable APIs → Search "Google Drive API" → Enable.
4. Credentials → Create Credentials → API Key.
5. (Recommended) Restrict the key: Application restrictions → HTTP referrers (add your domain / localhost); API restrictions → Enable only Drive API.

### 3. Add Environment Variables
Create or edit a `.env` file at the project root:

```
VITE_GOOGLE_DRIVE_FOLDER_ID=YOUR_FOLDER_ID
VITE_GOOGLE_API_KEY=YOUR_API_KEY
```

Restart the dev server after adding these.

### 4. How It Works
On load, the app calls the Drive Files list endpoint to fetch all non-trashed files in the folder, filters to image MIME types, and converts them to direct view URLs (`https://drive.google.com/uc?export=view&id=FILE_ID`).

If the request fails or returns no images, the original local fallback images are used automatically.

### 4.1 Caching & Version Invalidation
The app stores image DataURLs (when reasonably small) in `localStorage` for up to 12 hours for instant banner display.

On every startup it:
1. Loads cached images immediately (fast initial render).
2. Performs a network refresh to fetch current images and update the cache.

If the build version changes (compared to the stored `app_build_version` in `localStorage`):
1. All Drive image cache keys (`drive_images_meta_*`, `drive_image_data_*`) are cleared.
2. The banner cache is warmed again using the new version.

Manual cache reset (without changing version):
```js
localStorage.removeItem('app_build_version'); // then reload page
```
This forces the same version-change flow.

### 8. Banner Images Management UI
An admin-only page at the route `/drive-images` lets superadmin/admin users:
- View all images currently in the Google Drive folder.
- Locally hide/unhide specific images (stored in `localStorage` under `drive_banner_hidden_ids`). Hidden images are excluded from the rotating banner.
- Refresh the network list and warm the cache.
- Clear the folder cache manually.

Upload/Delete Limitations:
- Actual file upload and deletion on Google Drive CAN NOT work with an API key alone (read-only public access).
- To enable real modifications you must implement one of:
	1. OAuth 2.0 client flow in the frontend (Drive scope: `https://www.googleapis.com/auth/drive.file`).
	2. A backend proxy (Cloud Function / server) that holds a Service Account key and exposes secure endpoints (`POST /drive/upload`, `DELETE /drive/file/:id`).
	3. Migrate images to a writable store (e.g. Supabase Storage) and adjust the banner source.

Hidden Images Behavior:
- Hidden IDs are filtered out during banner construction; fallback/local images are unaffected.
- To reset hidden state: `localStorage.removeItem('drive_banner_hidden_ids')` then reload.

Future Enhancements:
- Real upload via resumable sessions.
- Bulk select + batch hide.
- Sorting (name, date, size after adding metadata fetch).
- Drag & drop reorder with a metadata manifest file.

### 5. Notes & Limitations
- This approach uses a public folder + API key (no OAuth). For private folders you would need a backend proxy or OAuth flow.
- You can clear the cache by refreshing with disabled cache (Ctrl+Shift+R).
- Non-image files are ignored.
- Large images: Prefer optimizing them (compress / resize) before uploading.

### 6. Troubleshooting
| Issue | Cause | Fix |
|-------|-------|-----|
| No images load | Wrong folder ID or not public | Re-check sharing settings & ID |
| 403 / 400 errors | API key restriction mismatch | Adjust referrer restrictions in Google Cloud |
| Mixed content | Using HTTP on a HTTPS site | Ensure images load via HTTPS (default) |
| Old images still show after deploy | Cached DataURLs from previous build | Version bump auto-clears; manually clear via DevTools localStorage if needed |

### 7. Future Improvements
- Add manual refresh button.
- Support captions from a metadata JSON file in the same folder.
- Lazy loading & progressive blur.
- IndexedDB for larger images (>300KB).
- Service Worker layer for offline banner.
- Admin UI to force remote refresh.

---
