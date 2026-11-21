# Hassan Clip Studio

The editor uses HTML, CSS and browser JavaScript. It trims a local video and records a 720 × 1280 clip. The local export works independently of the storage service. Cloud saves are explicit and use private Vercel Blob storage for source videos and exports.

## Deploy the website and storage backend

On GitHub, verify that `api/upload.js` appears under the `api/` folder. It enables cloud saves. The `assets/` folder contains optional video samples and branding. If it is missing, the editor still builds and accepts local videos.

1. Extract this project, push the extracted files to GitHub, and import the repository into Vercel. Use the repository root and the **Other** framework preset. The project config builds to `dist` and Vercel serves `api/upload.js` as a Node.js Function.
2. In the Vercel project, create and connect a **Private** Blob store in **Storage**. Use the linked `BLOB_READ_WRITE_TOKEN` environment variable. Redeploy after connecting the store.
3. Set a random owner-only `STUDIO_STORAGE_KEY` of at least 32 characters in the Vercel project environment, then redeploy. Enter this key in **Private cloud storage** on your deployed site. Keep your Blob read/write token in Vercel. The storage key authorizes anyone who knows it to send files to this project, so keep it private.
4. Pick a file or export a clip, then select **Save source video** or **Save exported clip**. Find saved files under `sources/` and `clips/` in the Blob dashboard, where you can manage and retrieve them. Uploads go directly to Blob in parts and are limited to 500 MiB per file.
5. Vercel provides a `vercel.app` address. The browser editor works there without the storage settings. Storage usage can incur charges.

For local editing only, serve the project folder with `python -m http.server 8000` and visit `http://localhost:8000`. Use a current Chrome or Edge for media export. Keep the tab active during export. To build the static files, run `npm ci` and `npm run build`.

The Vercel backend in this project handles storage authorization. The separate Hassan Python and FFmpeg Studio handles automatic livestream recording, Gemini analysis, and publishing.

- [Vercel direct client uploads](https://vercel.com/docs/vercel-blob/client-upload)
- [Vercel private storage](https://vercel.com/docs/vercel-blob/private-storage)
- [Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)

