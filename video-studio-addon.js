import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const VIDEO_DIR = path.join(PUBLIC, "generated", "videos");
const REFERENCE_DIR = path.join(PUBLIC, "generated", "video-references");
const UPLOAD_DIR = path.join(PUBLIC, "uploads", "video-studio");
const VIDEO_DB = path.join(DATA, "videos.json");
const UPLOAD_DB = path.join(DATA, "video-uploads.json");
const ASSET_DB = path.join(DATA, "assets.json");

for (const directory of [DATA, VIDEO_DIR, REFERENCE_DIR, UPLOAD_DIR]) {
  fs.mkdirSync(directory, { recursive: true });
}

for (const file of [VIDEO_DB, UPLOAD_DB]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]\n", "utf8");
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function atomicWrite(file, value) {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temporary, file);
}

async function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }

  return chunks.length
    ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
    : {};
}

async function readBinary(req, maxBytes = 150 * 1024 * 1024) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error("Upload is larger than 150 MB.");
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function requireKey() {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key || key.includes("YOUR_KEY")) {
    throw new Error("OPENAI_API_KEY is missing or invalid.");
  }
  return key;
}

function safeExtension(filename, mimeType) {
  const extension = path.extname(filename || "").toLowerCase();

  const allowed = new Set([
    ".png", ".jpg", ".jpeg", ".webp",
    ".mp4", ".mov", ".m4v", ".webm"
  ]);

  if (allowed.has(extension)) return extension;

  const fallback = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm"
  };

  return fallback[mimeType] || "";
}

function publicPath(absolutePath) {
  return `/${path.relative(PUBLIC, absolutePath).split(path.sep).join("/")}`;
}

function resolvePublicUrl(url) {
  if (!url || !url.startsWith("/")) return null;
  const resolved = path.resolve(PUBLIC, `.${url}`);
  return resolved.startsWith(PUBLIC) && fs.existsSync(resolved)
    ? resolved
    : null;
}

function commandExists(command) {
  return spawnSync("which", [command], { encoding: "utf8" }).status === 0;
}

function dimensions(size) {
  const [width, height] = String(size).split("x").map(Number);
  if (!width || !height) throw new Error("Unsupported output dimensions.");
  return { width, height };
}

function createMatchingImage(source, size) {
  const { width, height } = dimensions(size);
  const output = path.join(
    REFERENCE_DIR,
    `${crypto.randomUUID()}-${width}x${height}.png`
  );

  if (commandExists("sips")) {
    const temp = path.join(os.tmpdir(), `${crypto.randomUUID()}.png`);

    let result = spawnSync(
      "sips",
      ["-s", "format", "png", source, "--out", temp],
      { encoding: "utf8" }
    );

    if (result.status !== 0) {
      throw new Error(`Could not prepare image: ${result.stderr || result.stdout}`);
    }

    result = spawnSync(
      "sips",
      ["--resampleHeightWidthMax", String(Math.max(width, height) * 2), temp],
      { encoding: "utf8" }
    );

    result = spawnSync(
      "sips",
      ["--cropToHeightWidth", String(height), String(width), temp, "--out", output],
      { encoding: "utf8" }
    );

    try { fs.unlinkSync(temp); } catch {}

    if (result.status === 0 && fs.existsSync(output)) return output;
  }

  if (commandExists("ffmpeg")) {
    const filter =
      `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
      `crop=${width}:${height}`;

    const result = spawnSync(
      "ffmpeg",
      ["-y", "-i", source, "-vf", filter, "-frames:v", "1", output],
      { encoding: "utf8" }
    );

    if (result.status === 0 && fs.existsSync(output)) return output;
    throw new Error(`Could not resize reference image: ${result.stderr}`);
  }

  throw new Error(
    "The Mac image tool could not prepare this file. Install ffmpeg with Homebrew, or upload a PNG/JPG that already matches the selected video format."
  );
}

function extractMatchingVideoFrame(source, size) {
  if (!commandExists("ffmpeg")) {
    throw new Error(
      "Using an uploaded video as a visual reference requires ffmpeg. Run: brew install ffmpeg"
    );
  }

  const { width, height } = dimensions(size);
  const output = path.join(
    REFERENCE_DIR,
    `${crypto.randomUUID()}-${width}x${height}-frame.png`
  );

  const filter =
    `scale=${width}:${height}:force_original_aspect_ratio=increase,` +
    `crop=${width}:${height}`;

  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-ss", "0.25",
      "-i", source,
      "-vf", filter,
      "-frames:v", "1",
      output
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0 || !fs.existsSync(output)) {
    throw new Error(`Could not extract a video reference frame: ${result.stderr}`);
  }

  return output;
}

function findStudioAsset(id) {
  if (!id) return null;
  return readJson(ASSET_DB, []).find(asset => asset.id === id) || null;
}

function findUpload(id) {
  if (!id) return null;
  return readJson(UPLOAD_DB, []).find(upload => upload.id === id) || null;
}

async function openAI(pathname, options = {}) {
  const response = await fetch(`https://api.openai.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI video request failed (${response.status}): ${await response.text()}`
    );
  }

  return (response.headers.get("content-type") || "").includes("application/json")
    ? response.json()
    : response;
}

