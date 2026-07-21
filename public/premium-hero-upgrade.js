(() => {
  "use strict";

  function mountPremiumHero() {
    if (document.querySelector("#premiumHero")) return;

    const workspace = document.querySelector("#workspaceSection");
    const ideaDock = workspace?.querySelector(".idea-dock");
    if (!workspace || !ideaDock) return;

    const hero = document.createElement("section");
    hero.id = "premiumHero";
    hero.className = "premium-hero";
    hero.innerHTML = `
      <div class="premium-hero-copy">
        <span class="premium-kicker">✦ LIVING AI CREATIVE STUDIO</span>
        <h2>Bring your imagination<br><em>into the real world.</em></h2>
        <p>Direct an AI production crew that can build characters, campaigns, commercials, storyboards, game assets, and more.</p>

        <div class="premium-actions">
          <button id="premiumStart" class="premium-primary">✨ Start Creating</button>
          <button id="premiumLibrary" class="premium-secondary">▶ Explore Dreams</button>
        </div>

        <div class="premium-stats">
          <div><strong>24/7</strong><span>Creative Workforce</span></div>
          <div><strong>∞</strong><span>Production Ideas</span></div>
          <div><strong>100%</strong><span>Owner Controlled</span></div>
        </div>
      </div>

      <div class="premium-studio-card">
        <div class="premium-studio-head">
          <div>
            <span>LIVE STUDIO</span>
            <h3>Your AI crew is ready</h3>
          </div>
          <b>ONLINE</b>
        </div>

        <div class="premium-workers">
          <div class="premium-worker active"><span>🎬</span><strong>Director</strong><i></i></div>
          <div class="premium-worker"><span>🎨</span><strong>Character Artist</strong><i></i></div>
          <div class="premium-worker"><span>💡</span><strong>Lighting Artist</strong><i></i></div>
          <div class="premium-worker"><span>📷</span><strong>Camera Operator</strong><i></i></div>
          <div class="premium-worker"><span>✨</span><strong>FX Artist</strong><i></i></div>
          <div class="premium-worker"><span>🤖</span><strong>OpenAI Engine</strong><i></i></div>
        </div>

        <div class="premium-render">
          <div class="premium-cube">
            <img src="/otb-premium-logo.svg" alt="Out the Box Studio">
          </div>
          <p>Waiting for your idea…</p>
        </div>
      </div>
    `;

    workspace.insertBefore(hero, ideaDock);

    document.querySelector(".rail-brand img")?.setAttribute("src", "/otb-premium-logo.svg");
    document.querySelector(".render-orb img")?.setAttribute("src", "/otb-premium-logo.svg");

    document.querySelector("#premiumStart")?.addEventListener("click", () => {
      ideaDock.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => document.querySelector("#ideaInput")?.focus(), 450);
    });

    document.querySelector("#premiumLibrary")?.addEventListener("click", () => {
      document.querySelector('.rail-action[data-section="library"]')?.click();
    });

    animateWorkers();
  }

  function animateWorkers() {
    const workers = [...document.querySelectorAll(".premium-worker")];
    if (!workers.length) return;

    let index = 0;
    setInterval(() => {
      workers.forEach((worker, i) => worker.classList.toggle("active", i === index));
      index = (index + 1) % workers.length;
    }, 1150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountPremiumHero, { once: true });
  } else {
    mountPremiumHero();
  }
})();
