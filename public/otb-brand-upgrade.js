(() => {
  "use strict";

  function replaceBranding() {
    document
      .querySelectorAll(
        'img[src="/otb-v2-logo.svg"], img[src*="otb-simple"], img[src*="otb-opening"], img[src*="otb-directors"]'
      )
      .forEach(image => {
        if (
          image.closest(".welcome-art") ||
          image.closest(".visual-box-stage")
        ) {
          image.src = "/otb-brand-hero.svg";
        } else {
          image.src = "/otb-brand-icon.svg";
        }
      });

    const favicon =
      document.querySelector('link[rel="icon"]') ||
      document.createElement("link");

    favicon.rel = "icon";
    favicon.href = "/otb-brand-icon.svg";

    if (!favicon.parentNode) {
      document.head.appendChild(favicon);
    }
  }

  function addBrandReveal() {
    const art = document.querySelector(".welcome-art");
    if (!art || art.querySelector(".brand-reveal-copy")) return;

    const label = document.createElement("div");
    label.className = "brand-reveal-copy";
    label.innerHTML = `
      <span>IDEAS START HERE</span>
      <strong>Out the Box Studio</strong>
    `;

    Object.assign(label.style, {
      position: "absolute",
      left: "50%",
      bottom: "18px",
      zIndex: "3",
      transform: "translateX(-50%)",
      display: "grid",
      justifyItems: "center",
      gap: "3px",
      whiteSpace: "nowrap"
    });

    const span = label.querySelector("span");
    const strong = label.querySelector("strong");

    Object.assign(span.style, {
      color: "#B7FF65",
      fontSize: ".54rem",
      fontWeight: "900",
      letterSpacing: ".16em"
    });

    Object.assign(strong.style, {
      fontSize: ".84rem",
      letterSpacing: "-.02em"
    });

    art.appendChild(label);
  }

  function boot() {
    replaceBranding();
    addBrandReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