async function createUpload(req, url) {
  const filename = decodeURIComponent(
    req.headers["x-file-name"] || url.searchParams.get("filename") || "upload"
  );
  const mimeType = String(
    req.headers["content-type"] || "application/octet-stream"
  ).split(";")[0];

  const kind = mimeType.startsWith("image/")
    ? "image"
    : mimeType.startsWith("video/")
      ? "video"
      : null;

  if (!kind) throw new Error("Upload a supported picture or video file.");

  const extension = safeExtension(filename, mimeType);
  if (!extension) throw new Error("That file type is not supported.");

  const bytes = await readBinary(req);
  const id = crypto.randomUUID();
  const destination = path.join(UPLOAD_DIR, `${id}${extension}`);
  fs.writeFileSync(destination, bytes);

  const record = {
    id,
    kind,
    filename,
    mimeType,
    bytes: bytes.length,
    url: publicPath(destination),
    createdAt: new Date().toISOString()
  };

  const uploads = readJson(UPLOAD_DB, []);
  uploads.unshift(record);
  atomicWrite(UPLOAD_DB, uploads.slice(0, 100));

  return record;
}

function prepareReference(body, size) {
  const mode = body.referenceMode || "none";

  if (mode === "none") return null;

  if (mode === "studio") {
    const asset = findStudioAsset(body.assetId);
    const source = resolvePublicUrl(asset?.url);
    if (!source) throw new Error("The selected Studio picture could not be found.");
    return createMatchingImage(source, size);
  }

  if (mode === "upload") {
    const upload = findUpload(body.uploadId);
    const source = resolvePublicUrl(upload?.url);
    if (!source) throw new Error("The uploaded media could not be found.");

    return upload.kind === "video"
      ? extractMatchingVideoFrame(source, size)
      : createMatchingImage(source, size);
  }

  throw new Error("Unknown reference mode.");
}

