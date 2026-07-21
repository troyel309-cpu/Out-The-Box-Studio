(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const pulse = {
    active: false,
    progress: 0,
    workers: 0,
    stage: "Ready",
    timer: null
  };

  const workerStages = [
    ["Studio Director", "Reading your idea and building the brief"],
    ["Character Artist", "Locking identity, expression, and proportions"],
    ["Scene Designer", "Building the environment and composition"],
    ["Lighting Artist", "Shaping mood, contrast, and focus"],
    ["Camera Operator", "Choosing framing and perspective"],
    ["OpenAI Engine", "Rendering the final image"],
    ["Evidence Quality", "Verifying the completed artifact"]
  ];

  function mountBackground() {
    if ($("#livingBlueprint")) return;

    const layer = document.createElement("div");
    layer.id = "livingBlueprint";
    layer.className = "living-blueprint";
    layer.innerHTML = `
      <div class="blueprint-grid"></div>
      <div class="blueprint-cube cube-a"></div>
      <div class="blueprint-cube cube-b"></div>
      <div class="blueprint-cube cube-c"></div>
      <div class="particle-field" id="particleField"></div>
    `;
    document.body.prepend(layer);

    const field = $("#particleField");
    for (let i = 0; i < 38; i += 1) {
      const dot = document.createElement("span");
      dot.style.setProperty("--x", `${Math.random() * 100}%`);
      dot.style.setProperty("--y", `${Math.random() * 100}%`);
      dot.style.setProperty("--size", `${2 + Math.random() * 4}px`);
      dot.style.setProperty("--duration", `${8 + Math.random() * 16}s`);
      dot.style.setProperty("--delay", `${Math.random() * -16}s`);
      field.appendChild(dot);
    }
  }

  function upgradeSidebar() {
    const rail = $(".rail");
    if (!rail || $("#missionControl")) return;

    const navButtons = $$(".rail-action", rail);
    const labels = [
      ["✦", "Create"],
      ["◈", "Dream Library"],
      ["⚙", "Production"]
    ];

    navButtons.forEach((button, index) => {
      if (!labels[index]) return;
      button.innerHTML = `<span>${labels[index][0]}</span><b>${labels[index][1]}</b>`;
    });

    const mission = document.createElement("div");
    mission.id = "missionControl";
    mission.className = "mission-control";
    mission.innerHTML = `
      <p>MISSION CONTROL</p>
      <button data-mission-action="assets"><span>📦</span><b>Assets</b><i>${document.querySelectorAll(".asset-card").length || "—"}</i></button>
      <button data-mission-action="workforce"><span>👥</span><b>AI Workforce</b><i>7</i></button>
      <button data-mission-action="insights"><span>📈</span><b>Insights</b><i>Live</i></button>
    `;

    const bottom = $(".rail-bottom", rail);
    rail.insertBefore(mission, bottom);

    mission.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;

      const action = button.dataset.missionAction;
      if (action === "assets") {
        $(".reference-floor")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (action === "workforce") {
        $(".live-floor")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (action === "insights") {
        $('.rail-action[data-section="production"]')?.click();
      }
    });
  }

  function mountPipeline() {
    if ($("#livingPipeline")) return;

    const preview = $(".preview-floor");
    if (!preview) return;

    const pipeline = document.createElement("section");
    pipeline.id = "livingPipeline";
    pipeline.className = "living-pipeline";
    pipeline.innerHTML = `
      <div class="living-pipeline-head">
        <div>
          <p>LIVE PRODUCTION PIPELINE</p>
          <h3>Watch the idea become real</h3>
        </div>
        <span id="pipelineStatus">Standing by</span>
      </div>

      <div class="pipeline-track">
        <div class="pipeline-stage" data-stage-index="0"><span>01</span><b>Idea</b></div>
        <i></i>
        <div class="pipeline-stage" data-stage-index="1"><span>02</span><b>Prompt</b></div>
        <i></i>
        <div class="pipeline-stage" data-stage-index="2"><span>03</span><b>Compose</b></div>
        <i></i>
        <div class="pipeline-stage" data-stage-index="3"><span>04</span><b>Render</b></div>
        <i></i>
        <div class="pipeline-stage" data-stage-index="4"><span>05</span><b>Verify</b></div>
      </div>
    `;

    preview.insertBefore(pipeline, $(".render-stage", preview));
  }

  function mountPulse() {
    if ($("#studioPulse")) return;

    const widget = document.createElement("aside");
    widget.id = "studioPulse";
    widget.className = "studio-pulse";
    widget.innerHTML = `
      <div class="pulse-logo">
        <img src="/otb-directors-logo.svg" alt="">
        <span></span>
      </div>

      <div class="pulse-copy">
        <p>STUDIO PULSE</p>
        <strong id="pulseStage">Ready</strong>
        <small id="pulseWorkers">0 workers active</small>
      </div>

      <div class="pulse-progress">
        <div><span id="pulseProgressBar"></span></div>
        <b id="pulsePercent">0%</b>
      </div>
    `;
    document.body.appendChild(widget);
  }

  function mountActivationOverlay() {
    if ($("#activationOverlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "activationOverlay";
    overlay.className = "activation-overlay";
    overlay.innerHTML = `
      <div class="activation-core">
        <div class="activation-rings">
          <span></span><span></span><span></span>
        </div>
        <img src="/otb-directors-logo.svg" alt="">
      </div>
      <p>STUDIO ACTIVATING</p>
      <h2 id="activationText">Understanding your idea…</h2>
    `;
    document.body.appendChild(overlay);
  }

  function updatePulse(stage, workers, progress) {
    pulse.stage = stage;
    pulse.workers = workers;
    pulse.progress = Math.max(0, Math.min(100, progress));

    $("#pulseStage").textContent = stage;
    $("#pulseWorkers").textContent = `${workers} worker${workers === 1 ? "" : "s"} active`;
    $("#pulseProgressBar").style.width = `${pulse.progress}%`;
    $("#pulsePercent").textContent = `${Math.round(pulse.progress)}%`;

    $("#studioPulse").classList.toggle("active", pulse.active);
  }

  function setPipeline(index) {
    $$(".pipeline-stage").forEach((stage, stageIndex) => {
      stage.classList.toggle("complete", stageIndex < index);
      stage.classList.toggle("active", stageIndex === index);
    });

    $$(".pipeline-track > i").forEach((line, lineIndex) => {
      line.classList.toggle("active", lineIndex < index);
    });
  }

  function rebuildWorkers() {
    const flow = $("#workerFlow");
    if (!flow) return;

    flow.innerHTML = workerStages.map(([name, detail], index) => `
      <div class="worker-row living-worker" data-worker-index="${index}">
        <span class="worker-icon">○</span>
        <div>
          <strong>${name}</strong>
          <small>${detail}</small>
        </div>
        <em>Waiting</em>
      </div>
    `).join("");
  }

  async function runActivationSequence() {
    const overlay = $("#activationOverlay");
    const text = $("#activationText");
    if (!overlay || !text) return;

    overlay.classList.add("show");
    document.body.classList.add("studio-activating");

    const messages = [
      "Understanding your idea…",
      "Assembling the creative crew…",
      "Locking character continuity…",
      "Preparing the production floor…"
    ];

    for (const message of messages) {
      text.textContent = message;
      await new Promise(resolve => setTimeout(resolve, 420));
    }

    overlay.classList.remove("show");
    document.body.classList.remove("studio-activating");
  }

  function startLivingProduction() {
    if (pulse.active) return;

    pulse.active = true;
    pulse.progress = 0;
    rebuildWorkers();
    updatePulse("Studio activating", 1, 2);
    setPipeline(0);
    $("#pipelineStatus").textContent = "Activating";

    runActivationSequence();

    const workerRows = $$(".living-worker");
    let workerIndex = 0;

    clearInterval(pulse.timer);
    pulse.timer = setInterval(() => {
      pulse.progress += 2.2;

      const mappedWorker = Math.min(workerStages.length - 1, Math.floor((pulse.progress / 100) * workerStages.length));
      const mappedPipeline = Math.min(4, Math.floor((pulse.progress / 100) * 5));

      if (mappedWorker !== workerIndex || pulse.progress < 5) {
        workerIndex = mappedWorker;
        workerRows.forEach((row, index) => {
          const icon = $(".worker-icon", row);
          const status = $("em", row);

          row.classList.toggle("working", index === workerIndex);
          row.classList.toggle("complete", index < workerIndex);

          if (index < workerIndex) {
            icon.textContent = "✓";
            status.textContent = "Complete";
          } else if (index === workerIndex) {
            icon.textContent = "•";
            status.textContent = "Working";
          } else {
            icon.textContent = "○";
            status.textContent = "Waiting";
          }
        });
      }

      setPipeline(mappedPipeline);
      $("#pipelineStatus").textContent = workerStages[workerIndex]?.[0] || "Working";
      updatePulse(workerStages[workerIndex]?.[0] || "Working", Math.min(workerIndex + 1, 7), pulse.progress);

      if (pulse.progress >= 94) {
        clearInterval(pulse.timer);
      }
    }, 260);
  }

  function finishLivingProduction() {
    clearInterval(pulse.timer);
    pulse.active = false;
    pulse.progress = 100;

    $$(".living-worker").forEach(row => {
      row.classList.remove("working");
      row.classList.add("complete");
      $(".worker-icon", row).textContent = "✓";
      $("em", row).textContent = "Complete";
    });

    setPipeline(5);
    $("#pipelineStatus").textContent = "Complete";
    updatePulse("Production complete", 0, 100);

    $("#studioPulse").classList.add("celebrate");
    document.body.classList.add("studio-complete");

    setTimeout(() => {
      $("#studioPulse").classList.remove("celebrate");
      document.body.classList.remove("studio-complete");
    }, 1800);
  }

  function observeGeneration() {
    const create = $("#createDreamButton");
    const stage = $("#renderStage");
    if (!create || !stage) return;

    create.addEventListener("click", startLivingProduction, true);

    new MutationObserver(() => {
      const image = $("img", stage);
      const failed = stage.textContent.includes("Generation failed");

      if (image && image.src && !image.dataset.livingComplete) {
        image.dataset.livingComplete = "true";
        finishLivingProduction();
      }

      if (failed) {
        clearInterval(pulse.timer);
        pulse.active = false;
        updatePulse("Needs attention", 0, pulse.progress);
        $("#pipelineStatus").textContent = "Stopped";
      }
    }).observe(stage, { childList: true, subtree: true, characterData: true });
  }

  function replaceLogos() {
    $$('img[src*="otb-"]').forEach(image => {
      image.src = "/otb-directors-logo.svg";
    });
  }

  function boot() {
    mountBackground();
    upgradeSidebar();
    mountPipeline();
    mountPulse();
    mountActivationOverlay();
    replaceLogos();
    observeGeneration();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
