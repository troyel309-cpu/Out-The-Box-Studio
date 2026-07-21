(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function currentSection() {
    if ($("#librarySection")?.classList.contains("active")) return "library";
    if ($("#productionSection")?.classList.contains("active")) return "production";
    return "workspace";
  }

  function setPrimaryActive(section) {
    $$(".visual-nav").forEach(button => {
      if (button.id === "moreToolsButton") return;
      if (button.classList.contains("sidebar-tool-item")) return;

      button.classList.toggle(
        "active",
        button.dataset.visualSection === section
      );
    });

    $$(".sidebar-tool-item").forEach(button => {
      button.classList.remove("active");
    });
  }

  function buildToolsDrawer() {
    const nav = $("#visualRailNavigation");
    const existingMoreButton = $("#moreToolsButton");
    if (!nav || !existingMoreButton || $("#sidebarToolsDrawer")) return;

    const advancedItems = $$(".advanced-nav-item", nav);

    const drawer = document.createElement("div");
    drawer.id = "sidebarToolsDrawer";
    drawer.className = "sidebar-tools-drawer";

    drawer.innerHTML = `
      <div class="sidebar-tools-head">
        <div>
          <span>MORE TOOLS</span>
          <strong>Advanced studio controls</strong>
        </div>
        <button id="closeSidebarTools" aria-label="Close more tools">×</button>
      </div>

      <div class="sidebar-tools-list"></div>
    `;

    const list = $(".sidebar-tools-list", drawer);

    advancedItems.forEach((item, index) => {
      item.classList.remove("advanced-nav-item");
      item.classList.add("sidebar-tool-item");

      const labels = [
        ["AI Workforce", "View your creative crew"],
        ["Asset Vault", "References, scenes, and media"],
        ["Insights", "Evidence and performance"]
      ];

      const strong = $("strong", item);
      const small = $("small", item);

      if (strong && labels[index]) strong.textContent = labels[index][0];
      if (small && labels[index]) small.textContent = labels[index][1];

      list.appendChild(item);
    });

    nav.insertAdjacentElement("afterend", drawer);

    const replacement = existingMoreButton.cloneNode(true);
    existingMoreButton.replaceWith(replacement);

    function setDrawerOpen(open) {
      drawer.classList.toggle("open", open);
      replacement.classList.toggle("active", open);
      replacement.setAttribute("aria-expanded", String(open));

      const title = $("strong", replacement);
      const subtitle = $("small", replacement);

      if (title) title.textContent = open ? "Close Tools" : "More Tools";
      if (subtitle) {
        subtitle.textContent = open
          ? "Return to main navigation"
          : "Workforce, assets, and insights";
      }

      sessionStorage.setItem("otbSidebarToolsOpen", open ? "yes" : "no");
    }

    replacement.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      setDrawerOpen(!drawer.classList.contains("open"));
    });

    $("#closeSidebarTools").addEventListener("click", () => {
      setDrawerOpen(false);
    });

    $$(".sidebar-tool-item", drawer).forEach(button => {
      button.addEventListener("click", event => {
        $$(".sidebar-tool-item", drawer).forEach(item => item.classList.remove("active"));
        button.classList.add("active");

        const text = button.textContent.toLowerCase();

        if (text.includes("workforce")) {
          event.preventDefault();
          $(".live-floor")?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }

        if (text.includes("asset")) {
          event.preventDefault();
          $(".reference-floor")?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }

        if (text.includes("insights")) {
          event.preventDefault();
          const productionButton = $$(".rail-action")
            .find(item => item.dataset.section === "production");
          productionButton?.click();
          setPrimaryActive("production");
        }
      });
    });

    setDrawerOpen(sessionStorage.getItem("otbSidebarToolsOpen") === "yes");
  }

  function syncActiveState() {
    const sections = ["#workspaceSection", "#librarySection", "#productionSection"];

    const sync = () => {
      setPrimaryActive(currentSection());
    };

    sections.forEach(selector => {
      const section = $(selector);
      if (section) {
        new MutationObserver(sync).observe(section, {
          attributes: true,
          attributeFilter: ["class"]
        });
      }
    });

    document.addEventListener("click", event => {
      const primary = event.target.closest(
        '.visual-nav[data-visual-section]:not(.sidebar-tool-item)'
      );

      if (primary) {
        setTimeout(sync, 0);
      }
    });

    sync();
  }

  function improvePulsePlacement() {
    const pulse = $("#studioPulse");
    const rail = $(".rail");
    const bottom = $(".rail-bottom");

    if (!pulse || !rail || !bottom) return;

    pulse.classList.add("sidebar-pulse-card");

    if (pulse.parentElement !== rail) {
      rail.insertBefore(pulse, bottom);
    }

    const header = $(".visual-pulse-head", pulse);
    if (header && !$("#pulseCollapseButton")) {
      const collapse = document.createElement("button");
      collapse.id = "pulseCollapseButton";
      collapse.type = "button";
      collapse.textContent = "⌄";
      collapse.setAttribute("aria-label", "Collapse Studio Pulse");
      header.appendChild(collapse);

      collapse.addEventListener("click", event => {
        event.stopPropagation();
        pulse.classList.toggle("collapsed");
        collapse.textContent = pulse.classList.contains("collapsed") ? "⌃" : "⌄";
      });
    }
  }

  function boot() {
    buildToolsDrawer();
    syncActiveState();
    improvePulsePlacement();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
