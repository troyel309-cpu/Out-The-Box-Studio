(() => {
  const $ = (s, r = document) => r.querySelector(s);

  const options = {
    Expression: ["Warm smile", "Excited", "Focused", "Friendly", "Serious"],
    Camera: ["Medium cinematic shot", "Close-up", "Wide establishing shot", "Full-body shot", "Low-angle shot"],
    Lighting: ["Golden-hour lighting", "Professional studio lighting", "Bright showroom lighting", "Cinematic lighting", "Natural daylight"],
    Environment: ["Modern automotive showroom", "Dealership lot", "Luxury garage", "City street", "Production studio"],
    Style: ["Polished 3D mascot rendering", "Cinematic realism", "Animated-feature quality", "Commercial advertising style", "Graphic-novel illustration"],
    Mood: ["Celebratory", "Trustworthy", "Energetic", "Premium", "Playful", "Calm"]
  };

  function findPrompt() {
    return $("#imagePrompt") || $("#prompt") || $("#scenePrompt") ||
      [...document.querySelectorAll("textarea,input[type='text']")].find(el =>
        `${el.id} ${el.name} ${el.placeholder}`.toLowerCase().match(/prompt|scene|describe/)
      );
  }

  function select(name) {
    return `<label class="pd-field"><span>${name}</span><select data-pd="${name}">${
      options[name].map(v => `<option value="${v}">${v}</option>`).join("")
    }</select></label>`;
  }

  function buildPrompt() {
    const characterSelect = $("#characterSelect");
    const character = characterSelect?.options?.[characterSelect.selectedIndex]?.textContent?.trim() || "the selected character";
    const values = {};
    document.querySelectorAll("[data-pd]").forEach(el => values[el.dataset.pd] = el.value);
    const action = $("#pdAction")?.value.trim() || "helping a customer";
    const details = $("#pdDetails")?.value.trim();
    const reference = $("#referenceAsset")?.value ? "Keep identity and facial features continuity-locked to the selected reference image." : "";

    return [
      `${character}, ${action}, inside a ${values.Environment.toLowerCase()}.`,
      `${values.Expression.toLowerCase()}, ${values.Mood.toLowerCase()} mood.`,
      `${values.Camera}, ${values.Lighting.toLowerCase()}, ${values.Style.toLowerCase()}.`,
      reference,
      details
    ].filter(Boolean).join(" ");
  }

  function refresh() {
    const preview = $("#pdPreview");
    if (preview) preview.textContent = buildPrompt();
  }

  function mount() {
    if ($("#promptDirectorUpgrade")) return;

    const anchor = $("#referenceGalleryUpgrade") || $("#referenceAsset")?.parentElement || findPrompt()?.parentElement || $("#imageOutput")?.parentElement;
    if (!anchor) return;

    const section = document.createElement("section");
    section.id = "promptDirectorUpgrade";
    section.className = "prompt-director-upgrade";
    section.innerHTML = `
      <div class="pd-header">
        <div>
          <p class="pd-eyebrow">AI CREATIVE DIRECTION</p>
          <h3>Prompt Director</h3>
          <p>Build a professional scene prompt with simple controls.</p>
        </div>
      </div>
      <div class="pd-grid">
        ${select("Expression")}
        ${select("Camera")}
        ${select("Lighting")}
        ${select("Environment")}
        ${select("Style")}
        ${select("Mood")}
      </div>
      <label class="pd-field pd-wide">
        <span>Action</span>
        <input id="pdAction" value="handing a customer the keys to their new vehicle">
      </label>
      <label class="pd-field pd-wide">
        <span>Extra details</span>
        <textarea id="pdDetails" rows="3" placeholder="Clothing, props, colors, background details, or text to avoid"></textarea>
      </label>
      <div class="pd-preview">
        <strong>Generated prompt</strong>
        <p id="pdPreview"></p>
      </div>
      <div class="pd-actions">
        <button type="button" id="pdApply">Apply to Image Lab</button>
        <button type="button" id="pdCopy">Copy prompt</button>
      </div>
    `;

    anchor.insertAdjacentElement("afterend", section);

    section.querySelectorAll("select,input,textarea").forEach(el => el.addEventListener("input", refresh));

    $("#pdApply").onclick = () => {
      const prompt = findPrompt();
      if (!prompt) return alert("Image Lab prompt field was not found.");
      prompt.value = buildPrompt();
      prompt.dispatchEvent(new Event("input", { bubbles: true }));
      prompt.dispatchEvent(new Event("change", { bubbles: true }));
      prompt.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    $("#pdCopy").onclick = async () => {
      await navigator.clipboard.writeText(buildPrompt());
      $("#pdCopy").textContent = "Copied";
      setTimeout(() => $("#pdCopy").textContent = "Copy prompt", 1200);
    };

    $("#characterSelect")?.addEventListener("change", refresh);
    $("#referenceAsset")?.addEventListener("change", refresh);
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
