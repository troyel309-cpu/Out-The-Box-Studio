
import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

import { handleVideoStudioRequest } from "./video-studio-addon.js";

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const PUBLIC = join(ROOT, "public");
const DATA = join(ROOT, "data");
const PROJECTS_FILE = join(DATA, "projects.json");
const WORKERS_FILE = join(ROOT, "workers", "registry.json");
const CHARACTERS_FILE = join(ROOT, "characters", "registry.json");
const ASSETS_FILE = join(DATA, "assets.json");
const UPLOADS = join(PUBLIC, "uploads");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

await mkdir(DATA, { recursive: true });
await mkdir(UPLOADS, { recursive: true });
if (!existsSync(PROJECTS_FILE)) await writeFile(PROJECTS_FILE, "[]");
if (!existsSync(ASSETS_FILE)) await writeFile(ASSETS_FILE, "[]");

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function loadProjects() {
  return JSON.parse(await readFile(PROJECTS_FILE, "utf8"));
}

async function saveProjects(projects) {
  await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}


async function loadAssets() {
  return JSON.parse(await readFile(ASSETS_FILE, "utf8"));
}

async function saveAssets(assets) {
  await writeFile(ASSETS_FILE, JSON.stringify(assets, null, 2));
}

const allowedImageTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"]
]);

function safeAssetCategory(value = "reference") {
  const allowed = new Set(["reference", "character", "logo", "product", "background"]);
  return allowed.has(value) ? value : "reference";
}

async function loadWorkers() {
  if (!existsSync(WORKERS_FILE)) return [];
  return JSON.parse(await readFile(WORKERS_FILE, "utf8"));
}

async function loadCharacters() {
  if (!existsSync(CHARACTERS_FILE)) return [];
  return JSON.parse(await readFile(CHARACTERS_FILE, "utf8"));
}

function buildContinuityPrompt(prompt, character, shotType = "cinematic") {
  if (!character) return prompt;
  const rules = (character.continuityRules || []).map(rule => `- ${rule}`).join("\n");
  return `CHARACTER CONTINUITY LOCK — ${character.name} V${character.version}\nAppearance: ${character.appearance}\nWardrobe: ${character.wardrobe}\nPersonality: ${character.personality}\nContinuity rules:\n${rules}\nShot type: ${shotType}.\nScene request: ${prompt}\nNegative constraints: ${character.negativePrompt}\nMaintain the registered identity. Do not redesign the character.`;
}


async function readBinaryBody(req, maxBytes = 15 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error("Image is larger than 15 MB.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", chunk => {
      body += chunk;

      if (Buffer.byteLength(body, "utf8") > 25 * 1024 * 1024) {
        reject(new Error("Upload request is too large. Keep each image under 15 MB."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body.trim()) return resolve({});

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });

    req.on("error", reject);
  });
}

function determineRequiredCapabilities(idea = "") {
  const text = idea.toLowerCase();
  const capabilities = new Set([
    "project-planning",
    "crew-assembly",
    "workflow-routing",
    "artifact-verification",
    "release-validation"
  ]);

  if (
    text.includes("story") ||
    text.includes("script") ||
    text.includes("ad") ||
    text.includes("commercial") ||
    text.includes("campaign") ||
    text.includes("facebook") ||
    text.includes("video")
  ) {
    capabilities.add("creative-brief");
    capabilities.add("script-writing");
    capabilities.add("storyboard-planning");
  }

  if (
    text.includes("image") ||
    text.includes("picture") ||
    text.includes("flyer") ||
    text.includes("cover") ||
    text.includes("logo") ||
    text.includes("graphic") ||
    text.includes("character") ||
    text.includes("ad")
  ) {
    capabilities.add("image-prompting");
    capabilities.add("image-generation");
  }

  if (
    text.includes("character") ||
    text.includes("mascot") ||
    text.includes("tiny troy") ||
    text.includes("brand")
  ) {
    capabilities.add("character-design");
    capabilities.add("brand-consistency");
  }

  if (
    text.includes("voice") ||
    text.includes("narration") ||
    text.includes("voiceover") ||
    text.includes("audio")
  ) {
    capabilities.add("voice-direction");
    capabilities.add("speech-generation");
  }

  if (
    text.includes("video") ||
    text.includes("animation") ||
    text.includes("cgi") ||
    text.includes("movie") ||
    text.includes("commercial")
  ) {
    capabilities.add("timeline-planning");
    capabilities.add("video-rendering");
  }

  return [...capabilities];
}

