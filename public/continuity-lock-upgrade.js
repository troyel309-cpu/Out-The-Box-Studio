(() => {
  "use strict";

  const STORAGE_KEY = "outTheBoxContinuityProfileV1";
  const $ = (selector, root = document) => root.querySelector(selector);

  const defaults = {
    enabled: true,
    name: "Tiny Troy",
    identity: "Warm brown skin, large brown eyes, short dark hair, neatly shaped full black beard and mustache, small stud earrings, brown fedora",
    wardrobe: "Polished branded outfit suitable for the scene",
    proportions: "Stylized compact mascot proportions with a slightly oversized head and expressive eyes",
    preserve: "Face shape, skin tone, beard shape, hairstyle, fedora, eye color, body proportions, and overall character identity",
    avoid: "Do not change age, ethnicity, facial structure, beard style, eye color, or signature hat. No duplicate limbs, distorted hands, extra fingers, warped face, text artifacts, or inconsistent clothing details."
  };

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return { ...defaults, ...saved };
    } catch {
      return { ...defaults };
    }
  }

  function saveProfile(profile) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  function findPromptField() {
    return $("#imagePrompt") || $("#prompt") || $("#scenePrompt") ||
      [...document.querySelectorAll("textarea,input[type='text']")].find(el =>
        `${el.id} ${el.name} ${el.placeholder}`.toLowerCase().match(/prompt|scene|describe/)
      );
  }

  function buildLockText(profile) {
    if (!profile.enabled) return "";
    return [
      `CONTINUITY LOCK FOR ${profile.name.toUpperCase()}:`,
      `Identity: ${profile.identity}.`,
      `Wardrobe: ${profile.wardrobe}.`,
      `Proportions: ${profile.proportions}.`,
      `Preserve exactly: ${profile.preserve}.`,
      `Restrictions: ${profile.avoid}`
    ].join(" ");
  }

  function collect() {
    return {
      enabled: $("#clEnabled")?.checked ?? true,
      name: $("#clName")?.value.trim() || defaults.name,
      identity: $("#clIdentity")?.value.trim() || defaults.identity,
      wardrobe: $("#clWardrobe")?.value.trim() || defaults.wardrobe,
      proportions: $("#clProportions")?.value.trim() || defaults.proportions,
      preserve: $("#clPreserve")?.value.trim() || defaults.preserve,
      avoid: $("#clAvoid")?.value.trim() || defaults.avoid
    };
  }

  function refreshPreview() {
    const profile = collect();
    saveProfile(profile);
    const preview = $("#clPreview");
    if (preview) {
      preview.textContent = profile.enabled
        ? buildLockText(profile)
        : "Continuity Lock is currently turned off.";
    }

    const badge = $("#clStatusBadge");
    if (badge) {
      badge.textContent = profile.enabled ? "LOCKED" : "OFF";
      badge.classList.toggle("is-off", !profile.enabled);
    }
  }

  function applyToPrompt() {
    const prompt = findPromptField();
    if (!prompt) {
      alert("Image Lab prompt field was not found.");
      return;
    }

    const profile = collect();
    const lockText = buildLockText(profile);

    if (!lockText) {
      alert("Continuity Lock is turned off.");
      return;
    }

    const marker = "CONTINUITY LOCK FOR ";
    let base = prompt.value.trim();

    const markerIndex = base.indexOf(marker);
    if (markerIndex >= 0) {
      base = base.slice(0, markerIndex).trim();
    }

    prompt.value = `${base}${base ? "\n\n" : ""}${lockText}`;
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
    prompt.dispatchEvent(new Event("change", { bubbles: true }));
    prompt.scrollIntoView({ behavior: "smooth", block: "center" });

    const button = $("#clApply");
    if (button) {
      const original = button.textContent;
      button.textContent = "Continuity applied";
      setTimeout(() => button.textContent = original, 1300);
    }
  }

  function resetProfile() {
    saveProfile(defaults);
    fill(defaults);
    refreshPreview();
  }

  function fill(profile) {
    $("#clEnabled").checked = profile.enabled;
    $("#clName").value = profile.name;
    $("#clIdentity").value = profile.identity;
    $("#clWardrobe").value = profile.wardrobe;
    $("#clProportions").value = profile.proportions;
    $("#clPreserve").value = profile.preserve;
    $("#clAvoid").value = profile.avoid;
  }

  function mount() {
    if ($("#continuityLockUpgrade")) return;

    const anchor =
      $("#promptDirectorUpgrade") ||
      $("#referenceGalleryUpgrade") ||
      $("#referenceAsset")?.parentElement ||
      findPromptField()?.parentElement ||
      $("#imageOutput")?.parentElement;

    if (!anchor) return;

    const section = document.createElement("section");
    section.id = "continuityLockUpgrade";
    section.className = "continuity-lock-upgrade";
    section.innerHTML = `
      <div class="cl-header">
        <div>
          <p class="cl-eyebrow">CHARACTER CONSISTENCY SYSTEM</p>
          <div class="cl-title-row">
            <h3>Continuity Lock</h3>
            <span id="clStatusBadge" class="cl-status-badge">LOCKED</span>
          </div>
          <p>Preserve the same character identity across every generated scene.</p>
        </div>
        <label class="cl-toggle">
          <input id="clEnabled" type="checkbox" checked>
          <span>Enabled</span>
        </label>
      </div>

      <div class="cl-grid">
        <label class="cl-field">
          <span>Character name</span>
          <input id="clName">
        </label>

        <label class="cl-field cl-span-2">
          <span>Identity signature</span>
          <textarea id="clIdentity" rows="3"></textarea>
        </label>

        <label class="cl-field">
          <span>Wardrobe rule</span>
          <textarea id="clWardrobe" rows="3"></textarea>
        </label>

        <label class="cl-field">
          <span>Body proportions</span>
          <textarea id="clProportions" rows="3"></textarea>
        </label>

        <label class="cl-field cl-span-2">
          <span>Must preserve</span>
          <textarea id="clPreserve" rows="3"></textarea>
        </label>

        <label class="cl-field cl-span-2">
          <span>Avoid / negative guidance</span>
          <textarea id="clAvoid" rows="4"></textarea>
        </label>
      </div>

      <div class="cl-preview">
        <strong>Continuity instructions</strong>
        <p id="clPreview"></p>
      </div>

      <div class="cl-actions">
        <button type="button" id="clApply">Apply Continuity Lock</button>
        <button type="button" id="clCopy">Copy lock text</button>
        <button type="button" id="clReset">Reset Tiny Troy profile</button>
      </div>
    `;

    anchor.insertAdjacentElement("afterend", section);

    const profile = loadProfile();
    fill(profile);
    refreshPreview();

    section.querySelectorAll("input,textarea").forEach(el => {
      el.addEventListener("input", refreshPreview);
      el.addEventListener("change", refreshPreview);
    });

    $("#clApply").addEventListener("click", applyToPrompt);

    $("#clCopy").addEventListener("click", async () => {
      const text = buildLockText(collect());
      if (!text) return;
      await navigator.clipboard.writeText(text);
      const button = $("#clCopy");
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => button.textContent = original, 1200);
    });

    $("#clReset").addEventListener("click", resetProfile);

    document.addEventListener("click", event => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const text = (target.textContent || "").toLowerCase();
      if (
        collect().enabled &&
        (text.includes("generate image") || text.includes("build from my picture"))
      ) {
        const prompt = findPromptField();
        if (prompt && !prompt.value.includes("CONTINUITY LOCK FOR ")) {
          applyToPrompt();
        }
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
