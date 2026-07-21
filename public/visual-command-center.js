(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function replaceLogos() {
    $$('img[src*="otb-"], .rail-brand img, .premium-cube img, .render-orb img, .pulse-logo img')
      .forEach(image => {
        image.src = "/otb-opening-box-logo.svg";
      });
  }

  function upgradeRail() {
    const rail = $(".rail");
    if (!rail || $("#visualRailNavigation")) return;

    const existingActions = $$(".rail-action", rail);
    const sectionByIndex = ["workspace", "library", "production"];

    existingActions.forEach((button, index) => {
      button.style.display = "none";
      button.dataset.originalSection = sectionByIndex[index] || "";
    });

    const nav = document.createElement("nav");
    nav.id = "visualRailNavigation";
    nav.className = "visual-rail-navigation";
    nav.innerHTML = `
      <button class="visual-nav active" data-visual-section="workspace">
        <span>⬢</span>
        <div><strong>Studio</strong><small>Creative Command Center</small></div>
      </button>

      <button class="visual-nav" data-visual-section="library">
        <span>◈</span>
        <div><strong>Dream Library</strong><small>Your Creations</small></div>
      </button>

      <button class="visual-nav" data-visual-section="production">
        <span>🎬</span>
        <div><strong>Production Floor</strong><small>Live Studio Activity</small></div>
      </button>

      <button class="visual-nav" data-jump-target=".live-floor">
        <span>👥</span>
        <div><strong>AI Workforce</strong><small>Your Creative Crew</small></div>
      </button>

      <button class="visual-nav" data-jump-target=".reference-floor">
        <span>▱</span>
        <div><strong>Asset Vault</strong><small>Models, Scenes, Media</small></div>
      </button>

      <button class="visual-nav" data-visual-section="production">
        <span>▥</span>
        <div><strong>Insights</strong><small>Evidence & Performance</small></div>
      </button>
    `;

    const mission = $("#missionControl");
    const bottom = $(".rail-bottom");
    rail.insertBefore(nav, mission || bottom);

    nav.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.dataset.visualSection) {
        const original = existingActions.find(
          item => item.dataset.originalSection === button.dataset.visualSection
        );
        original?.click();

        $$(".visual-nav", nav).forEach(item => item.classList.remove("active"));
        button.classList.add("active");
      }

      if (button.dataset.jumpTarget) {
        $(button.dataset.jumpTarget)?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    });
  }

  function mountVisualHero() {
    if ($("#visualCommandHero")) return;

    const workspaceSection = $("#workspaceSection");
    const existingHero = $(".premium-hero", workspaceSection);
    const ideaDock = $(".idea-dock", workspaceSection);

    if (!workspaceSection || !ideaDock) return;

    if (existingHero) existingHero.style.display = "none";

    const hero = document.createElement("section");
    hero.id = "visualCommandHero";
    hero.className = "visual-command-hero";

    hero.innerHTML = `
      <div class="visual-hero-main">
        <div class="visual-hero-copy">
          <span class="visual-welcome">✦ WELCOME BACK, TROY</span>

          <h2>
            Imagine it.<br>
            Create it.<br>
            <em>Bring it to life.</em>
          </h2>

          <p>
            Your all-in-one AI creative studio for commercials, characters,
            games, videos, campaigns, storyboards, and more.
          </p>

          <div class="visual-hero-actions">
            <button id="visualStartCreating">✦ Start Creating</button>
            <button id="visualExploreDreams">▶ Explore Dreams</button>
          </div>
        </div>

        <div class="visual-box-stage">
          <div class="box-energy"></div>
          <img src="/otb-opening-box-logo.svg" alt="Opening OTB box">
          <span class="floating-shape shape-one"></span>
          <span class="floating-shape shape-two"></span>
          <span class="floating-shape shape-three"></span>
          <span class="floating-shape shape-four"></span>
        </div>
      </div>

      <aside class="visual-live-floor">
        <div class="visual-live-head">
          <div>
            <span>LIVE STUDIO FLOOR</span>
            <h3>AI Production Crew</h3>
          </div>
          <b>● LIVE</b>
        </div>

        <div id="visualCrewList" class="visual-crew-list">
          ${[
            ["Director AI", "Analyzing brief…", 100, "cyan"],
            ["Scriptwriter AI", "Writing script…", 82, "violet"],
            ["Character Artist", "Designing characters…", 76, "orange"],
            ["Scene Builder", "Building scenes…", 68, "blue"],
            ["Lighting Artist", "Setting lighting…", 54, "yellow"],
            ["OpenAI Engine", "Rendering magic…", 68, "green"],
            ["Quality Verifier", "Checking details…", 32, "purple"]
          ].map(([name, detail, progress, tone], index) => `
            <div class="visual-crew-row ${index === 0 ? "active" : ""}" data-tone="${tone}">
              <span class="crew-avatar">${index === 0 ? "🎬" : index === 1 ? "✍️" : index === 2 ? "🎨" : index === 3 ? "🏗️" : index === 4 ? "💡" : index === 5 ? "🤖" : "✓"}</span>
              <div class="crew-copy">
                <strong>${name}</strong>
                <small>${detail}</small>
              </div>
              <div class="crew-progress">
                <div><span style="width:${progress}%"></span></div>
                <b>${progress}%</b>
              </div>
            </div>
          `).join("")}
        </div>

        <button id="visualProductionTimeline">View Full Production Timeline →</button>
      </aside>
    `;

    ideaDock.parentNode.insertBefore(hero, ideaDock);

    $("#visualStartCreating").addEventListener("click", () => {
      ideaDock.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => $("#ideaInput")?.focus(), 500);
    });

    $("#visualExploreDreams").addEventListener("click", () => {
      const libraryButton = $$(".rail-action").find(
        item => item.dataset.originalSection === "library" || item.dataset.section === "library"
      );
      libraryButton?.click();
    });

    $("#visualProductionTimeline").addEventListener("click", () => {
      $(".timeline-floor")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });
  }

  function mountVisualPipeline() {
    if ($("#visualPipeline")) return;

    const hero = $("#visualCommandHero");
    if (!hero) return;

    const pipeline = document.createElement("section");
    pipeline.id = "visualPipeline";
    pipeline.className = "visual-pipeline";
    pipeline.innerHTML = `
      ${[
        ["💡", "IDEA", "Your vision"],
        ["💬", "PROMPT", "AI understands"],
        ["✎", "COMPOSE", "Building content"],
        ["⬡", "RENDER", "Creating output"],
        ["🛡", "VERIFY", "Quality check"],
        ["🚀", "DELIVER", "Ready to use"]
      ].map(([icon, title, detail], index) => `
        <div class="visual-pipeline-stage ${index === 0 ? "active" : ""}" data-visual-pipeline-index="${index}">
          <span>${icon}</span>
          <div>
            <b>${index + 1}</b>
            <strong>${title}</strong>
            <small>${detail}</small>
          </div>
        </div>
        ${index < 5 ? "<i>→</i>" : ""}
      `).join("")}
    `;

    hero.insertAdjacentElement("afterend", pipeline);
  }

  function upgradeStudioPulse() {
    const pulse = $("#studioPulse");
    if (!pulse || pulse.classList.contains("visual-pulse-upgraded")) return;

    pulse.classList.add("visual-pulse-upgraded");

    pulse.innerHTML = `
      <div class="visual-pulse-head">
        <strong>STUDIO PULSE</strong>
        <span>● LIVE</span>
      </div>

      <div class="visual-pulse-body">
        <div class="pulse-wave">
          <svg viewBox="0 0 180 55" aria-hidden="true">
            <path d="M0 33h22l7-15 10 32 10-44 12 27h25l8-13 9 26 9-13h68"
              fill="none" stroke="currentColor" stroke-width="4"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="pulse-ring">
          <div>
            <strong id="visualPulsePercent">68%</strong>
          </div>
        </div>
      </div>

      <div class="visual-pulse-meta">
        <div><strong>7</strong><span>Workers Active</span></div>
        <div><strong id="visualPulseState">Rendering…</strong><span>Est. 00:12 remaining</span></div>
      </div>
    `;
  }

  function syncNavigation() {
    const sections = {
      workspaceSection: "workspace",
      librarySection: "library",
      productionSection: "production"
    };

    const observer = new MutationObserver(() => {
      Object.entries(sections).forEach(([id, section]) => {
        if ($(`#${id}`)?.classList.contains("active")) {
          $$(".visual-nav").forEach(button => {
            button.classList.toggle(
              "active",
              button.dataset.visualSection === section
            );
          });
        }
      });
    });

    Object.keys(sections).forEach(id => {
      const section = $(`#${id}`);
      if (section) observer.observe(section, { attributes: true });
    });
  }

  function syncLiveProduction() {
    const workerFlow = $("#workerFlow");
    if (!workerFlow) return;

    const observer = new MutationObserver(() => {
      const activeWorkers = $$(".worker-row.working", workerFlow).length;
      const completedWorkers = $$(".worker-row.complete", workerFlow).length;
      const total = Math.max(7, $$(".worker-row", workerFlow).length);
      const progress = Math.min(
        100,
        Math.round(((completedWorkers + activeWorkers * 0.5) / total) * 100)
      );

      const ring = $("#visualPulsePercent");
      const state = $("#visualPulseState");

      if (ring) ring.textContent = `${progress || 68}%`;
      if (state) {
        state.textContent = activeWorkers
          ? "Rendering…"
          : completedWorkers >= total
            ? "Complete"
            : "Studio ready";
      }

      const crewRows = $$(".visual-crew-row");
      crewRows.forEach((row, index) => {
        row.classList.toggle("active", index === completedWorkers && activeWorkers);
      });

      $$(".visual-pipeline-stage").forEach((stage, index) => {
        const pipelineIndex = Math.min(
          5,
          Math.floor(((progress || 0) / 100) * 6)
        );
        stage.classList.toggle("complete", index < pipelineIndex);
        stage.classList.toggle("active", index === pipelineIndex);
      });
    });

    observer.observe(workerFlow, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  function boot() {
    replaceLogos();
    upgradeRail();
    mountVisualHero();
    mountVisualPipeline();
    upgradeStudioPulse();
    syncNavigation();
    syncLiveProduction();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