function assembleCrew(workers, requiredCapabilities) {
  return workers
    .filter(worker => worker.enabled)
    .map(worker => {
      const matchedCapabilities = worker.capabilities.filter(capability =>
        requiredCapabilities.includes(capability)
      );

      return {
        id: worker.id,
        name: worker.name,
        health: worker.health,
        matchedCapabilities,
        ready: worker.health === "healthy"
      };
    })
    .filter(worker => worker.matchedCapabilities.length > 0);
}

function buildExecutionPlan(idea, crew) {
  const steps = [];

  const director = crew.find(worker => worker.id === "studio-director");
  const story = crew.find(worker => worker.id === "story-ai");
  const illustration = crew.find(worker => worker.id === "illustration-ai");
  const character = crew.find(worker => worker.id === "character-ai");
  const voice = crew.find(worker => worker.id === "voice-ai");
  const video = crew.find(worker => worker.id === "video-ai");
  const quality = crew.find(worker => worker.id === "quality-ai");

  if (director) {
    steps.push({
      order: steps.length + 1,
      workerId: director.id,
      worker: director.name,
      job: "Interpret the idea, define the deliverables, and coordinate the crew.",
      status: director.ready ? "ready" : "blocked"
    });
  }

  if (story) {
    steps.push({
      order: steps.length + 1,
      workerId: story.id,
      worker: story.name,
      job: "Create the brief, message, script, and production direction.",
      status: story.ready ? "ready" : "blocked"
    });
  }

  if (character) {
    steps.push({
      order: steps.length + 1,
      workerId: character.id,
      worker: character.name,
      job: "Protect character identity and brand consistency.",
      status: character.ready ? "ready" : "blocked"
    });
  }

  if (illustration) {
    steps.push({
      order: steps.length + 1,
      workerId: illustration.id,
      worker: illustration.name,
      job: "Prepare and generate the required visual assets.",
      status: illustration.ready ? "ready" : "waiting-for-provider"
    });
  }

  if (voice) {
    steps.push({
      order: steps.length + 1,
      workerId: voice.id,
      worker: voice.name,
      job: "Develop voice direction and generate narration or speech.",
      status: voice.ready ? "ready" : "waiting-for-provider"
    });
  }

  if (video) {
    steps.push({
      order: steps.length + 1,
      workerId: video.id,
      worker: video.name,
      job: "Assemble the timeline and render the video output.",
      status: video.ready ? "ready" : "waiting-for-provider"
    });
  }

  if (quality) {
    steps.push({
      order: steps.length + 1,
      workerId: quality.id,
      worker: quality.name,
      job: "Verify artifacts, record evidence, and approve or block release.",
      status: quality.ready ? "ready" : "blocked"
    });
  }

  return {
    idea,
    steps,
    releaseRule:
      "The project cannot be marked complete until Evidence Quality AI verifies the required artifacts."
  };
}



function buildRuntimeState(project) {
  const artifactsByType = new Set((project.artifacts || []).map(a => a.type));
  const stages = [
    { id: "crew", name: "Crew Assembly", worker: "Studio Director AI", required: [], status: "complete" },
    { id: "story", name: "Story Package", worker: "Story AI", required: ["creative-brief", "script", "storyboard"] },
    { id: "character", name: "Character Continuity", worker: "Character Continuity AI", required: ["character"] },
    { id: "visuals", name: "Visual Direction", worker: "Illustration AI", required: ["image-prompts"] },
    { id: "voice", name: "Voice Direction", worker: "Voice AI", required: ["audio-direction"] },
    { id: "video", name: "Video Assembly Plan", worker: "Video Assembly AI", required: ["video-plan"] },
    { id: "quality", name: "Evidence Review", worker: "Evidence Quality AI", required: ["qa"] }
  ].map(stage => ({
    ...stage,
    status: stage.status || (stage.required.every(t => artifactsByType.has(t)) ? "complete" : "pending")
  }));

  const requiredTypes = stages.flatMap(stage => stage.required);
  const verifiedArtifacts = requiredTypes.filter(type => artifactsByType.has(type));
  const complete = requiredTypes.every(type => artifactsByType.has(type));

  return {
    status: complete ? "package-complete" : "in-progress",
    currentStage: stages.find(stage => stage.status !== "complete")?.id || "complete",
    stages,
    evidence: {
      requiredArtifacts: requiredTypes.length,
      verifiedArtifacts: verifiedArtifacts.length,
      releaseApproved: complete,
      finalMediaRendered: Boolean((project.artifacts || []).some(a => a.type === "video" && a.url))
    }
  };
}