async function createVideo(body) {
  const prompt = String(body.prompt || "").trim();
  if (!prompt) throw new Error("Describe the video you want to create.");

  const model = ["sora-2", "sora-2-pro"].includes(body.model)
    ? body.model
    : "sora-2";

  const seconds = ["4", "8", "12"].includes(String(body.seconds))
    ? String(body.seconds)
    : "4";

  const size = ["720x1280", "1280x720", "1024x1792", "1792x1024"].includes(body.size)
    ? body.size
    : "1280x720";

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("seconds", seconds);
  form.append("size", size);

  const referencePath = prepareReference(body, size);

  if (referencePath) {
    const bytes = fs.readFileSync(referencePath);
    form.append(
      "input_reference",
      new Blob([bytes], { type: "image/png" }),
      path.basename(referencePath)
    );
  }

  const remote = await openAI("/v1/videos", {
    method: "POST",
    body: form
  });

  const record = {
    id: remote.id,
    remoteId: remote.id,
    prompt,
    model,
    seconds,
    size,
    referenceMode: body.referenceMode || "none",
    assetId: body.assetId || null,
    uploadId: body.uploadId || null,
    status: remote.status || "queued",
    progress: Number(remote.progress || 0),
    videoUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const videos = readJson(VIDEO_DB, []);
  videos.unshift(record);
  atomicWrite(VIDEO_DB, videos);
  return record;
}

async function downloadCompletedVideo(record) {
  const filename = `${record.remoteId}.mp4`;
  const destination = path.join(VIDEO_DIR, filename);

  // Recover cleanly after a restart or an interrupted database write.
  if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
    record.videoUrl = `/generated/videos/${filename}`;
    record.progress = 100;
    record.downloadPending = false;
    record.downloadError = null;
    return;
  }

  const response = await fetch(
    `https://api.openai.com/v1/videos/${encodeURIComponent(record.remoteId)}/content`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${requireKey()}`,
        Accept: "video/mp4,application/octet-stream;q=0.9,*/*;q=0.1"
      }
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `MP4 download failed (${response.status}): ${details || response.statusText}`
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024) {
    throw new Error(`The MP4 handoff returned only ${bytes.length} bytes.`);
  }

  const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, bytes);
  fs.renameSync(temporary, destination);

  record.videoUrl = `/generated/videos/${filename}`;
  record.progress = 100;
  record.downloadPending = false;
  record.downloadError = null;
  record.downloadedAt = new Date().toISOString();
}

async function refreshVideo(record) {
  // A completed local asset remains usable even after the remote job expires.
  if (record.videoUrl) {
    const local = resolvePublicUrl(record.videoUrl);
    if (local) {
      record.status = "completed";
      record.progress = 100;
      record.downloadPending = false;
      return record;
    }
    record.videoUrl = null;
  }

  const remote = await openAI(`/v1/videos/${encodeURIComponent(record.remoteId)}`);

  record.status = String(remote.status || record.status || "queued").toLowerCase();
  record.progress = Number(remote.progress ?? record.progress ?? 0);
  record.error = remote.error?.message || null;
  record.updatedAt = new Date().toISOString();
  record.expiresAt = remote.expires_at || record.expiresAt || null;

  if (record.status === "completed") {
    record.downloadPending = true;
    record.downloadAttempts = Number(record.downloadAttempts || 0) + 1;

    try {
      await downloadCompletedVideo(record);
      console.log(`[Video Studio] Saved ${record.remoteId} to ${record.videoUrl}`);
    } catch (error) {
      record.progress = 99;
      record.downloadPending = true;
      record.downloadError = error instanceof Error ? error.message : String(error);
      record.nextRetryAt = new Date(Date.now() + 3000).toISOString();
      console.warn(
        `[Video Studio] Finalization attempt ${record.downloadAttempts} for ${record.remoteId}: ${record.downloadError}`
      );
    }
  }

  const videos = readJson(VIDEO_DB, []);
  const index = videos.findIndex(video => video.id === record.id);

  if (index >= 0) videos[index] = record;
  else videos.unshift(record);

  atomicWrite(VIDEO_DB, videos);
  return record;
}

export async function handleVideoStudioRequest(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (!url.pathname.startsWith("/api/video-studio")) return false;

  try {
    if (req.method === "POST" && url.pathname === "/api/video-studio/upload") {
      sendJson(res, 201, await createUpload(req, url));
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/video-studio/uploads") {
      sendJson(res, 200, { uploads: readJson(UPLOAD_DB, []) });
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/video-studio") {
      sendJson(res, 200, { videos: readJson(VIDEO_DB, []) });
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/video-studio") {
      sendJson(res, 202, await createVideo(await readJsonBody(req)));
      return true;
    }

    const match = url.pathname.match(/^\/api\/video-studio\/([^/]+)\/status$/);

    if (req.method === "GET" && match) {
      const videos = readJson(VIDEO_DB, []);
      const record = videos.find(video => video.id === decodeURIComponent(match[1]));

      if (!record) {
        sendJson(res, 404, { error: "Video job not found." });
        return true;
      }

      sendJson(res, 200, await refreshVideo(record));
      return true;
    }

    sendJson(res, 404, { error: "Video Studio route not found." });
    return true;
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : String(error)
    });
    return true;
  }
}
