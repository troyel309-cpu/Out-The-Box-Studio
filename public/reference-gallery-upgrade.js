(() => {
  "use strict";

  const state = {
    assets: [],
    selectedId: "",
    mounted: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function assetLabel(asset) {
    const tag = Array.isArray(asset.tags) && asset.tags.length
      ? asset.tags.join(", ")
      : "Reference image";
    return asset.officialReference ? `${tag} • Official` : tag;
  }

  function findImageLabAnchor() {
    return (
      $("#referenceAsset")?.closest("label") ||
      $("#referenceAsset")?.parentElement ||
      $("#productionMode")?.closest("section") ||
      $("#imageOutput")?.parentElement
    );
  }

  function ensureGallery() {
    if ($("#referenceGalleryUpgrade")) return $("#referenceGalleryUpgrade");

    const anchor = findImageLabAnchor();
    if (!anchor) return null;

    const section = document.createElement("section");
    section.id = "referenceGalleryUpgrade";
    section.className = "reference-gallery-upgrade";
    section.innerHTML = `
      <div class="reference-gallery-heading">
        <div>
          <p class="reference-gallery-eyebrow">VISUAL REFERENCE PICKER</p>
          <h3>Choose the picture to build from</h3>
        </div>
        <button type="button" id="refreshReferenceGallery" class="reference-gallery-refresh">
          Refresh
        </button>
      </div>
      <p id="referenceGalleryStatus" class="reference-gallery-status">
        Loading saved references…
      </p>
      <div id="referenceGalleryGrid" class="reference-gallery-grid" aria-live="polite"></div>
    `;

    anchor.insertAdjacentElement("afterend", section);

    $("#refreshReferenceGallery")?.addEventListener("click", loadAssets);
    state.mounted = true;
    return section;
  }

  function syncNativeDropdown(assetId) {
    const select = $("#referenceAsset");
    if (!select || !assetId) return;

    const exists = Array.from(select.options).some(option => option.value === assetId);
    if (exists) {
      select.value = assetId;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    try {
      localStorage.setItem("outTheBoxSelectedReferenceAsset", assetId);
    } catch {}
  }

  function chooseAsset(assetId) {
    state.selectedId = assetId;
    syncNativeDropdown(assetId);
    render();

    const asset = state.assets.find(item => item.id === assetId);
    const status = $("#referenceGalleryStatus");
    if (status && asset) {
      status.textContent = `Selected: ${assetLabel(asset)}`;
    }
  }

  function render() {
    const grid = $("#referenceGalleryGrid");
    const status = $("#referenceGalleryStatus");
    if (!grid || !status) return;

    if (!state.assets.length) {
      grid.innerHTML = `
        <div class="reference-gallery-empty">
          No saved reference images yet. Upload one in the Studio Asset Library.
        </div>
      `;
      status.textContent = "No reference images available.";
      return;
    }

    grid.innerHTML = state.assets.map(asset => {
      const selected = asset.id === state.selectedId;
      return `
        <button
          type="button"
          class="reference-card ${selected ? "is-selected" : ""}"
          data-reference-id="${escapeHtml(asset.id)}"
          aria-pressed="${selected ? "true" : "false"}"
        >
          <span class="reference-card-image-wrap">
            <img
              src="${escapeHtml(asset.url)}"
              alt="${escapeHtml(asset.name || asset.originalName || "Reference image")}"
              class="reference-card-image"
              loading="lazy"
            >
            ${asset.officialReference ? '<span class="reference-official-badge">OFFICIAL</span>' : ""}
          </span>
          <span class="reference-card-copy">
            <strong>${escapeHtml(asset.name || asset.originalName || "Reference image")}</strong>
            <small>${escapeHtml(assetLabel(asset))}</small>
          </span>
        </button>
      `;
    }).join("");

    grid.querySelectorAll("[data-reference-id]").forEach(button => {
      button.addEventListener("click", () => chooseAsset(button.dataset.referenceId));
    });

    const selected = state.assets.find(asset => asset.id === state.selectedId);
    status.textContent = selected
      ? `Selected: ${assetLabel(selected)}`
      : `${state.assets.length} saved reference image${state.assets.length === 1 ? "" : "s"}`;
  }

  function newestOfficialOrNewest(assets) {
    return (
      assets.find(asset => asset.officialReference) ||
      assets[0] ||
      null
    );
  }

  async function loadAssets() {
    ensureGallery();

    const status = $("#referenceGalleryStatus");
    if (status) status.textContent = "Loading saved references…";

    try {
      const response = await fetch("/api/assets", {
        headers: { "Accept": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Asset request failed (${response.status})`);
      }

      const payload = await response.json();
      const assets = Array.isArray(payload) ? payload : payload.assets;

      if (!Array.isArray(assets)) {
        throw new Error("Asset response was not a list.");
      }

      state.assets = assets
        .filter(asset => asset && asset.id && asset.url && asset.category === "reference")
        .sort((a, b) => {
          if (Boolean(a.officialReference) !== Boolean(b.officialReference)) {
            return Number(Boolean(b.officialReference)) - Number(Boolean(a.officialReference));
          }
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

      let remembered = "";
      try {
        remembered = localStorage.getItem("outTheBoxSelectedReferenceAsset") || "";
      } catch {}

      const nativeSelected = $("#referenceAsset")?.value || "";
      const validRemembered = state.assets.some(asset => asset.id === remembered);
      const validNative = state.assets.some(asset => asset.id === nativeSelected);

      state.selectedId = validNative
        ? nativeSelected
        : validRemembered
          ? remembered
          : newestOfficialOrNewest(state.assets)?.id || "";

      if (state.selectedId) syncNativeDropdown(state.selectedId);
      render();
    } catch (error) {
      state.assets = [];
      const grid = $("#referenceGalleryGrid");
      if (grid) {
        grid.innerHTML = `
          <div class="reference-gallery-empty reference-gallery-error">
            Could not load references. Make sure the studio server is running.
          </div>
        `;
      }
      if (status) status.textContent = error.message || "Reference gallery load failed.";
    }
  }

  function watchForAssetChanges() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const target = String(args[0] || "");
        const method = String(args[1]?.method || "GET").toUpperCase();
        if (
          target.includes("/api/assets") &&
          ["POST", "DELETE", "PUT", "PATCH"].includes(method)
        ) {
          setTimeout(loadAssets, 250);
        }
      } catch {}
      return response;
    };
  }

  function boot() {
    ensureGallery();
    watchForAssetChanges();
    loadAssets();

    const nativeSelect = $("#referenceAsset");
    if (nativeSelect) {
      nativeSelect.addEventListener("change", event => {
        if (event.target.value && event.target.value !== state.selectedId) {
          state.selectedId = event.target.value;
          try {
            localStorage.setItem("outTheBoxSelectedReferenceAsset", state.selectedId);
          } catch {}
          render();
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