function executeLocalProduction(project) {
  const idea = project.idea || "Untitled production";
  const ensure = (type, name, content) => {
    if (!(project.artifacts || []).some(a => a.type === type)) {
      project.artifacts.push({ type, name, content });
    }
  };

  ensure("creative-brief", "creative_brief.md", `PURPOSE
Turn this idea into a clear, audience-ready production package.

IDEA
${idea}

DELIVERABLES
30-second story, visual direction, voice direction, video assembly plan, and evidence review.`);
  ensure("script", "commercial_script.md", `0–05 sec — Hook: Open with the strongest truthful visual promise.
05–18 sec — Story: Show the experience, problem, and transformation.
18–26 sec — Proof: Present the payoff and real-world value.
26–30 sec — Call to action: Invite the viewer to take the next step.

Project idea: ${idea}`);
  ensure("storyboard", "storyboard.json", JSON.stringify([
    { scene: 1, duration: "0-5s", purpose: "Hook", visual: "Immediate hero reveal", audio: "Short attention-grabbing opening" },
    { scene: 2, duration: "5-18s", purpose: "Build", visual: "Show the experience and transformation", audio: "Clear benefit-led narration" },
    { scene: 3, duration: "18-30s", purpose: "Proof + CTA", visual: "Payoff, trust moment, final brand frame", audio: "Confident call to action" }
  ], null, 2));
  ensure("character", "character_continuity.md", "Keep every recurring character visually consistent across scenes: face, skin tone, hair, clothing, accessories, proportions, personality, and brand-safe presentation. Record any intentional change before generating assets.");
  ensure("image-prompts", "scene_prompts.md", `Scene 1 — Cinematic hero opening based on: ${idea}
Scene 2 — Dynamic transformation sequence with clear visual storytelling and consistent characters.
Scene 3 — Warm payoff frame with an unmistakable call to action and clean brand presentation.`);
  ensure("audio-direction", "voice_direction.md", "Voice: warm, confident, conversational, trustworthy. Pace: energetic but easy to understand. Music: modern and uplifting, kept below narration. Sound design: restrained transitions and one memorable payoff accent.");
  ensure("video-plan", "video_assembly_plan.json", JSON.stringify({
    format: "30-second master",
    aspectRatios: ["16:9", "9:16", "1:1"],
    timeline: [
      { range: "0-5s", layer: "Hook + title" },
      { range: "5-18s", layer: "Main story + visual progression" },
      { range: "18-26s", layer: "Proof/payoff" },
      { range: "26-30s", layer: "CTA + logo/end card" }
    ],
    renderState: "planned-not-rendered"
  }, null, 2));
  ensure("qa", "evidence_report.md", "PASS: Required planning artifacts exist and are inspectable. RELEASE APPROVAL: Production package approved. FINAL MEDIA STATUS: No MP4, generated voice track, or complete rendered video is claimed unless a real media artifact is attached.");

  project.workers = (project.workers || []).map(worker => {
    if (worker.name.includes("Video")) return { ...worker, status: "planned", output: "Video assembly plan complete; render provider still required" };
    if (worker.name.includes("Image")) return { ...worker, status: "planned", output: "Scene prompts complete; image provider optional" };
    return { ...worker, status: "complete" };
  });
  project.releaseLevel = "Verified production package — final media not rendered";
  project.runtime = buildRuntimeState(project);
  project.executedAt = new Date().toISOString();
  return project;
}

