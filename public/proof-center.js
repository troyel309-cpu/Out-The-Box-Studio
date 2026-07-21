(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]));

  const state = { projects: [], videos: [], assets: [] };

  function latestImage(project) {
    const artifacts = Array.isArray(project?.artifacts) ? project.artifacts : [];
    return [...artifacts].reverse().find(item => item?.type === "image" && item?.url);
  }

  function download(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "out-the-box-asset";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text || "");
      const original = button.textContent;
      button.textContent = "Copied ✓";
      setTimeout(() => { button.textContent = original; }, 1400);
    } catch {
      window.prompt("Copy this prompt:", text || "");
    }
  }

  async function loadData() {
    const safeJson = async url => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return [];
        const data = await response.json();
        if (Array.isArray(data)) return data;
        return data.projects || data.videos || data.assets || [];
      } catch {
        return [];
      }
    };

    const [projects, videos, assets] = await Promise.all([
      safeJson("/api/projects"),
      safeJson("/api/video-studio"),
      safeJson("/api/assets")
    ]);

    state.projects = projects;
    state.videos = videos;
    state.assets = assets;
    render();
  }

  function renderAssets() {
    const imageRows = state.projects
      .map(project => ({ project, image: latestImage(project) }))
      .filter(row => row.image)
      .slice(0, 6)
      .map(({ project, image }) => `
        <article class="proof-asset-card">
          <div class="proof-preview"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(project.title || "Generated image")}"></div>
          <div class="proof-asset-body">
            <span class="proof-kind">IMAGE</span>
            <h4>${escapeHtml(project.title || "Studio creation")}</h4>
            <p>${escapeHtml(project.idea || image.content || "Generated with Out the Box Studio")}</p>
            <div class="proof-actions">
              <button data-download="${escapeHtml(image.url)}" data-filename="${escapeHtml(image.name || "otb-image.png")}">Download</button>
              <button data-copy="${escapeHtml(image.finalPrompt || image.content || project.idea || "")}">Copy prompt</button>
            </div>
          </div>
        </article>`).join("");

    const videoRows = state.videos
      .filter(video => video.videoUrl)
      .slice(0, 6)
      .map(video => `
        <article class="proof-asset-card">
          <div class="proof-preview proof-video"><video src="${escapeHtml(video.videoUrl)}" controls preload="metadata"></video></div>
          <div class="proof-asset-body">
            <span class="proof-kind">VIDEO</span>
            <h4>${escapeHtml(video.title || "Finished MP4")}</h4>
            <p>${escapeHtml(video.prompt || "Generated video")}</p>
            <div class="proof-actions">
              <button data-download="${escapeHtml(video.videoUrl)}" data-filename="${escapeHtml((video.id || "otb-video") + ".mp4")}">Download MP4</button>
              <button data-copy="${escapeHtml(video.prompt || "")}">Copy prompt</button>
            </div>
          </div>
        </article>`).join("");

    return videoRows + imageRows || `<div class="proof-empty"><strong>No completed proof yet.</strong><span>Create an image or finish a video, then refresh this center.</span></div>`;
  }

  function render() {
    const completedVideos = state.videos.filter(video => video.videoUrl).length;
    const completedImages = state.projects.filter(project => latestImage(project)).length;
    const totalBytes = state.assets.reduce((sum, asset) => sum + Number(asset.sizeBytes || 0), 0);
    const sizeLabel = totalBytes > 1048576 ? `${(totalBytes / 1048576).toFixed(1)} MB` : `${Math.round(totalBytes / 1024)} KB`;

    $("#proofProjectCount").textContent = state.projects.length;
    $("#proofImageCount").textContent = completedImages;
    $("#proofVideoCount").textContent = completedVideos;
    $("#proofAssetSize").textContent = sizeLabel;
    $("#proofAssetGrid").innerHTML = renderAssets();

    document.querySelectorAll("[data-download]", $("#proofCenter")).forEach(button => {
      button.addEventListener("click", () => download(button.dataset.download, button.dataset.filename));
    });
    document.querySelectorAll("[data-copy]", $("#proofCenter")).forEach(button => {
      button.addEventListener("click", () => copyText(button.dataset.copy, button));
    });
  }

  function build() {
    if ($("#proofCenter")) return;

    const launch = document.createElement("button");
    launch.className = "proof-launch";
    launch.innerHTML = "✓ Proof Center";
    launch.setAttribute("aria-label", "Open production proof center");

    const center = document.createElement("div");
    center.id = "proofCenter";
    center.className = "proof-center";
    center.innerHTML = `
      <section class="proof-shell" role="dialog" aria-modal="true" aria-labelledby="proofTitle">
        <header class="proof-header">
          <div><span class="proof-eyebrow">OUT THE BOX STUDIO • V5.2</span><h2 id="proofTitle">Production Proof Center</h2><p>Completed work, measurable output, and one-click exports—all in one judge-ready view.</p></div>
          <button class="proof-close" aria-label="Close proof center">×</button>
        </header>
        <div class="proof-metrics">
          <div><span>Projects</span><strong id="proofProjectCount">—</strong></div>
          <div><span>Generated images</span><strong id="proofImageCount">—</strong></div>
          <div><span>Saved MP4s</span><strong id="proofVideoCount">—</strong></div>
          <div><span>Asset library</span><strong id="proofAssetSize">—</strong></div>
        </div>
        <div class="proof-toolbar"><div><strong>Latest completed assets</strong><span>Preview, download, or reuse the original prompt.</span></div><button id="refreshProofCenter">Refresh proof</button></div>
        <div id="proofAssetGrid" class="proof-asset-grid"><div class="proof-empty">Loading production proof…</div></div>
      </section>`;

    document.body.append(launch, center);

    const open = () => { center.classList.add("open"); loadData(); };
    const close = () => center.classList.remove("open");
    launch.addEventListener("click", open);
    $(".proof-close", center).addEventListener("click", close);
    $("#refreshProofCenter", center).addEventListener("click", loadData);
    center.addEventListener("click", event => { if (event.target === center) close(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build, { once: true });
  else build();
})();
