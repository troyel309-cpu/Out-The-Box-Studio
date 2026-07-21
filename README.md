# Out the Box Studio V4 — Reference Asset Intake

V4 adds owner-controlled picture uploads and three production modes:

- **Hybrid:** upload a picture, select it, and let AI build from it.
- **My Picture Only:** attach and preserve the original picture as a production artifact.
- **AI Only:** generate from text without an uploaded reference.

Uploaded PNG, JPG, and WEBP files are stored locally in `public/uploads`. Metadata is stored in `data/assets.json`. The API key remains server-side in your Mac terminal environment.

## Run

```bash
cd ~/Downloads/Out_the_Box_Studio_App_V4_Reference_Asset_Intake
read -s "OPENAI_API_KEY?Paste your API key: "
export OPENAI_API_KEY
echo
npm start
```

Open `http://localhost:3000`.

## First test

1. Upload a Tiny Troy reference picture.
2. Mark it as an official Character reference.
3. Choose **Hybrid — my picture + AI**.
4. Select the uploaded picture.
5. Enter a scene request and choose **Build From My Picture**.

V4 preserves the V3 project library and generated image included in the package.


## V4.1 upload fix
The JSON request limit now supports image uploads up to 15 MB, including base64 overhead.


## V4.2 reliable upload repair
V4.2 sends image bytes directly to the local server instead of converting them to large base64 JSON requests. It adds a selected-image preview, visible upload progress, persistent success/error messages, and server-side upload logging.
