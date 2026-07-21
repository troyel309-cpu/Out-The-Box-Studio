(() => {
  "use strict";

  function mountAttentionExperience() {
    if (document.querySelector("#attentionExperience")) return;

    const home = document.querySelector("#homeView");
    const hero = home?.querySelector(".hero-card");
    if (!home || !hero) return;

    hero.classList.add("attention-hero");
    hero.innerHTML = `
      <div class="hero-copy">
        <span class="hero-badge">OUT THE BOX STUDIO</span>
        <div class="live-badge"><span></span> Living creative production</div>
        <h2>Bring your idea<br><em>out of the box.</em></h2>
        <p>Build commercials, characters, campaigns, storyboards, game assets, and more—inside one living AI studio.</p>

        <div class="hero-actions">
          <button class="primary large hero-primary" data-start-create>Start creating</button>
          <button class="secondary large" id="attentionLibraryButton">See what we made</button>
        </div>

        <div class="hero-proof-row">
          <div><strong>4</strong><span>Guided steps</span></div>
          <div><strong>AI</strong><span>Specialist crew</span></div>
          <div><strong>✓</strong><span>Evidence verified</span></div>
        </div>
      </div>

      <div class="hero-showcase">
        <div class="showcase-glow"></div>
        <article class="showcase-card">
          <span class="showcase-label">NOW BUILDING</span>
          <div class="showcase-icon">✨</div>
          <h3 id="showcaseTitle">Tiny Troy Commercial</h3>
          <p id="showcaseText">A continuity-locked character scene built for a real campaign.</p>
          <div class="showcase-progress"><span></span></div>
        </article>

        <div class="floating-chip chip-one">🎬 Commercial</div>
        <div class="floating-chip chip-two">🧸 Character</div>
        <div class="floating-chip chip-three">🎮 Game Asset</div>
        <div class="floating-chip chip-four">📱 Social</div>
      </div>
    `;

    const attention = document.createElement("div");
    attention.id = "attentionExperience";
    attention.innerHTML = `
      <section class="spotlight-strip">
        <div class="spotlight-copy">
          <p class="eyebrow">FEATURED EXPERIENCE</p>
          <h2>Meet Tiny Troy Mode</h2>
          <p>Use your official character reference, lock continuity, direct the scene, and build campaign-ready images.</p>
          <button class="primary" id="tinyTroyModeButton">Create with Tiny Troy</button>
        </div>

        <div class="spotlight-visual">
          <div class="spotlight-orbit orbit-a"></div>
          <div class="spotlight-orbit orbit-b"></div>
          <div class="spotlight-logo"></div>
          <div class="spotlight-tag tag-a">Face locked</div>
          <div class="spotlight-tag tag-b">Style directed</div>
          <div class="spotlight-tag tag-c">Ready to generate</div>
        </div>
      </section>

      <section class="idea-marquee" aria-label="Creative possibilities">
        <div class="marquee-track">
          <span>Commercials</span><i>✦</i>
          <span>Characters</span><i>✦</i>
          <span>Campaigns</span><i>✦</i>
          <span>Storyboards</span><i>✦</i>
          <span>Game Assets</span><i>✦</i>
          <span>Social Content</span><i>✦</i>
          <span>Commercials</span><i>✦</i>
          <span>Characters</span><i>✦</i>
          <span>Campaigns</span><i>✦</i>
          <span>Storyboards</span><i>✦</i>
        </div>
      </section>
    `;

    hero.insertAdjacentElement("afterend", attention);

    hero.querySelector("[data-start-create]")?.addEventListener("click", () => {
      document.querySelector(".format-card[data-format='Commercial']")?.click();
    });

    document.querySelector("#attentionLibraryButton")?.addEventListener("click", () => {
      document.querySelector(".nav-item[data-view='library']")?.click();
    });

    document.querySelector("#tinyTroyModeButton")?.addEventListener("click", () => {
      document.querySelector(".format-card[data-format='Character Scene']")?.click();
    });

    rotateShowcase();
    addSpotlightMotion();
  }

  function rotateShowcase() {
    const items = [
      ["Tiny Troy Commercial", "A continuity-locked character scene built for a real campaign.", "✨"],
      ["Social Campaign", "A bold visual package built to grab attention and move an audience.", "📱"],
      ["Game World Concept", "A character, environment, and production direction built together.", "🎮"],
      ["Storyboard Sequence", "A visual story mapped into clear, production-ready scenes.", "🎬"]
    ];

    let index = 0;

    setInterval(() => {
      const title = document.querySelector("#showcaseTitle");
      const text = document.querySelector("#showcaseText");
      const icon = document.querySelector(".showcase-icon");
      if (!title || !text || !icon) return;

      index = (index + 1) % items.length;
      const [nextTitle, nextText, nextIcon] = items[index];

      const elements = [title, text, icon];
      elements.forEach(element => {
        element.animate(
          [
            { opacity: 1, transform: "translateY(0)" },
            { opacity: 0, transform: "translateY(-8px)" }
          ],
          { duration: 180, fill: "forwards" }
        );
      });

      setTimeout(() => {
        title.textContent = nextTitle;
        text.textContent = nextText;
        icon.textContent = nextIcon;

        elements.forEach(element => {
          element.animate(
            [
              { opacity: 0, transform: "translateY(8px)" },
              { opacity: 1, transform: "translateY(0)" }
            ],
            { duration: 280, fill: "forwards" }
          );
        });
      }, 190);
    }, 3400);
  }

  function addSpotlightMotion() {
    document.querySelectorAll(".format-card").forEach((card, index) => {
      card.style.setProperty("--card-delay", `${index * 45}ms`);
      card.addEventListener("pointermove", event => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--spot-x", `${x}%`);
        card.style.setProperty("--spot-y", `${y}%`);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAttentionExperience, { once: true });
  } else {
    mountAttentionExperience();
  }
})();
