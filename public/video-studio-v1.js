(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  let pollTimer = null;
  let elapsedTimer = null;
  let uploadedMedia = null;
  let activeJobId = null;
  let activeStartedAt = null;

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(typeof options.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });

    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(data?.error || data || `Request failed (${response.status})`);
    return data;
  }

  function selectedAssetId() {
    return document.querySelector(".asset-card.selected")?.dataset.asset || "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);
  }

  function stopPolling() {
    clearTimeout(pollTimer);
    clearInterval(elapsedTimer);
    pollTimer = null;
    elapsedTimer = null;
  }

  function elapsedLabel(startedAt) {
    const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const minutes = Math.floor(seconds / 60);
    return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  }

  function addNavigation() {
    if ($('[data-page="video"]')) return;
    const production = $('[data-page="production"]');
    if (!production) return;
    const button = document.createElement("button");
    button.className = "nav-item";
    button.dataset.page = "video";
    button.innerHTML = `<span>🎥</span><div><strong>Video Studio</strong><small>Create AI videos</small></div>`;
    production.insertAdjacentElement("afterend", button);
    button.addEventListener("click", showVideoPage);
  }

  function addPage() {
    $("#videoPage")?.remove();
    const main = $(".main");
    if (!main) return;

    const page = document.createElement("section");
    page.id = "videoPage";
    page.className = "page";
    page.innerHTML = `
      <div class="page-heading">
        <div><span class="eyebrow">OPENAI CHALLENGE EDITION</span><h1>Video Studio</h1>
        <p>Direct a scene, guide it with an image, and turn the result into a saved MP4.</p></div>
      </div>
      <div class="video-page-grid">
        <article class="video-form-card">
          <span class="eyebrow">DIRECT THE SCENE</span><h2>What should happen?</h2>
          <textarea id="videoPrompt" placeholder="Example: Tiny Troy steps out of a glowing open box, looks at the camera, and says, ‘Let’s make something happen.’"></textarea>
          <div class="video-options">
            <label>Model<select id="videoModel"><option value="sora-2">Sora 2 — Standard</option><option value="sora-2-pro">Sora 2 Pro — Premium</option></select></label>
            <label>Length<select id="videoSeconds"><option value="4">4 seconds</option><option value="8">8 seconds</option><option value="12">12 seconds</option></select></label>
            <label>Format<select id="videoSize"><option value="1280x720">Landscape</option><option value="720x1280">Portrait</option></select></label>
            <label>Starting point<select id="videoReferenceMode"><option value="none">Text only</option><option value="studio">Selected Studio picture</option><option value="upload">Uploaded picture or video</option></select></label>
          </div>
          <div class="video-upload-box">
            <input id="videoMediaUpload" type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm" hidden>
            <button id="chooseVideoMedia" type="button" class="secondary-button">Upload picture or video</button>
            <div id="videoUploadPreview" class="video-upload-preview"><span>No media uploaded</span></div>
          </div>
          <div id="videoReferenceStatus" class="video-reference-status"></div>
          <button id="generateVideoButton" class="primary-button">Generate video</button>
          <p class="video-cost-note">The production tracker keeps checking until the MP4 is safely stored in your local library.</p>
        </article>
        <article class="video-preview-card">
          <div class="panel-head"><div><span class="eyebrow">LIVE PRODUCTION PROOF</span><h3>Your generated video</h3></div><span id="videoStatus" class="status">Waiting</span></div>
          <div id="videoStage" class="video-stage"><div class="empty-state"><img src="/otb-brand-icon.svg" alt=""><strong>Video Studio is ready</strong><small>Your completed MP4 will appear here.</small></div></div>
        </article>
        <article class="video-library-card">
          <div class="panel-head"><div><span class="eyebrow">SAVED EVIDENCE</span><h3>Video Library</h3></div><button id="refreshVideos" class="text-button">Refresh</button></div>
          <div id="videoLibraryGrid" class="video-library-grid"><div class="loading">Loading videos…</div></div>
        </article>
      </div>`;
    main.appendChild(page);

    $("#generateVideoButton").addEventListener("click", generateVideo);
    $("#refreshVideos").addEventListener("click", loadVideos);
    $("#videoReferenceMode").addEventListener("change", updateReferenceStatus);
    $("#chooseVideoMedia").addEventListener("click", () => $("#videoMediaUpload").click());
    $("#videoMediaUpload").addEventListener("change", uploadMedia);
  }

  function showVideoPage() {
    $$(".page").forEach(page => page.classList.remove("active"));
    $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.page === "video"));
    $("#videoPage")?.classList.add("active");
    document.body.classList.add("video-studio-open");
    updateReferenceStatus();
    loadVideos();
  }

  async function uploadMedia(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const preview = $("#videoUploadPreview");
    preview.innerHTML = `<span>Uploading ${escapeHtml(file.name)}…</span>`;
    try {
      uploadedMedia = await request(`/api/video-studio/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
        body: file
      });
      preview.innerHTML = uploadedMedia.kind === "image"
        ? `<img src="${uploadedMedia.url}" alt="Uploaded reference">`
        : `<video controls muted playsinline src="${uploadedMedia.url}"></video>`;
      $("#videoReferenceMode").value = "upload";
      updateReferenceStatus();
    } catch (error) {
      uploadedMedia = null;
      preview.innerHTML = `<span>${escapeHtml(error.message)}</span>`;
    }
  }

  function updateReferenceStatus() {
    const mode = $("#videoReferenceMode")?.value || "none";
    const status = $("#videoReferenceStatus");
    if (!status) return;
    if (mode === "none") status.textContent = "Text-only generation selected.";
    else if (mode === "studio") status.textContent = selectedAssetId() ? "Selected Studio picture is ready." : "Choose a picture in Studio first.";
    else status.textContent = uploadedMedia ? `${uploadedMedia.kind === "video" ? "A video frame" : "The uploaded picture"} will guide the scene.` : "Upload a picture or video first.";
  }

  function renderProgress(job) {
    const progress = Math.max(0, Math.min(98, Number(job.progress || 0)));
    $("#videoStatus").textContent = job.status === "queued" ? "Queued" : "Rendering";
    $("#videoStage").innerHTML = `<div class="video-progress"><img src="/otb-brand-icon.svg" alt=""><strong>${job.status === "queued" ? "Waiting in the production queue" : "The studio is rendering your scene"}</strong><div class="video-progress-track"><span style="width:${progress}%"></span></div><small>${progress}% complete</small></div>`;
  }

  function renderFinalizing(job) {
    $("#videoStatus").textContent = "Finalizing";
    $("#videoStage").innerHTML = `<div class="video-finalizing-note"><img src="/otb-brand-icon.svg" alt=""><strong><span class="video-pulse-dot"></span>Render complete — securing the MP4</strong><div class="video-progress-track"><span style="width:99%"></span></div><small>The studio is completing the final file handoff.<br>Elapsed: <span id="videoElapsedTime">${elapsedLabel(activeStartedAt)}</span></small>${job.downloadError ? `<small>${escapeHtml(job.downloadError)}</small>` : ""}<div class="video-finalizing-actions"><button type="button" id="checkVideoNow">Check now</button></div></div>`;
    $("#checkVideoNow")?.addEventListener("click", () => pollVideo(activeJobId, true));
  }

  function renderComplete(job) {
    stopPolling();
    activeJobId = null;
    $("#videoStatus").textContent = "Complete";
    const button = $("#generateVideoButton");
    button.disabled = false;
    button.textContent = "Generate another video";
    $("#videoStage").innerHTML = `<div style="width:100%"><video id="completedVideoPlayer" controls autoplay playsinline preload="auto" src="${job.videoUrl}"></video><div class="video-result-actions"><a href="${job.videoUrl}" download>Save MP4</a><button type="button" id="openCompletedVideo">Open full screen</button></div></div>`;
    const player = $("#completedVideoPlayer");
    $("#openCompletedVideo")?.addEventListener("click", async () => { try { await player.requestFullscreen?.(); await player.play(); } catch {} });
    player?.play().catch(() => {});
    loadVideos();
  }

  function renderFailure(message) {
    stopPolling();
    activeJobId = null;
    $("#videoStatus").textContent = "Stopped";
    const button = $("#generateVideoButton");
    button.disabled = false;
    button.textContent = "Try again";
    $("#videoStage").innerHTML = `<div class="empty-state"><strong>Video generation stopped</strong><small>${escapeHtml(message)}</small></div>`;
  }

  async function generateVideo() {
    const prompt = $("#videoPrompt").value.trim();
    const referenceMode = $("#videoReferenceMode").value;
    if (!prompt) return alert("Describe what you want the video to do.");
    if (referenceMode === "studio" && !selectedAssetId()) return alert("Choose a Studio picture first, or use Text only.");
    if (referenceMode === "upload" && !uploadedMedia) return alert("Upload a picture or video first.");

    stopPolling();
    const button = $("#generateVideoButton");
    button.disabled = true;
    button.textContent = "Starting production…";

    try {
      const job = await request("/api/video-studio", { method: "POST", body: JSON.stringify({
        prompt, model: $("#videoModel").value, seconds: $("#videoSeconds").value,
        size: $("#videoSize").value, referenceMode,
        assetId: referenceMode === "studio" ? selectedAssetId() : null,
        uploadId: referenceMode === "upload" ? uploadedMedia.id : null
      }) });
      activeJobId = job.id;
      activeStartedAt = Date.now();
      renderProgress(job);
      pollVideo(job.id, true);
    } catch (error) { renderFailure(error.message); }
  }

  async function pollVideo(id, immediate = false) {
    if (!id) return;
    clearTimeout(pollTimer);
    if (!activeStartedAt) activeStartedAt = Date.now();
    activeJobId = id;

    try {
      const job = await request(`/api/video-studio/${encodeURIComponent(id)}/status`);
      if (job.videoUrl) return renderComplete(job);
      if (job.status === "failed") return renderFailure(job.error || "OpenAI reported that the job failed.");
      const finalizing = job.status === "completed" || Number(job.progress || 0) >= 99 || job.downloadPending;
      if (finalizing) renderFinalizing(job); else renderProgress(job);
      pollTimer = setTimeout(() => pollVideo(id), finalizing ? 3000 : 5000);
      if (!elapsedTimer) elapsedTimer = setInterval(() => {
        const node = $("#videoElapsedTime");
        if (node) node.textContent = elapsedLabel(activeStartedAt);
      }, 1000);
    } catch (error) {
      renderFinalizing({ downloadError: `Temporary status issue: ${error.message}` });
      pollTimer = setTimeout(() => pollVideo(id), 5000);
    }
  }

  async function loadVideos() {
    const grid = $("#videoLibraryGrid");
    if (!grid) return;
    try {
      const payload = await request("/api/video-studio");
      const videos = payload.videos || [];
      grid.innerHTML = videos.length ? videos.map(video => `<article class="video-card"><div class="video-card-preview">${video.videoUrl ? `<video muted playsinline preload="metadata" src="${video.videoUrl}"></video>` : `<span>🎥</span>`}</div><div class="video-card-body"><strong>${video.videoUrl ? "Completed video" : video.status === "failed" ? "Stopped video" : "Video in production"}</strong><small>${escapeHtml(video.model)} • ${escapeHtml(video.seconds)}s • ${escapeHtml(video.size)}</small><small>${escapeHtml(String(video.prompt || "").slice(0, 110))}</small>${video.videoUrl ? `<button data-open-video="${video.videoUrl}">Open video</button>` : `<button data-resume-video="${video.id}">Check status</button>`}</div></article>`).join("") : `<div class="loading">No generated videos yet.</div>`;
      $$('[data-open-video]', grid).forEach(button => button.addEventListener("click", () => window.open(button.dataset.openVideo, "_blank")));
      $$('[data-resume-video]', grid).forEach(button => button.addEventListener("click", () => { activeStartedAt = Date.now(); pollVideo(button.dataset.resumeVideo, true); }));
    } catch (error) { grid.innerHTML = `<div class="loading">${escapeHtml(error.message)}</div>`; }
  }

  function boot() {
    addNavigation();
    addPage();
    updateReferenceStatus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
