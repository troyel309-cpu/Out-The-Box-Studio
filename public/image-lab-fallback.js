(() => {
  const byId = (id) => document.getElementById(id);
  let selectedAssetId = "";

  async function api(path, options = {}) {
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });

    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch { throw new Error(text || `Request failed with status ${response.status}`); }

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  }

  function showStatus(message, isError = false) {
    let box = byId("imageLabFallbackStatus");

    if (!box) {
      box = document.createElement("div");
      box.id = "imageLabFallbackStatus";
      box.style.marginTop = "12px";
      box.style.padding = "12px 14px";
      box.style.borderRadius = "10px";
      box.style.fontWeight = "700";
      box.style.lineHeight = "1.4";
      byId("generateImage")?.parentElement?.appendChild(box);
    }

    box.textContent = message;
    box.style.background = isError ? "rgba(190,45,45,.14)" : "rgba(28,138,92,.14)";
    box.style.border = isError ? "1px solid rgba(190,45,45,.45)" : "1px solid rgba(28,138,92,.45)";
  }

  async function loadReferenceAssets() {
    const select = byId("referenceAsset");
    if (!select) return;

    try {
      const assets = await api("/api/assets");
      const images = Array.isArray(assets) ? assets : [];

      select.innerHTML = '<option value="">Select uploaded picture</option>';

      for (const asset of images) {
        const option = document.createElement("option");
        option.value = asset.id;
        option.textContent = `${asset.name || asset.originalName || "Reference image"}${asset.officialReference ? " — Official" : ""}`;
        option.dataset.url = asset.url || "";
        select.appendChild(option);
      }

      const official = images.find(asset => asset.officialReference) || images[0];

      if (official) {
        select.value = official.id;
        selectedAssetId = official.id;
        showStatus(`Reference image ready: ${official.name || official.originalName || "uploaded image"}`);
      } else {
        showStatus("Upload a reference image in the Asset Library first.", true);
      }

      select.addEventListener("change", () => {
        selectedAssetId = select.value || "";
        const option = select.options[select.selectedIndex];
        showStatus(
          selectedAssetId
            ? `Selected: ${option?.textContent || "reference image"}`
            : "Select a reference image first.",
          !selectedAssetId
        );
      });
    } catch (error) {
      console.error("Could not load reference assets:", error);
      showStatus(`Could not load reference images: ${error.message}`, true);
    }
  }

  async function runImageLab(event) {
    const button = event.target.closest?.("#generateImage");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const prompt = byId("imagePrompt")?.value?.trim();
    if (!prompt) {
      showStatus("Add a scene prompt first.", true);
      byId("imagePrompt")?.focus();
      return;
    }

    const mode = byId("productionMode")?.value || "ai";
    const select = byId("referenceAsset");
    const assetId = select?.value || selectedAssetId || null;

    if ((mode === "assets" || mode === "hybrid") && !assetId) {
      await loadReferenceAssets();
    }

    const finalAssetId = byId("referenceAsset")?.value || selectedAssetId || null;

    if ((mode === "assets" || mode === "hybrid") && !finalAssetId) {
      showStatus("Select a reference image first.", true);
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Generating image…";
    showStatus("Image Lab is sending the job to the studio…");

    try {
      const projects = await api("/api/projects");
      const project = Array.isArray(projects) ? projects[0] : null;
      if (!project?.id) throw new Error("Create or open a project first.");

      const result = await api(`/api/projects/${project.id}/image`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          characterId: byId("characterSelect")?.value || "tiny-troy",
          shotType: byId("shotType")?.value || "cinematic",
          mode,
          assetId: finalAssetId
        })
      });

      const output = byId("imageOutput");
      if (output && result.imageUrl) {
        output.innerHTML = `
          <img
            src="${result.imageUrl}?v=${Date.now()}"
            alt="Generated scene"
            style="display:block;width:100%;max-width:1024px;border-radius:16px"
          >
        `;
      }

      showStatus(
        mode === "assets"
          ? "Reference image attached successfully."
          : "Image generated and attached to the project."
      );
    } catch (error) {
      console.error("Image Lab failed:", error);
      showStatus(error.message || "Image generation failed.", true);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  document.addEventListener("click", runImageLab, true);

  window.addEventListener("DOMContentLoaded", async () => {
    await loadReferenceAssets();
  });

  if (document.readyState !== "loading") {
    loadReferenceAssets();
  }
})();
