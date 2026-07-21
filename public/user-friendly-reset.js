(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function replaceLogos() {
    $$('img[src*="otb-"], .rail-brand img, .premium-cube img, .render-orb img, .pulse-logo img, .visual-box-stage img')
      .forEach(image => image.src = "/otb-simple-open-box.svg");
  }

  function simplifyNavigation() {
    const nav = $("#visualRailNavigation");
    if (!nav || $("#moreToolsButton")) return;

    const all = $$(".visual-nav", nav);
    const essentials = all.slice(0, 3);
    const advanced = all.slice(3);

    advanced.forEach(button => button.classList.add("advanced-nav-item"));

    const more = document.createElement("button");
    more.id = "moreToolsButton";
    more.className = "visual-nav more-tools-button";
    more.innerHTML = `
      <span>•••</span>
      <div><strong>More Tools</strong><small>Workforce, assets, insights</small></div>
    `;

    nav.appendChild(more);

    more.addEventListener("click", () => {
      const open = nav.classList.toggle("show-advanced");
      more.classList.toggle("active", open);
      $("strong", more).textContent = open ? "Hide Tools" : "More Tools";
    });

    nav.addEventListener("click", event => {
      const clicked = event.target.closest(".visual-nav");
      if (!clicked || clicked === more) return;

      all.forEach(button => button.classList.remove("active"));
      clicked.classList.add("active");
    });
  }

  function fixActiveNavigation() {
    const sections = {
      workspaceSection: "workspace",
      librarySection: "library",
      productionSection: "production"
    };

    const sync = () => {
      const activeSection = Object.entries(sections)
        .find(([id]) => $(`#${id}`)?.classList.contains("active"))?.[1];

      $$(".visual-nav").forEach(button => {
        if (button.id === "moreToolsButton") return;
        button.classList.toggle(
          "active",
          Boolean(activeSection) && button.dataset.visualSection === activeSection
        );
      });
    };

    Object.keys(sections).forEach(id => {
      const section = $(`#${id}`);
      if (section) {
        new MutationObserver(sync).observe(section, { attributes: true });
      }
    });

    sync();
  }

  function simplifyHero() {
    const hero = $("#visualCommandHero");
    if (!hero) return;

    const title = $(".visual-hero-copy h2", hero);
    const copy = $(".visual-hero-copy p", hero);
    const welcome = $(".visual-welcome", hero);

    if (welcome) welcome.textContent = "✦ YOUR CREATIVE STUDIO";
    if (title) title.innerHTML = `What do you want<br><em>to create today?</em>`;
    if (copy) {
      copy.textContent =
        "Start with one simple idea. The studio will help you choose a reference, build the scene, and create the result.";
    }

    const liveFloor = $(".visual-live-floor", hero);
    if (liveFloor) {
      liveFloor.classList.add("advanced-studio-panel");
    }
  }

  function mountSimpleSteps() {
    if ($("#simpleCreationSteps")) return;

    const ideaDock = $(".idea-dock");
    if (!ideaDock) return;

    const steps = document.createElement("div");
    steps.id = "simpleCreationSteps";
    steps.className = "simple-creation-steps";
    steps.innerHTML = `
      <div class="simple-step active"><span>1</span><strong>Describe your idea</strong></div>
      <div class="simple-step"><span>2</span><strong>Choose a picture</strong></div>
      <div class="simple-step"><span>3</span><strong>Create</strong></div>
      <div class="simple-step"><span>4</span><strong>Review result</strong></div>
    `;

    ideaDock.parentNode.insertBefore(steps, ideaDock);

    const idea = $("#ideaInput");
    const assetRail = $("#assetRail");
    const create = $("#createDreamButton");
    const render = $("#renderStage");

    const setStep = index => {
      $$(".simple-step").forEach((step, i) => {
        step.classList.toggle("active", i === index);
        step.classList.toggle("complete", i < index);
      });
    };

    idea?.addEventListener("input", () => {
      setStep(idea.value.trim().length >= 8 ? 1 : 0);
    });

    assetRail?.addEventListener("click", () => {
      setTimeout(() => {
        if ($(".asset-card.selected")) setStep(2);
      }, 20);
    });

    create?.addEventListener("click", () => setStep(2), true);

    if (render) {
      new MutationObserver(() => {
        if ($("img", render)) setStep(3);
      }).observe(render, { childList: true, subtree: true });
    }
  }

  function simplifyIdeaDock() {
    const dock = $(".idea-dock");
    if (!dock || dock.classList.contains("friendly-dock")) return;

    dock.classList.add("friendly-dock");

    const title = $(".idea-dock-copy h2", dock);
    if (title) title.textContent = "Tell us what you want to make";

    const textarea = $("#ideaInput");
    if (textarea) {
      textarea.placeholder =
        "Example: Make Tiny Troy welcoming a customer and handing them the keys to a new car.";
    }

    const controls = $(".idea-controls", dock);
    if (controls && !$("#advancedOptionsToggle")) {
      const toggle = document.createElement("button");
      toggle.id = "advancedOptionsToggle";
      toggle.type = "button";
      toggle.textContent = "More options";
      controls.insertAdjacentElement("beforebegin", toggle);

      controls.classList.add("friendly-controls");
      controls.classList.remove("show-options");

      toggle.addEventListener("click", () => {
        const show = controls.classList.toggle("show-options");
        toggle.textContent = show ? "Hide options" : "More options";
      });
    }
  }

  function dockStudioPulse() {
    const pulse = $("#studioPulse");
    if (!pulse || pulse.classList.contains("friendly-pulse")) return;

    pulse.classList.add("friendly-pulse");

    const rail = $(".rail");
    const bottom = $(".rail-bottom");

    if (rail && bottom) {
      rail.insertBefore(pulse, bottom);
    }

    pulse.addEventListener("click", () => {
      pulse.classList.toggle("expanded");
    });
  }

  function cleanLibraryText() {
    const clean = () => {
      $$(".project-card p").forEach(paragraph => {
        let text = paragraph.textContent || "";
        if (
          text.includes("undefined") ||
          text.includes("JSON") ||
          text.includes("fallback") ||
          text.includes("provider")
        ) {
          paragraph.textContent = "Creative project saved and ready to continue.";
        }
      });
    };

    clean();

    const gallery = $("#projectGallery");
    if (gallery) {
      new MutationObserver(clean).observe(gallery, { childList: true, subtree: true });
    }
  }

  function addBeginnerGuide() {
    if (localStorage.getItem("otbGuideComplete") === "yes") return;
    if ($("#friendlyGuide")) return;

    const guide = document.createElement("div");
    guide.id = "friendlyGuide";
    guide.className = "friendly-guide";
    guide.innerHTML = `
      <div class="guide-card">
        <button id="closeFriendlyGuide">×</button>
        <img src="/otb-simple-open-box.svg" alt="">
        <p>WELCOME TO OUT THE BOX STUDIO</p>
        <h2>Creating starts with one idea.</h2>
        <span>
          Type what you want to make, choose a picture, and press
          <strong>Bring it to life</strong>. The studio handles the rest.
        </span>
        <button id="startFriendlyGuide">Start creating</button>
      </div>
    `;

    document.body.appendChild(guide);

    const close = () => {
      guide.remove();
      localStorage.setItem("otbGuideComplete", "yes");
    };

    $("#closeFriendlyGuide").addEventListener("click", close);
    $("#startFriendlyGuide").addEventListener("click", () => {
      close();
      $(".idea-dock")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => $("#ideaInput")?.focus(), 450);
    });
  }

  function hideAdvancedByDefault() {
    const advanced = [
      ".creator-bar",
      ".creative-brief-panel",
      ".living-pipeline",
      ".visual-pipeline"
    ];

    advanced.forEach(selector => {
      const element = $(selector);
      if (element) element.classList.add("friendly-advanced");
    });

    if (!$("#showAdvancedExperience")) {
      const button = document.createElement("button");
      button.id = "showAdvancedExperience";
      button.textContent = "Show advanced studio details";

      const timeline = $(".timeline-floor");
      if (timeline) timeline.insertAdjacentElement("beforebegin", button);

      button.addEventListener("click", () => {
        const open = document.body.classList.toggle("show-friendly-advanced");
        button.textContent = open
          ? "Hide advanced studio details"
          : "Show advanced studio details";
      });
    }
  }

  function boot() {
    replaceLogos();
    simplifyNavigation();
    fixActiveNavigation();
    simplifyHero();
    mountSimpleSteps();
    simplifyIdeaDock();
    dockStudioPulse();
    cleanLibraryText();
    hideAdvancedByDefault();
    addBeginnerGuide();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
