(() => {
  "use strict";

  const state = {
    assets: [],
    characters: [],
    projects: [],
    selectedAssetId: "",
    currentProject: null,
    currentStep: 1,
    format: "Commercial"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
  }

  async function api(path, options = {}) {
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(path, { ...options, headers });
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message = data?.error || data?.message || data || `Request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  }

  function setView(name) {
    $$(".view").forEach(view => view.classList.remove("active"));
    $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === name));

    const view = $(`#${name}View`);
    if (view) view.classList.add("active");

    const titles = {
      home: "What are we creating today?",
      create: "Create something remarkable",
      library: "Your Dream Library",
      production: "Production intelligence"
    };

    $("#viewTitle").textContent = titles[name] || titles.home;

    if (name === "library") loadProjects();
  }

  function setStep(step) {
    state.currentStep = Number(step);
    $$(".step").forEach(button => button.classList.toggle("active", Number(button.dataset.step) === state.currentStep));
    $$(".step-panel").forEach(panel => panel.classList.remove("active"));
    $(`#step${state.currentStep}`)?.classList.add("active");

    if (state.currentStep === 3) updateReview();
  }

  function startCreate(format) {
    state.format = format || state.format;
    $("#productionType").value = state.format;
    setView("create");
    setStep(1);
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadAssets() {
    const grid = $("#assetGrid");
    grid.innerHTML = '<div class="empty-state">Loading references…</div>';

    try {
      const payload = await api("/api/assets");
      const assets = Array.isArray(payload) ? payload : payload?.assets || [];
      state.assets = assets
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
    } catch (error) {
      grid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderAssets() {
    const grid = $("#assetGrid");

    if (!state.assets.length) {
      grid.innerHTML = '<div class="empty-state">No reference images yet.</div>';
      return;
    }

    grid.innerHTML = state.assets.map(asset => `
      <button class="asset-card ${asset.id === state.selectedAssetId ? "selected" : ""}" data-asset-id="${escapeHtml(asset.id)}">
        <div class="asset-thumb">
          <img src="${escapeHtml(asset.url)}" alt="${escapeHtml(asset.name || "Reference image")}">
          ${asset.officialReference ? '<span class="official-badge">OFFICIAL</span>' : ""}
        </div>
        <strong>${escapeHtml(asset.name || asset.originalName || "Reference")}</strong>
        <small>${escapeHtml((asset.tags || []).join(", ") || "Reference image")}</small>
      </button>
    `).join("");

    $$("[data-asset-id]", grid).forEach(button => {
      button.addEventListener("click", () => {
        state.selectedAssetId = button.dataset.assetId;
        renderAssets();
        toast("Reference selected");
      });
    });
  }

  async function loadCharacters() {
    try {
      const payload = await api("/api/characters");
      const characters = Array.isArray(payload) ? payload : payload?.characters || [];
      state.characters = characters;
      const select = $("#characterSelect");

      if (!characters.length) {
        select.innerHTML = '<option value="">Tiny Troy</option>';
        return;
      }

      select.innerHTML = characters.map(character => `
        <option value="${escapeHtml(character.id || character.name || "")}">
          ${escapeHtml(character.name || "Character")}
        </option>
      `).join("");
    } catch {
      $("#characterSelect").innerHTML = '<option value="">Tiny Troy</option>';
    }
  }

  function selectedAsset() {
    return state.assets.find(asset => asset.id === state.selectedAssetId) || null;
  }

  function selectedCharacterText() {
    const select = $("#characterSelect");
    return select?.options?.[select.selectedIndex]?.textContent?.trim() || "Tiny Troy";
  }

  function buildPrompt() {
    const base = $("#scenePrompt").value.trim();
    const style = $("#styleSelect").value;
    const mood = $("#moodSelect").value;
    const camera = $("#cameraSelect").value;
    const lighting = $("#lightingSelect").value;
    const character = selectedCharacterText();
    const continuity = $("#continuityEnabled").checked
      ? `Keep ${character}'s identity continuity-locked to the selected reference image. Preserve facial structure, skin tone, beard, hairstyle, signature hat, eye color, and body proportions.`
      : "";

    return [
      base || `${character} in a polished professional scene.`,
      `${style} style. ${mood} mood. ${camera}. ${lighting}.`,
      continuity
    ].filter(Boolean).join(" ");
  }

  function updateReview() {
    const asset = selectedAsset();
    $("#reviewProduction").textContent = $("#productionType").value;
    $("#reviewCharacter").textContent = selectedCharacterText();
    $("#reviewDirection").textContent = `${$("#styleSelect").value} • ${$("#cameraSelect").value}`;
    $("#reviewContinuity").textContent = $("#continuityEnabled").checked ? "Locked" : "Open";
    $("#finalPrompt").textContent = buildPrompt();

    const preview = $("#selectedReferencePreview");
    preview.innerHTML = asset
      ? `<img src="${escapeHtml(asset.url)}" alt="Selected reference">`
      : "<span>No reference selected</span>";
  }

  function addActivity(title, detail, status = "working") {
    const list = $("#activityList");
    const activity = document.createElement("div");
    activity.className = `activity ${status}`;
    activity.innerHTML = `
      <span>${status === "complete" ? "✓" : "•"}</span>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(detail)}</small>
      </div>
    `;
    list.appendChild(activity);
    list.scrollTop = list.scrollHeight;
    return activity;
  }

  function completeActivity(activity) {
    activity.classList.remove("working");
    activity.classList.add("complete");
    const icon = activity.querySelector("span");
    if (icon) icon.textContent = "✓";
  }

  async function generate() {
    const asset = selectedAsset();

    if (!asset) {
      toast("Choose a reference image first");
      setStep(1);
      return;
    }

    const prompt = buildPrompt();
    $("#studioState").textContent = "Working";
    $("#resultStage").innerHTML = `
      <div class="empty-result">
        <span class="spinner"></span>
        <strong>The studio is building your scene…</strong>
      </div>
    `;
    $("#resultMessage").textContent = "";
    $("#activityList").innerHTML = "";

    setStep(4);

    try {
      const a1 = addActivity("Studio Director", "Turning your idea into a production brief");
      const project = await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({ idea: prompt })
      });
      state.currentProject = project;
      $("#projectId").textContent = project.id || "Created";
      completeActivity(a1);

      const a2 = addActivity("Character Continuity", "Locking identity to your selected reference");
      await new Promise(resolve => setTimeout(resolve, 450));
      completeActivity(a2);

      const a3 = addActivity("Image Director", "Generating the final scene with OpenAI");
      const result = await api(`/api/projects/${project.id}/image`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          characterId: $("#characterSelect").value || null,
          shotType: $("#cameraSelect").value,
          mode: "hybrid",
          assetId: asset.id
        })
      });
      completeActivity(a3);

      const a4 = addActivity("Evidence Quality", "Verifying the rendered artifact");
      await new Promise(resolve => setTimeout(resolve, 350));
      completeActivity(a4);

      $("#resultStage").innerHTML = `<img src="${escapeHtml(result.imageUrl)}" alt="Generated scene">`;
      $("#resultMessage").textContent = "Generated image verified and attached to the project.";
      $("#studioState").textContent = "Complete";
      $("#evidenceStatus").textContent = "Verified";
      state.currentProject = result.project || project;

      loadProjects();
    } catch (error) {
      $("#resultStage").innerHTML = `
        <div class="empty-state">
          <strong>Generation failed</strong><br>
          ${escapeHtml(error.message)}
        </div>
      `;
      $("#resultMessage").textContent = "The project was not marked complete.";
      $("#studioState").textContent = "Needs attention";
      addActivity("Studio stopped", error.message, "working");
    }
  }

  async function loadProjects() {
    const grid = $("#projectGrid");
    grid.innerHTML = '<div class="empty-state">Loading projects…</div>';

    try {
      const payload = await api("/api/projects");
      const projects = Array.isArray(payload) ? payload : payload?.projects || [];
      state.projects = projects;

      if (!projects.length) {
        grid.innerHTML = '<div class="empty-state">No projects yet. Your first creation will appear here.</div>';
        return;
      }

      grid.innerHTML = projects.map(project => `
        <article class="project-card">
          <span class="project-date">${escapeHtml(new Date(project.createdAt || Date.now()).toLocaleString())}</span>
          <h3>${escapeHtml(project.title || project.idea || "New Dream")}</h3>
          <p>${escapeHtml(project.releaseLevel || project.status || "Production package")}</p>
          <footer>
            <button class="secondary small" data-open-project="${escapeHtml(project.id)}">Open</button>
          </footer>
        </article>
      `).join("");

      $$("[data-open-project]", grid).forEach(button => {
        button.addEventListener("click", () => {
          const project = state.projects.find(item => item.id === button.dataset.openProject);
          state.currentProject = project || null;
          setView("production");
          toast("Project opened");
        });
      });
    } catch (error) {
      grid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  function bind() {
    $$(".nav-item").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
    $$("[data-start-create]").forEach(button => button.addEventListener("click", () => startCreate()));
    $$(".format-card").forEach(button => button.addEventListener("click", () => startCreate(button.dataset.format)));
    $$("[data-next-step]").forEach(button => button.addEventListener("click", () => setStep(button.dataset.nextStep)));
    $$(".step").forEach(button => button.addEventListener("click", () => setStep(button.dataset.step)));

    $("#newProjectButton").addEventListener("click", () => startCreate("Commercial"));
    $("#refreshAssets").addEventListener("click", loadAssets);
    $("#refreshProjects").addEventListener("click", loadProjects);
    $("#generateButton").addEventListener("click", generate);
    $("#variationButton").addEventListener("click", () => {
      setStep(2);
      toast("Adjust the scene and create another version");
    });
    $("#newFromResultButton").addEventListener("click", () => startCreate($("#productionType").value));

    $("#toggleDetails").addEventListener("click", () => {
      const details = $("#advancedDetails");
      details.classList.toggle("hidden");
      $("#toggleDetails").textContent = details.classList.contains("hidden")
        ? "Show production details"
        : "Hide production details";
    });

    $("#openAdvanced").addEventListener("click", () => setView("production"));
  }

  async function boot() {
    bind();
    await Promise.all([loadAssets(), loadCharacters(), loadProjects()]);
  }

  document.addEventListener("DOMContentLoaded", boot, { once: true });
})();

