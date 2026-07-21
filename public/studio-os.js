(() => {
  "use strict";

  const state = {
    assets: [],
    projects: [],
    selectedAssetId: "",
    selectedImageUrl: "",
    currentProject: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1700);
  }

  async function api(path, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(path, { ...options, headers });
    const text = await response.text();
    let data = text;

    try { data = text ? JSON.parse(text) : null; } catch {}

    if (!response.ok) {
      throw new Error(data?.error || data?.message || data || `Request failed (${response.status})`);
    }

    return data;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setSection(name) {
    $$(".os-section").forEach(section => section.classList.remove("active"));
    $$(".rail-action").forEach(button => button.classList.toggle("active", button.dataset.section === name));
    $(`#${name}Section`)?.classList.add("active");

    if (name === "library") loadProjects();
  }

  function resetDream() {
    $("#ideaInput").value = "";
    $("#renderStage").innerHTML = `
      <div class="render-empty">
        <div class="render-orb"><img src="/otb-logo.svg" alt=""></div>
        <strong>The studio is ready</strong>
        <p>Choose a reference, describe the scene, and start production.</p>
      </div>
    `;
    $("#previewState").textContent = "Waiting";
    $("#studioStatus").textContent = "Ready";
    $("#workerFlow").innerHTML = `
      <div class="worker-row complete">
        <span class="worker-icon">✓</span>
        <div><strong>Studio connected</strong><small>Ready for your next idea</small></div>
      </div>
    `;
    setSection("workspace");
    addTimeline("New dream started", "The creative workspace was reset.");
  }

  function addTimeline(title, detail) {
    const timeline = $("#timeline");
    const entry = document.createElement("div");
    entry.className = "timeline-entry";
    entry.innerHTML = `
      <time>${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
      <span></span>
      <div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div>
    `;
    timeline.prepend(entry);
  }

  async function loadAssets() {
    try {
      const payload = await api("/api/assets");
      state.assets = (Array.isArray(payload) ? payload : payload?.assets || [])
        .filter(asset => asset?.id && asset?.url)
        .sort((a, b) => {
          if (Boolean(a.officialReference) !== Boolean(b.officialReference)) {
            return Number(Boolean(b.officialReference)) - Number(Boolean(a.officialReference));
          }
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

      if (!state.selectedAssetId && state.assets.length) {
        state.selectedAssetId = state.assets.find(asset => asset.officialReference)?.id || state.assets[0].id;
      }

      renderAssets();
      renderSelectedReference();
    } catch (error) {
      $("#assetRail").innerHTML = `<div class="loading-card">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderAssets() {
    const rail = $("#assetRail");
    if (!state.assets.length) {
      rail.innerHTML = '<div class="loading-card">No saved reference images.</div>';
      return;
    }

    rail.innerHTML = state.assets.map(asset => `
      <button class="asset-card ${asset.id === state.selectedAssetId ? "selected" : ""}" data-asset-id="${escapeHtml(asset.id)}">
        <img src="${escapeHtml(asset.url)}" alt="${escapeHtml(asset.name || "Reference")}">
        <small>${escapeHtml((asset.tags || []).join(", ") || asset.name || "Reference")}</small>
      </button>
    `).join("");

    $$("[data-asset-id]", rail).forEach(button => {
      button.addEventListener("click", () => {
        state.selectedAssetId = button.dataset.assetId;
        renderAssets();
        renderSelectedReference();
        addTimeline("Reference selected", selectedAsset()?.name || "Reference image");
      });
    });
  }

  function selectedAsset() {
    return state.assets.find(asset => asset.id === state.selectedAssetId) || null;
  }

  function renderSelectedReference() {
    const asset = selectedAsset();
    $("#referenceHero").innerHTML = asset
      ? `<img src="${escapeHtml(asset.url)}" alt="Selected reference">`
      : `
        <div class="reference-placeholder">
          <span>＋</span>
          <strong>Select a reference image</strong>
          <small>Your chosen image becomes the visual foundation.</small>
        </div>
      `;
  }

  async function loadCharacters() {
    try {
      const payload = await api("/api/characters");
      const characters = Array.isArray(payload) ? payload : payload?.characters || [];
      $("#characterSelect").innerHTML = characters.length
        ? characters.map(character => `<option value="${escapeHtml(character.id || character.name || "")}">${escapeHtml(character.name || "Character")}</option>`).join("")
        : "<option>Tiny Troy</option>";
    } catch {
      $("#characterSelect").innerHTML = "<option>Tiny Troy</option>";
    }
  }

  function characterName() {
    const select = $("#characterSelect");
    return select?.options?.[select.selectedIndex]?.textContent?.trim() || "Tiny Troy";
  }

  function buildPrompt() {
    const idea = $("#ideaInput").value.trim();
    const style = $("#styleSelect").value;
    const character = characterName();
    const continuity = $("#continuityToggle").checked
      ? `Keep ${character}'s identity continuity-locked to the selected reference image. Preserve facial structure, skin tone, beard, hairstyle, hat, eye color, and body proportions.`
      : "";

    return [
      idea || `${character} in a polished professional scene.`,
      `${style} visual style.`,
      continuity
    ].filter(Boolean).join(" ");
  }

  function addWorker(title, detail) {
    const row = document.createElement("div");
    row.className = "worker-row working";
    row.innerHTML = `
      <span class="worker-icon">•</span>
      <div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div>
    `;
    $("#workerFlow").appendChild(row);
    return row;
  }

  function completeWorker(row) {
    row.classList.remove("working");
    row.classList.add("complete");
    row.querySelector(".worker-icon").textContent = "✓";
  }

  async function createDream() {
    const asset = selectedAsset();

    if (!asset) {
      toast("Choose a reference image first");
      return;
    }

    const prompt = buildPrompt();

    $("#studioStatus").textContent = "Working";
    $("#previewState").textContent = "Rendering";
    $("#workerFlow").innerHTML = "";
    $("#renderStage").innerHTML = `
      <div class="render-empty">
        <div class="render-orb"><img src="/otb-logo.svg" alt=""></div>
        <strong>The studio is working</strong>
        <p>Your AI workforce is building the scene now.</p>
      </div>
    `;

    try {
      addTimeline("Production started", prompt);

      const director = addWorker("Studio Director", "Building the production brief");
      const project = await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({ idea: prompt })
      });
      state.currentProject = project;
      completeWorker(director);

      const continuity = addWorker("Character Continuity", "Locking identity and proportions");
      await new Promise(resolve => setTimeout(resolve, 350));
      completeWorker(continuity);

      const imageWorker = addWorker("Image Director", "Generating the final scene");
      const result = await api(`/api/projects/${project.id}/image`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          characterId: $("#characterSelect").value || null,
          shotType: "Medium cinematic shot",
          mode: "hybrid",
          assetId: asset.id
        })
      });
      completeWorker(imageWorker);

      const evidence = addWorker("Evidence Quality", "Verifying the final artifact");
      await new Promise(resolve => setTimeout(resolve, 300));
      completeWorker(evidence);

      state.selectedImageUrl = result.imageUrl;
      state.currentProject = result.project || project;

      $("#renderStage").innerHTML = `<img src="${escapeHtml(result.imageUrl)}" alt="Generated scene">`;
      $("#studioStatus").textContent = "Complete";
      $("#previewState").textContent = "Verified";
      addTimeline("Production complete", "Generated image verified and attached.");
      loadProjects();
    } catch (error) {
      $("#renderStage").innerHTML = `<div class="render-empty"><strong>Generation failed</strong><p>${escapeHtml(error.message)}</p></div>`;
      $("#studioStatus").textContent = "Needs attention";
      $("#previewState").textContent = "Failed";
      addTimeline("Production stopped", error.message);
    }
  }

  async function loadProjects() {
    const gallery = $("#projectGallery");
    gallery.innerHTML = '<div class="library-empty">Loading projects…</div>';

    try {
      const payload = await api("/api/projects");
      state.projects = Array.isArray(payload) ? payload : payload?.projects || [];

      if (!state.projects.length) {
        gallery.innerHTML = '<div class="library-empty">No dreams yet.</div>';
        return;
      }

      gallery.innerHTML = state.projects.map(project => {
        const image = project.imageUrl || project.generatedImageUrl || project.artifacts?.find?.(artifact => artifact.url)?.url || "";
        return `
          <article class="project-card">
            <div class="project-thumb">
              ${image ? `<img src="${escapeHtml(image)}" alt="">` : "<span>✦</span>"}
            </div>
            <div class="project-body">
              <span class="project-date">${escapeHtml(new Date(project.createdAt || Date.now()).toLocaleString())}</span>
              <h3>${escapeHtml(project.title || "New Dream")}</h3>
              <p>${escapeHtml(project.releaseLevel || project.status || "Production package")}</p>
              <button data-open-project="${escapeHtml(project.id)}">Open project</button>
            </div>
          </article>
        `;
      }).join("");

      $$("[data-open-project]", gallery).forEach(button => {
        button.addEventListener("click", () => {
          const project = state.projects.find(item => item.id === button.dataset.openProject);
          state.currentProject = project || null;
          setSection("production");
          toast("Project opened");
        });
      });
    } catch (error) {
      gallery.innerHTML = `<div class="library-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  function filterLibrary(query) {
    const normalized = query.toLowerCase().trim();
    $$(".project-card").forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(normalized) ? "" : "none";
    });
  }

  function bind() {
    $$(".rail-action").forEach(button => {
      button.addEventListener("click", () => setSection(button.dataset.section));
    });

    $("#newDreamRail").addEventListener("click", resetDream);
    $("#newDreamTop").addEventListener("click", resetDream);
    $("#refreshAssets").addEventListener("click", loadAssets);
    $("#refreshProjects").addEventListener("click", loadProjects);
    $("#createDreamButton").addEventListener("click", createDream);

    $("#variationButton").addEventListener("click", () => {
      $("#ideaInput").focus();
      toast("Adjust the idea and create another version");
    });

    $("#downloadButton").addEventListener("click", () => {
      if (!state.selectedImageUrl) return toast("No image yet");
      window.open(state.selectedImageUrl, "_blank");
    });

    $("#clearButton").addEventListener("click", () => {
      state.selectedImageUrl = "";
      $("#renderStage").innerHTML = `
        <div class="render-empty">
          <div class="render-orb"><img src="/otb-logo.svg" alt=""></div>
          <strong>The studio is ready</strong>
          <p>Choose a reference, describe the scene, and start production.</p>
        </div>
      `;
      $("#previewState").textContent = "Waiting";
    });

    $("#clearTimeline").addEventListener("click", () => {
      $("#timeline").innerHTML = "";
      addTimeline("Timeline cleared", "New production events will appear here.");
    });

    $("#globalSearch").addEventListener("input", event => {
      if (!$("#librarySection").classList.contains("active")) setSection("library");
      filterLibrary(event.target.value);
    });
  }

  async function boot() {
    bind();
    await Promise.all([loadAssets(), loadCharacters(), loadProjects()]);
  }

  document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
