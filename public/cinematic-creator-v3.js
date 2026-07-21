(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const templates = [
    {
      id: "tiny-troy-sale",
      name: "Tiny Troy Sales Moment",
      icon: "🧸",
      production: "Character Scene",
      style: "Polished 3D mascot",
      prompt: "Tiny Troy welcoming a customer into a bright modern showroom and handing them the keys to their new vehicle.",
      mood: "Warm, exciting, trustworthy",
      camera: "Medium cinematic shot",
      lighting: "Bright premium showroom lighting"
    },
    {
      id: "social-hook",
      name: "Social Attention Hook",
      icon: "📱",
      production: "Social Post",
      style: "Commercial advertising",
      prompt: "Create a bold social media visual with a strong central character, clear emotional reaction, dynamic composition, and room for a short truthful headline.",
      mood: "High energy and confident",
      camera: "Close-up hero framing",
      lighting: "Punchy commercial lighting"
    },
    {
      id: "commercial",
      name: "30-Second Commercial",
      icon: "🎬",
      production: "Commercial",
      style: "Cinematic realism",
      prompt: "Create the hero image for a cinematic 30-second commercial that introduces the character, product, and emotional promise in one memorable scene.",
      mood: "Premium and inspiring",
      camera: "Wide cinematic hero shot",
      lighting: "Cinematic rim lighting"
    },
    {
      id: "storyboard",
      name: "Storyboard Opening",
      icon: "🖼️",
      production: "Storyboard",
      style: "Graphic novel",
      prompt: "Create the opening storyboard frame that clearly establishes the character, location, action, and visual direction for the sequence.",
      mood: "Focused and story-driven",
      camera: "Wide establishing shot",
      lighting: "Natural directional lighting"
    },
    {
      id: "game-world",
      name: "Game World Concept",
      icon: "🎮",
      production: "Game Asset",
      style: "Animated feature",
      prompt: "Create a polished game-world concept image featuring the main character, environmental storytelling, a clear focal point, and production-ready visual direction.",
      mood: "Adventurous and immersive",
      camera: "Epic wide-angle shot",
      lighting: "Atmospheric world lighting"
    }
  ];

  const state = {
    focusMode: false,
    selectedTemplate: null
  };

  function mountCreatorBar() {
    if ($("#creatorBar")) return;

    const top = $(".top-command");
    if (!top) return;

    const bar = document.createElement("div");
    bar.id = "creatorBar";
    bar.className = "creator-bar";
    bar.innerHTML = `
      <button id="templateLauncher"><span>✦</span><b>Templates</b></button>
      <button id="focusModeButton"><span>⛶</span><b>Focus Mode</b></button>
      <button id="commandPaletteButton"><span>⌘</span><b>Commands</b><kbd>⌘ K</kbd></button>
      <div class="creator-hint">Press <kbd>⌘ Enter</kbd> to bring the idea to life</div>
    `;

    top.insertAdjacentElement("afterend", bar);

    $("#templateLauncher").addEventListener("click", openTemplates);
    $("#focusModeButton").addEventListener("click", toggleFocusMode);
    $("#commandPaletteButton").addEventListener("click", openCommandPalette);
  }

  function mountTemplateDrawer() {
    if ($("#templateDrawer")) return;

    const drawer = document.createElement("div");
    drawer.id = "templateDrawer";
    drawer.className = "template-drawer";
    drawer.innerHTML = `
      <div class="drawer-backdrop" data-close-templates></div>
      <aside class="drawer-panel">
        <div class="drawer-head">
          <div>
            <p>CREATIVE STARTING POINTS</p>
            <h2>Choose a production template</h2>
          </div>
          <button data-close-templates>×</button>
        </div>

        <div class="template-grid">
          ${templates.map(template => `
            <button class="template-card" data-template-id="${template.id}">
              <span>${template.icon}</span>
              <strong>${template.name}</strong>
              <small>${template.production} • ${template.style}</small>
            </button>
          `).join("")}
        </div>

        <div class="template-preview">
          <p>SELECTED DIRECTION</p>
          <h3 id="templatePreviewName">Choose a template</h3>
          <div id="templatePreviewCopy">Templates fill in the starting direction while leaving you in control.</div>
          <button id="applyTemplateButton" disabled>Use this template</button>
        </div>
      </aside>
    `;

    document.body.appendChild(drawer);

    $$("[data-close-templates]", drawer).forEach(button => {
      button.addEventListener("click", closeTemplates);
    });

    $$(".template-card", drawer).forEach(button => {
      button.addEventListener("click", () => selectTemplate(button.dataset.templateId));
    });

    $("#applyTemplateButton").addEventListener("click", applySelectedTemplate);
  }

  function mountBriefPanel() {
    if ($("#creativeBriefPanel")) return;

    const ideaDock = $(".idea-dock");
    if (!ideaDock) return;

    const panel = document.createElement("aside");
    panel.id = "creativeBriefPanel";
    panel.className = "creative-brief-panel";
    panel.innerHTML = `
      <div class="brief-head">
        <div>
          <p>LIVE CREATIVE BRIEF</p>
          <h3>Your direction</h3>
        </div>
        <span id="briefReadiness">Needs idea</span>
      </div>

      <div class="brief-grid">
        <div><span>Format</span><strong id="briefFormat">Commercial</strong></div>
        <div><span>Character</span><strong id="briefCharacter">Tiny Troy</strong></div>
        <div><span>Style</span><strong id="briefStyle">Polished 3D mascot</strong></div>
        <div><span>Reference</span><strong id="briefReference">Selected</strong></div>
      </div>

      <div class="brief-direction">
        <span>Scene direction</span>
        <p id="briefPrompt">Describe what you want to bring to life.</p>
      </div>
    `;

    ideaDock.insertAdjacentElement("afterend", panel);
    updateBrief();
  }

  function mountCommandPalette() {
    if ($("#commandPalette")) return;

    const palette = document.createElement("div");
    palette.id = "commandPalette";
    palette.className = "command-palette";
    palette.innerHTML = `
      <div class="command-backdrop"></div>
      <div class="command-window">
        <div class="command-input">
          <span>⌕</span>
          <input id="commandSearch" placeholder="Type a command or search…">
          <kbd>ESC</kbd>
        </div>
        <div id="commandResults" class="command-results"></div>
      </div>
    `;

    document.body.appendChild(palette);
    $(".command-backdrop", palette).addEventListener("click", closeCommandPalette);
    $("#commandSearch").addEventListener("input", renderCommands);
  }

  function commands() {
    return [
      { icon: "✦", name: "Open production templates", action: () => { closeCommandPalette(); openTemplates(); } },
      { icon: "⛶", name: state.focusMode ? "Exit Focus Mode" : "Enter Focus Mode", action: () => { closeCommandPalette(); toggleFocusMode(); } },
      { icon: "⚡", name: "Bring current idea to life", action: () => { closeCommandPalette(); $("#createDreamButton")?.click(); } },
      { icon: "◈", name: "Open Dream Library", action: () => { closeCommandPalette(); $('.rail-action[data-section="library"]')?.click(); } },
      { icon: "⚙", name: "Open Production Intelligence", action: () => { closeCommandPalette(); $('.rail-action[data-section="production"]')?.click(); } },
      { icon: "＋", name: "Start a new dream", action: () => { closeCommandPalette(); $("#newDreamTop")?.click(); } },
      { icon: "📦", name: "Jump to reference assets", action: () => { closeCommandPalette(); $(".reference-floor")?.scrollIntoView({ behavior: "smooth" }); } }
    ];
  }

  function renderCommands() {
    const query = ($("#commandSearch")?.value || "").toLowerCase().trim();
    const results = commands().filter(command => command.name.toLowerCase().includes(query));
    const container = $("#commandResults");

    container.innerHTML = results.map((command, index) => `
      <button data-command-index="${index}">
        <span>${command.icon}</span>
        <strong>${command.name}</strong>
        <small>Run</small>
      </button>
    `).join("") || `<div class="no-command">No matching commands</div>`;

    $$("[data-command-index]", container).forEach((button, index) => {
      button.addEventListener("click", results[index].action);
    });
  }

  function openTemplates() {
    $("#templateDrawer").classList.add("open");
    document.body.classList.add("modal-open");
  }

  function closeTemplates() {
    $("#templateDrawer").classList.remove("open");
    document.body.classList.remove("modal-open");
  }

  function selectTemplate(id) {
    state.selectedTemplate = templates.find(template => template.id === id) || null;

    $$(".template-card").forEach(card => {
      card.classList.toggle("selected", card.dataset.templateId === id);
    });

    $("#templatePreviewName").textContent = state.selectedTemplate?.name || "Choose a template";
    $("#templatePreviewCopy").innerHTML = state.selectedTemplate
      ? `
        <p>${state.selectedTemplate.prompt}</p>
        <div class="preview-tags">
          <span>${state.selectedTemplate.mood}</span>
          <span>${state.selectedTemplate.camera}</span>
          <span>${state.selectedTemplate.lighting}</span>
        </div>
      `
      : "Templates fill in the starting direction while leaving you in control.";

    $("#applyTemplateButton").disabled = !state.selectedTemplate;
  }

  function applySelectedTemplate() {
    const template = state.selectedTemplate;
    if (!template) return;

    $("#productionType").value = template.production;
    $("#styleSelect").value = template.style;
    $("#ideaInput").value = [
      template.prompt,
      `Mood: ${template.mood}.`,
      `Camera: ${template.camera}.`,
      `Lighting: ${template.lighting}.`
    ].join(" ");

    $("#ideaInput").dispatchEvent(new Event("input", { bubbles: true }));
    updateBrief();
    closeTemplates();

    $(".idea-dock").scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => $("#ideaInput").focus(), 450);
  }

  function toggleFocusMode() {
    state.focusMode = !state.focusMode;
    document.body.classList.toggle("creator-focus-mode", state.focusMode);
    $("#focusModeButton b").textContent = state.focusMode ? "Exit Focus" : "Focus Mode";
  }

  function openCommandPalette() {
    $("#commandPalette").classList.add("open");
    $("#commandSearch").value = "";
    renderCommands();
    setTimeout(() => $("#commandSearch").focus(), 50);
  }

  function closeCommandPalette() {
    $("#commandPalette").classList.remove("open");
  }

  function updateBrief() {
    const idea = ($("#ideaInput")?.value || "").trim();
    const format = $("#productionType")?.value || "Commercial";
    const style = $("#styleSelect")?.value || "Polished 3D mascot";
    const characterSelect = $("#characterSelect");
    const character = characterSelect?.options?.[characterSelect.selectedIndex]?.textContent?.trim() || "Tiny Troy";
    const referenceSelected = Boolean(document.querySelector(".asset-card.selected"));

    $("#briefFormat").textContent = format;
    $("#briefCharacter").textContent = character;
    $("#briefStyle").textContent = style;
    $("#briefReference").textContent = referenceSelected ? "Selected" : "Needed";
    $("#briefPrompt").textContent = idea || "Describe what you want to bring to life.";

    const ready = idea.length >= 12 && referenceSelected;
    $("#briefReadiness").textContent = ready ? "Ready to create" : idea ? "Choose reference" : "Needs idea";
    $("#briefReadiness").classList.toggle("ready", ready);
  }

  function bindShortcuts() {
    document.addEventListener("keydown", event => {
      const isMacCommand = event.metaKey || event.ctrlKey;

      if (isMacCommand && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommandPalette();
      }

      if (isMacCommand && event.key === "Enter") {
        event.preventDefault();
        $("#createDreamButton")?.click();
      }

      if (event.key === "Escape") {
        closeCommandPalette();
        closeTemplates();
        if (state.focusMode) toggleFocusMode();
      }
    });
  }

  function bindBriefUpdates() {
    ["#ideaInput", "#productionType", "#characterSelect", "#styleSelect"].forEach(selector => {
      $(selector)?.addEventListener("input", updateBrief);
      $(selector)?.addEventListener("change", updateBrief);
    });

    $("#assetRail")?.addEventListener("click", () => setTimeout(updateBrief, 0));
  }

  function boot() {
    mountCreatorBar();
    mountTemplateDrawer();
    mountBriefPanel();
    mountCommandPalette();
    bindShortcuts();
    bindBriefUpdates();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