function localCrew(idea) {
  const title = idea.match(/PROJECT:\s*(.+)/i)?.[1]?.split("\n")[0]?.trim() || "New Dream";
  return {
    title,
    status: "production-package-ready",
    releaseLevel: "Concept package — no final video rendered",
    workers: [
      { name: "Studio Director AI", status: "complete", output: "Creative brief" },
      { name: "Story Architect AI", status: "complete", output: "30-second script" },
      { name: "Storyboard AI", status: "complete", output: "3-scene storyboard" },
      { name: "Character Continuity AI", status: "complete", output: "Tiny Troy continuity guide" },
      { name: "Image Director AI", status: "ready", output: "Scene image prompts" },
      { name: "Video Assembly AI", status: "blocked", output: "Waiting for generated scene images and audio" },
      { name: "Evidence QA AI", status: "complete", output: "Truthful release check" }
    ],
    artifacts: [
      { type: "creative-brief", name: "creative_brief.md", content: `Create a premium Tiny Troy commercial from this idea:\n\n${idea}` },
      { type: "script", name: "commercial_script.md", content: "Scene 1: Tiny Troy enters the showroom and speaks directly to drivers.\nScene 2: Vehicles transform around him while he explains the upgrade experience.\nScene 3: A customer receives keys and Tiny Troy delivers the call to action." },
      { type: "storyboard", name: "storyboard.json", content: JSON.stringify([
        { scene: 1, title: "Showroom Arrival", shot: "Wide-to-medium tracking shot", goal: "Introduce Tiny Troy and the dealership." },
        { scene: 2, title: "Vehicle Transformation", shot: "Dynamic orbit with energetic transitions", goal: "Show options and excitement." },
        { scene: 3, title: "Customer Payoff", shot: "Warm hero shot with keys", goal: "Deliver trust and CTA." }
      ], null, 2) },
      { type: "character", name: "tiny_troy_continuity.md", content: "Warm brown skin, large expressive brown eyes, short dark hair, neatly shaped full black beard and mustache, small stud earrings, brown fedora, polished stylized 3D appearance, confident and approachable." },
      { type: "image-prompts", name: "scene_prompts.md", content: "Scene 1: Stylized 3D Tiny Troy entering a bright Nissan showroom, cinematic lighting, original family-friendly animated-film quality.\nScene 2: Tiny Troy snapping his fingers as vehicles transition around him, energetic camera movement, polished materials.\nScene 3: Tiny Troy handing keys to a smiling customer, warm emotional lighting, dealership branding handled accurately." },
      { type: "qa", name: "qa_report.md", content: "PASS: production package exists. BLOCKED: no newly generated images, voice track, music, or MP4. Do not mark final video complete." }
    ]
  };
}

