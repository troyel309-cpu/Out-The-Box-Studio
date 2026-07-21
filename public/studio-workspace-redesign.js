(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);

  function findPromptField() {
    return $("#imagePrompt") || $("#prompt") || $("#scenePrompt") ||
      [...document.querySelectorAll("textarea,input[type='text']")].find(el =>
        `${el.id} ${el.name} ${el.placeholder}`.toLowerCase().match(/prompt|scene|describe/)
      );
  }

  function findGenerateButton() {
    return [...document.querySelectorAll("button")].find(button => {
      const text = (button.textContent || "").toLowerCase();
      return text.includes("generate image") ||
        text.includes("build from my picture") ||
        text.includes("generating image");
    });
  }

  function buildShell() {
    if ($("#studioWorkspaceRedesign")) return;

    const imageLabHeading = [...document.querySelectorAll("h1,h2,h3,p")].find(el =>
      (el.textContent || "").trim().toLowerCase() === "image lab"
    );

    const imageLabRoot =
      imageLabHeading?.closest("section") ||
      imageLabHeading?.parentElement?.parentElement ||
      $("#imageOutput")?.closest("section") ||
      $("#imageOutput")?.parentElement;

    if (!imageLabRoot) return;

    const wrapper = document.createElement("section");
    wrapper.id = "studioWorkspaceRedesign";
    wrapper.className = "studio-workspace-redesign";

    wrapper.innerHTML = `
      <div class="studio-topbar">
        <div>
          <p class="studio-kicker">OUT THE BOX STUDIO</p>
          <h2>Creative Workspace</h2>
          <p class="studio-subtitle">Pick a reference, direct the scene, generate, review.</p>
        </div>
        <div class="studio-status">
          <span class="studio-status-dot"></span>
          Studio ready
        </div>
      </div>

      <div class="studio-workspace-grid">
        <aside class="studio-pane studio-assets-pane">
          <div class="studio-pane-heading">
            <span>1</span>
            <div>
              <h3>Choose</h3>
              <p>Reference and character</p>
            </div>
          </div>
          <div id="studioAssetsMount"></div>
        </aside>

        <main class="studio-pane studio-preview-pane">
          <div class="studio-pane-heading">
            <span>2</span>
            <div>
              <h3>Preview</h3>
              <p>Your generated scene</p>
            </div>
          </div>
          <div id="studioPreviewMount"></div>
          <div id="studioPromptMount"></div>
        </main>

        <aside class="studio-pane studio-controls-pane">
          <div class="studio-pane-heading">
            <span>3</span>
            <div>
              <h3>Direct</h3>
              <p>Scene controls</p>
            </div>
          </div>
          <div id="studioControlsMount"></div>
          <div id="studioContinuityMount"></div>
          <div id="studioGenerateMount"></div>
        </aside>
      </div>
    `;

    imageLabRoot.parentNode.insertBefore(wrapper, imageLabRoot);
    imageLabRoot.classList.add("studio-original-lab");
    wrapper.appendChild(imageLabRoot);

    reorganize();
  }

  function moveIfFound(target, element) {
    if (target && element && !target.contains(element)) target.appendChild(element);
  }

  function reorganize() {
    const assetsMount = $("#studioAssetsMount");
    const previewMount = $("#studioPreviewMount");
    const promptMount = $("#studioPromptMount");
    const controlsMount = $("#studioControlsMount");
    const continuityMount = $("#studioContinuityMount");
    const generateMount = $("#studioGenerateMount");

    moveIfFound(assetsMount, $("#referenceGalleryUpgrade"));

    const characterSelect = $("#characterSelect");
    const referenceSelect = $("#referenceAsset");
    const productionMode = $("#productionMode");
    const shotType = $("#shotType");

    [productionMode, referenceSelect, characterSelect, shotType].forEach(el => {
      if (!el) return;
      const label = el.closest("label") || el.parentElement;
      moveIfFound(assetsMount, label);
    });

    moveIfFound(controlsMount, $("#promptDirectorUpgrade"));
    moveIfFound(continuityMount, $("#continuityLockUpgrade"));

    const imageOutput = $("#imageOutput");
    moveIfFound(previewMount, imageOutput);

    const prompt = findPromptField();
    if (prompt) {
      const promptWrap = prompt.closest("label") || prompt.parentElement;
      moveIfFound(promptMount, promptWrap);
    }

    const generateButton = findGenerateButton();
    if (generateButton) {
      const buttonWrap = generateButton.closest(".actions") || generateButton.parentElement;
      moveIfFound(generateMount, buttonWrap);
    }

    const statusText = [...document.querySelectorAll("p,div,span")].find(el => {
      const text = (el.textContent || "").trim();
      return text === "No generated image yet." ||
        text.includes("Image Lab is sending the job");
    });

    if (statusText && imageOutput && !imageOutput.contains(statusText)) {
      moveIfFound(previewMount, statusText);
    }

    simplifyLabels();
    installStickyGenerate();
  }

  function simplifyLabels() {
    const gallery = $("#referenceGalleryUpgrade");
    if (gallery) {
      gallery.classList.add("studio-compact-gallery");
      const title = gallery.querySelector("h3");
      if (title) title.textContent = "Reference images";
    }

    const director = $("#promptDirectorUpgrade");
    if (director) {
      director.classList.add("studio-compact-panel");
      const header = director.querySelector(".pd-header");
      if (header) header.classList.add("studio-collapsible-header");
    }

    const continuity = $("#continuityLockUpgrade");
    if (continuity) {
      continuity.classList.add("studio-compact-panel");
    }
  }

  function installStickyGenerate() {
    const mount = $("#studioGenerateMount");
    const button = findGenerateButton();
    if (!mount || !button) return;

    mount.classList.add("studio-sticky-generate");
    button.classList.add("studio-primary-generate");

    const refreshState = () => {
      const busy = (button.textContent || "").toLowerCase().includes("generating");
      mount.classList.toggle("is-busy", busy);
    };

    new MutationObserver(refreshState).observe(button, {
      childList: true,
      subtree: true,
      characterData: true
    });

    refreshState();
  }

  function boot() {
    buildShell();

    let passes = 0;
    const timer = setInterval(() => {
      reorganize();
      passes += 1;
      if (passes >= 10) clearInterval(timer);
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