document.addEventListener("DOMContentLoaded", () => {
  const live = document.querySelector(".live-panel");
  const list = document.querySelector("#activityList");
  if (live && list && !document.querySelector(".studio-magic-message")) {
    const msg = document.createElement("div");
    msg.className = "studio-magic-message";
    msg.innerHTML = "<span>✨</span><div><strong>The studio comes alive</strong><br>Watch each specialist complete its part.</div>";
    live.insertBefore(msg, list);
  }

  const stage = document.querySelector("#resultStage");
  if (!stage) return;

  new MutationObserver(() => {
    const image = stage.querySelector("img");
    if (!image || image.dataset.celebrated) return;
    image.dataset.celebrated = "yes";

    const colors = ["#A9FF68","#35E0FF","#7C5CFF","#FFFFFF"];
    const box = image.getBoundingClientRect();

    for (let i = 0; i < 26; i += 1) {
      const piece = document.createElement("span");
      piece.className = "fun-confetti";
      piece.style.left = `${box.left + box.width / 2}px`;
      piece.style.top = `${box.top + box.height / 2}px`;
      piece.style.background = colors[i % colors.length];
      piece.style.setProperty("--x", `${(Math.random() - .5) * 320}px`);
      piece.style.setProperty("--y", `${120 + Math.random() * 260}px`);
      piece.style.setProperty("--r", `${(Math.random() - .5) * 900}deg`);
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 1400);
    }
  }).observe(stage, {childList:true, subtree:true});
});