async function runOpenAI(idea) {
  const prompt = `You are the Studio Director AI for Out the Box Studio. Convert the user's idea into a truthful production package. Return strict JSON with keys: title, status, releaseLevel, workers (array of name,status,output), artifacts (array of type,name,content). Include a creative brief, 30-second script, 3-scene storyboard, Tiny Troy continuity guide, image prompts, audio direction, and QA report. Never claim a final video exists unless an MP4 was actually produced.\n\nUSER IDEA:\n${idea}`;
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5",
      input: prompt,
      text: { format: { type: "json_object" } }
    })
  });
  if (!r.ok) throw new Error(`OpenAI request failed: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return JSON.parse(data.output_text);
}

async function generateImage(prompt, projectId) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt,
      size: "1024x1024"
    })
  });
  if (!r.ok) throw new Error(`Image generation failed: ${r.status} ${await r.text()}`);
  const data = await r.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image API returned no image.");
  const dir = join(PUBLIC, "generated");
  await mkdir(dir, { recursive: true });
  const filename = `${projectId}-${Date.now()}.png`;
  await writeFile(join(dir, filename), Buffer.from(b64, "base64"));
  return `/generated/${filename}`;
}


async function editImage(prompt, projectId, asset) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  const sourcePath = join(PUBLIC, normalize(asset.url));
  if (!sourcePath.startsWith(PUBLIC) || !existsSync(sourcePath)) throw new Error("Reference image is missing.");
  const bytes = await readFile(sourcePath);
  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-1");
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("input_fidelity", "high");
  form.append("image", new Blob([bytes], { type: asset.mimeType }), asset.originalName);
  const r = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: form
  });
  if (!r.ok) throw new Error(`Image edit failed: ${r.status} ${await r.text()}`);
  const data = await r.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("Image edit API returned no image.");
  const dir = join(PUBLIC, "generated");
  await mkdir(dir, { recursive: true });
  const filename = `${projectId}-reference-edit-${Date.now()}.png`;
  await writeFile(join(dir, filename), Buffer.from(b64, "base64"));
  return `/generated/${filename}`;
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
    // VIDEO_STUDIO_HANDLER_INSTALLED
    if (await handleVideoStudioRequest(req, res)) {
      return;
    }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/projects") {
      return json(res, 200, await loadProjects());
    }

    if (req.method === "GET" && url.pathname === "/api/workers") {
      return json(res, 200, await loadWorkers());
    }

    if (req.method === "GET" && url.pathname === "/api/characters") {
      return json(res, 200, await loadCharacters());
    }


    if (req.method === "GET" && url.pathname === "/api/assets") {
      return json(res, 200, await loadAssets());
    }


    if (req.method === "POST" && url.pathname === "/api/assets/upload") {
      const mimeType = String(req.headers["content-type"] || "").split(";")[0].trim();
      const ext = allowedImageTypes.get(mimeType);
      if (!ext) return json(res, 400, { error: "Upload a PNG, JPG, or WEBP image." });

      const bytes = await readBinaryBody(req);
      if (!bytes.length) return json(res, 400, { error: "The selected image is empty." });

      const id = randomUUID();
      const filename = `${id}${ext}`;
      await writeFile(join(UPLOADS, filename), bytes);

      const name = String(url.searchParams.get("name") || "Reference image").trim().slice(0, 120);
      const originalName = String(url.searchParams.get("originalName") || name).slice(0, 180);
      const category = safeAssetCategory(url.searchParams.get("category") || "reference");
      const tags = String(url.searchParams.get("tags") || "")
        .split(",").map(tag => tag.trim()).filter(Boolean).slice(0, 12);
      const officialReference = url.searchParams.get("officialReference") === "true";

      const asset = {
        id, name, originalName, category, tags, mimeType, sizeBytes: bytes.length,
        url: `/uploads/${filename}`, officialReference, createdAt: new Date().toISOString()
      };
      const assets = await loadAssets();
      assets.unshift(asset);
      await saveAssets(assets);
      console.log(`Asset uploaded: ${originalName} (${bytes.length} bytes)`);
      return json(res, 201, asset);
    }

    if (req.method === "POST" && url.pathname === "/api/assets") {
      const body = await readJsonBody(req);
      const name = String(body.name || "Reference image").trim().slice(0, 120);
      const mimeType = String(body.mimeType || "");
      const dataUrl = String(body.dataUrl || "");
      const ext = allowedImageTypes.get(mimeType);
      if (!ext) return json(res, 400, { error: "Upload a PNG, JPG, or WEBP image." });
      const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
      if (!match) return json(res, 400, { error: "Invalid image upload." });
      const bytes = Buffer.from(match[2], "base64");
      if (!bytes.length || bytes.length > 15 * 1024 * 1024) return json(res, 400, { error: "Image must be between 1 byte and 15 MB." });
      const id = randomUUID();
      const filename = `${id}${ext}`;
      await writeFile(join(UPLOADS, filename), bytes);
      const asset = {
        id, name, originalName: String(body.originalName || name).slice(0, 180),
        category: safeAssetCategory(body.category), tags: Array.isArray(body.tags) ? body.tags.slice(0, 12) : [],
        mimeType, sizeBytes: bytes.length, url: `/uploads/${filename}`,
        officialReference: Boolean(body.officialReference), createdAt: new Date().toISOString()
      };
      const assets = await loadAssets();
      assets.unshift(asset);
      await saveAssets(assets);
      return json(res, 201, asset);
    }

    if (req.method === "DELETE" && url.pathname.match(/^\/api\/assets\/[^/]+$/)) {
      const id = url.pathname.split("/")[3];
      const assets = await loadAssets();
      const asset = assets.find(a => a.id === id);
      if (!asset) return json(res, 404, { error: "Asset not found." });
      const next = assets.filter(a => a.id !== id);
      await saveAssets(next);
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/api/crew/plan") {
      const body = await readJsonBody(req);
      const idea = String(body.idea || "").trim();

      if (!idea) {
        return json(res, 400, {
          error: "An idea is required."
        });
      }

      const workers = await loadWorkers();
      const requiredCapabilities = determineRequiredCapabilities(idea);
      const crew = assembleCrew(workers, requiredCapabilities);
      const executionPlan = buildExecutionPlan(idea, crew);

      return json(res, 201, {
        status: "planned",
        idea,
        requiredCapabilities,
        crew,
        executionPlan,
        evidence: {
          workerRegistryLoaded: workers.length > 0,
          workersConsidered: workers.length,
          workersSelected: crew.length
        }
      });
    }


    if (req.method === "POST" && url.pathname === "/api/projects") {
      const { idea } = await readBody(req);
      if (!idea?.trim()) return json(res, 400, { error: "Tell the studio what to build." });
      let production;
      try {
        production = OPENAI_API_KEY ? await runOpenAI(idea) : localCrew(idea);
      } catch (error) {
        production = localCrew(idea);
        production.releaseLevel += ` — AI provider fallback used: ${error.message}`;
      }
      const workers = await loadWorkers();
      const requiredCapabilities = determineRequiredCapabilities(idea);
      const crew = assembleCrew(workers, requiredCapabilities);
      const crewPlan = {
        status: "planned",
        requiredCapabilities,
        crew,
        executionPlan: buildExecutionPlan(idea, crew),
        evidence: {
          workerRegistryLoaded: workers.length > 0,
          workersConsidered: workers.length,
          workersSelected: crew.length
        }
      };
      const project = { id: randomUUID(), idea, createdAt: new Date().toISOString(), crewPlan, ...production };
      project.runtime = buildRuntimeState(project);
      const projects = await loadProjects();
      projects.unshift(project);
      await saveProjects(projects);
      return json(res, 201, project);
    }


    if (req.method === "POST" && url.pathname.match(/^\/api\/projects\/[^/]+\/execute$/)) {
      const id = url.pathname.split("/")[3];
      const projects = await loadProjects();
      const project = projects.find(p => p.id === id);
      if (!project) return json(res, 404, { error: "Project not found." });
      executeLocalProduction(project);
      await saveProjects(projects);
      return json(res, 200, project);
    }

    if (req.method === "POST" && url.pathname.match(/^\/api\/projects\/[^/]+\/image$/)) {
      const id = url.pathname.split("/")[3];
      const { prompt, characterId = "tiny-troy", shotType = "cinematic", mode = "ai", assetId = null } = await readBody(req);
      const projects = await loadProjects();
      const project = projects.find(p => p.id === id);
      if (!project) return json(res, 404, { error: "Project not found." });
      const characters = await loadCharacters();
      const character = characters.find(item => item.id === characterId) || characters[0];
      const continuityPrompt = buildContinuityPrompt(prompt, character, shotType);
      const assets = await loadAssets();
      const sourceAsset = assetId ? assets.find(a => a.id === assetId) : null;
      if ((mode === "assets" || mode === "hybrid") && !sourceAsset) return json(res, 400, { error: "Select a reference image first." });
      let imageUrl;
      if (mode === "assets") {
        imageUrl = sourceAsset.url;
      } else if (mode === "hybrid") {
        imageUrl = await editImage(`${continuityPrompt}\nUse the uploaded reference image as the primary visual source. Preserve recognizable people, product details, composition cues, and brand identity unless the request explicitly changes them.`, id, sourceAsset);
      } else {
        imageUrl = await generateImage(continuityPrompt, id);
      }
      project.artifacts.push({
        id: randomUUID(), type: "image", name: imageUrl.split("/").pop(), url: imageUrl,
        content: prompt, finalPrompt: continuityPrompt, characterId: character?.id || null,
        characterVersion: character?.version || null, shotType, mode, sourceAssetId: sourceAsset?.id || null,
        sourceAssetUrl: sourceAsset?.url || null, provider: mode === "assets" ? "Owner asset" : "OpenAI",
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1", createdAt: new Date().toISOString(),
        approvalStatus: "needs-review"
      });
      project.workers = project.workers.map(w => w.name.includes("Image") ? { ...w, status: "complete", output: "Generated scene image" } : w);
      await saveProjects(projects);
      return json(res, 200, { imageUrl, project });
    }

    if (req.method === "DELETE" && url.pathname.match(/^\/api\/projects\/[^/]+$/)) {
      const id = url.pathname.split("/")[3];
      const projects = (await loadProjects()).filter(p => p.id !== id);
      await saveProjects(projects);
      return json(res, 200, { ok: true });
    }

    let filePath = url.pathname === "/" ? join(PUBLIC, "index.html") : join(PUBLIC, normalize(url.pathname));
    if (!filePath.startsWith(PUBLIC) || !existsSync(filePath)) {
      res.writeHead(404); return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Request failed:", error);
    json(res, error.statusCode || 500, { error: error.message || "Unexpected server error." });
  }
});

server.listen(PORT, () => {
  console.log(`Out the Box Studio running at http://localhost:${PORT}`);
  console.log(OPENAI_API_KEY ? "AI provider: OpenAI connected" : "AI provider: local demo mode");
});
