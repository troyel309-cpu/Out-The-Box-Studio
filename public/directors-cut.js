(() => {
  "use strict";

  function applyDirectorsCut() {
    document.querySelectorAll('img[src="/otb-premium-logo.svg"], img[src="/otb-logo.svg"]')
      .forEach(image => image.src = "/otb-directors-logo.svg");

    const title = document.querySelector(".command-title h1");
    if (title) title.textContent = "Out the Box Studio";

    const heroTitle = document.querySelector(".premium-hero h2");
    if (heroTitle) {
      heroTitle.innerHTML = `Imagine it.<br><em>Build it here.</em>`;
    }

    const heroCopy = document.querySelector(".premium-hero-copy > p");
    if (heroCopy) {
      heroCopy.textContent =
        "A living AI production studio for turning ideas into characters, campaigns, commercials, storyboards, game assets, and finished creative work.";
    }

    const renderText = document.querySelector(".premium-render p");
    if (renderText) renderText.textContent = "The studio is listening…";

    document.querySelectorAll(".project-card").forEach(card => {
      card.addEventListener("pointermove", event => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - .5) * 4;
        const y = ((event.clientY - rect.top) / rect.height - .5) * -4;
        card.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${y}deg) translateY(-3px)`;
      });

      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDirectorsCut, { once: true });
  } else {
    applyDirectorsCut();
  }
})();
