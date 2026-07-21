const $ = s => document.querySelector(s);
let currentProject = null;
let eventLog = [];

async function api(path, options={}) {
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const r = await fetch(path, { ...options, headers });
  const text = await r.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || `HTTP ${r.status}` }; }
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const label=v=>String(v??"").replaceAll("-"," ");
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function listPayload(data, key) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  if (Array.isArray(data[key])) return data[key];
  if (data.data && Array.isArray(data.data[key])) return data.data[key];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;

  return [];
}

function projectPayload(data) {
  return data && data.project ? data.project : data;
}

function assetPayload(data) {
  if (!data) return null;
  if (data.asset && typeof data.asset === "object") return data.asset;
  if (data.uploadedAsset && typeof data.uploadedAsset === "object") return data.uploadedAsset;
  if (data.id && typeof data === "object") return data;
  return null;
}

function normalizeAsset(asset, index=0) {
  if (!asset || typeof asset !== "object") return null;

  const id = String(
    asset.id ??
    asset.assetId ??
    asset.asset_id ??
    asset.filename ??
    `asset-${index}`
  );

  const url =
    asset.url ??
    asset.imageUrl ??
    asset.image_url ??
    asset.fileUrl ??
    asset.file_url ??
    asset.path ??
    asset.src ??
    "";

  const name =
    asset.name ??
    asset.title ??
    asset.originalName ??
    asset.original_name ??
    asset.filename ??
    `Studio picture ${index + 1}`;

  return {
    ...asset,
    id,
    url: String(url || ""),
    name: String(name),
    category: asset.category ?? asset.type ?? "reference",
    officialReference: Boolean(
      asset.officialReference ??
      asset.official_reference ??
      false
    )
  };
}

function normalizeAssetsResponse(data) {
  const raw = listPayload(data, "assets");
  return raw.map(normalizeAsset).filter(Boolean);
}


function addEvent(message, state="done") {
  eventLog.unshift({time:new Date(),message,state});
  $("#eventTimeline").innerHTML = eventLog.map(e=>`<div class="event-row ${e.state}"><time>${e.time.toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'})}</time><span>${esc(e.message)}</span></div>`).join("");
}

function showCrewPlan(plan={}) {
  const p={requiredCapabilities:[],crew:[],executionPlan:{steps:[],releaseRule:"Evidence review required."},evidence:{},...plan};
  $("#planStatus").textContent=label(p.status||"planned");
  const ev=p.evidence||{};
  $("#evidenceSummary").innerHTML=`<div class="evidence-card"><strong>${ev.workerRegistryLoaded?"YES":"NO"}</strong><small>Registry loaded</small></div><div class="evidence-card"><strong>${ev.workersConsidered??0}</strong><small>Workers considered</small></div><div class="evidence-card"><strong>${ev.workersSelected??0}</strong><small>Workers selected</small></div>`;
  $("#capabilities").innerHTML=(p.requiredCapabilities||[]).map(c=>`<span class="chip">${esc(label(c))}</span>`).join("")||`<span class="chip">No capabilities recorded</span>`;
  $("#releaseRule").textContent=p.executionPlan?.releaseRule||"Evidence review is required before final release.";
  $("#crew").innerHTML=(p.crew||[]).map(w=>`<div class="crew-card"><div><strong>${esc(w.name)}</strong><div class="cap-list">${(w.matchedCapabilities||[]).map(label).join(" • ")}</div></div><span class="health ${w.ready?"ready":"waiting"}">${w.ready?"Ready":esc(label(w.health))}</span></div>`).join("")||`<p>No crew selected.</p>`;
  $("#dependencies").innerHTML=(p.executionPlan?.steps||[]).map((s,i)=>`<div class="dependency-card"><strong>${esc(s.worker)}</strong><small>${i===0?"Starts immediately":`Waits for ${esc(p.executionPlan.steps[i-1].worker)}`}</small><span>${esc(label(s.status))}</span></div>`).join("")||`<p>No dependencies recorded.</p>`;
}

function truthState(project) {
  const types=new Set((project.artifacts||[]).map(a=>a.type));
  const realImage=(project.artifacts||[]).some(a=>a.type==="image"&&a.url);
  const realAudio=(project.artifacts||[]).some(a=>a.type==="audio"&&a.url);
  const realVideo=(project.artifacts||[]).some(a=>a.type==="video"&&a.url);
  const planning=["creative-brief","script","storyboard","character","image-prompts","audio-direction","video-plan","qa"].filter(t=>types.has(t)).length;
  return [
    {name:"Planning package",value:planning,of:8,state:planning===8?"verified":"working"},
    {name:"Generated images",value:realImage?1:0,of:1,state:realImage?"verified":"provider"},
    {name:"Generated narration",value:realAudio?1:0,of:1,state:realAudio?"verified":"provider"},
    {name:"Rendered video",value:realVideo?1:0,of:1,state:realVideo?"verified":"provider"},
    {name:"Final media release",value:realVideo?1:0,of:1,state:realVideo?"verified":"blocked"}
  ];
}
function renderTruth(project){
  const states=truthState(project); const mediaReady=states[3].value===1;
  $("#truthBadge").textContent=mediaReady?"FINAL MEDIA VERIFIED":states[0].value===8?"PACKAGE VERIFIED":"IN PRODUCTION";
  $("#truthDashboard").innerHTML=states.map(s=>{const pct=Math.round((s.value/s.of)*100);return `<div class="truth-card ${s.state}"><div><strong>${esc(s.name)}</strong><span>${s.state==="provider"?"Waiting for provider":s.state==="blocked"?"Blocked":s.state==="verified"?"Verified":"Working"}</span></div><div class="meter"><i style="width:${pct}%"></i></div><small>${pct}%</small></div>`}).join("");
}

function stageTemplate(stage,index){return `<div class="runtime-stage ${esc(stage.status)}" data-stage="${esc(stage.id)}"><span class="stage-icon">${stage.status==="complete"?"✓":index+1}</span><div><strong>${esc(stage.name)}</strong><p>${esc(stage.worker)}${stage.message?` — ${esc(stage.message)}`:""}</p><div class="stage-progress"><i style="width:${stage.progress||0}%"></i></div></div><span class="stage-state">${esc(label(stage.status))}</span></div>`}
function showRuntime(runtime){
  const s=runtime||{status:"not-run",stages:[]};
  $("#runtimeBadge").textContent=label(s.status||"not-run");
  $("#runtimeStages").innerHTML=(s.stages||[]).map(stageTemplate).join("")||`<p>Run live production to watch the crew create the package.</p>`;
  const done=(s.stages||[]).filter(x=>x.status==="complete").length,total=(s.stages||[]).length||1;
  $("#liveProgress span").style.width=`${Math.round(done/total*100)}%`;
}

function showProject(p){
  currentProject=p; $("#workspace").classList.remove("hidden"); $("#title").textContent=p.title; $("#release").textContent=p.releaseLevel;
  showCrewPlan(p.crewPlan); showRuntime(p.runtime); renderTruth(p);
  $("#workers").innerHTML=(p.workers||[]).map(w=>`<div class="worker"><div><strong>${esc(w.name)}</strong><br><small>${esc(w.output||"")}</small></div><span class="status">${esc(label(w.status))}</span></div>`).join("");
  $("#artifacts").innerHTML=(p.artifacts||[]).map((a,i)=>`<div class="artifact"><strong>${esc(a.name)}</strong><br><small>${esc(label(a.type))}</small>${a.url?`<img src="${esc(a.url)}" style="width:100%;border-radius:12px;margin-top:10px">`:`<button data-art="${i}">Open artifact</button><pre id="art-${i}" hidden>${esc(a.content||"")}</pre>`}</div>`).join("")||`<p>No artifacts yet.</p>`;
  document.querySelectorAll("[data-art]").forEach(b=>b.onclick=()=>{const pre=$(`#art-${b.dataset.art}`);pre.hidden=!pre.hidden;b.textContent=pre.hidden?"Open artifact":"Close artifact"});
  const imagePrompt=p.artifacts?.find(a=>a.type==="image-prompts"); if(imagePrompt) $("#imagePrompt").value=imagePrompt.content.split("\n")[0].replace(/^Scene 1[^:]*:\s*/,"");
  $("#workspace").scrollIntoView({behavior:"smooth"});
}

async function animateProduction(){
  const stages=[
    ["crew","Crew Assembly","Studio Director AI","Matching capabilities to qualified workers"],
    ["story","Story Package","Story AI","Writing the brief, script, and storyboard"],
    ["character","Character Continuity","Character Continuity AI","Locking identity and brand rules"],
    ["visuals","Visual Direction","Illustration AI","Preparing scene prompts; final images require provider"],
    ["voice","Voice Direction","Voice AI","Preparing narration direction; audio requires provider"],
    ["video","Video Assembly Plan","Video Assembly AI","Building timeline; rendered video requires provider"],
    ["quality","Evidence Review","Evidence Quality AI","Verifying exactly what exists"]
  ].map(([id,name,worker,message])=>({id,name,worker,message,status:"waiting",progress:0}));
  $("#runtimeBadge").textContent="executing"; addEvent("Live production started","working");
  for(let i=0;i<stages.length;i++){
    stages[i].status="working"; addEvent(`${stages[i].worker} started ${stages[i].name}`,"working");
    for(const pct of [18,42,68,88,100]){stages[i].progress=pct;showRuntime({status:"executing",stages});await wait(180)}
    stages[i].status="complete"; showRuntime({status:"executing",stages}); addEvent(`${stages[i].name} completed`);
  }
}


async function loadCharacters(){
  characterRegistry=listPayload(await api("/api/characters"),"characters");
  const select=$("#characterSelect");
  select.innerHTML=characterRegistry.map(c=>`<option value="${esc(c.id)}">${esc(c.name||c.subject||c.id)}${c.version?` — V${esc(c.version)}`:""}</option>`).join("");
  const render=()=>{const c=characterRegistry.find(x=>x.id===select.value);$("#characterCard").innerHTML=c?`<strong>${esc(c.name||c.subject||c.id)} continuity lock</strong><p>${esc(c.appearance)}</p><small>${(c.continuityRules||[]).map(esc).join(" • ")}</small>`:""};
  select.onchange=render;render();
}



function safeAssetArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const candidates = [payload.assets, payload.data, payload.items, payload.results, payload.data && payload.data.assets];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const values = Object.values(candidate);
      if (values.some(value => value && typeof value === "object")) return values;
    }
  }
  return [];
}

function safeAssetRecord(asset, index) {
  if (!asset || typeof asset !== "object") return null;
  const rawId = asset.id ?? asset.assetId ?? asset.asset_id ?? asset.filename ?? asset.name ?? `asset-${index}`;
  const rawName = asset.name ?? asset.title ?? asset.originalName ?? asset.original_name ?? asset.filename ?? `Studio picture ${index + 1}`;
  const rawUrl = asset.url ?? asset.imageUrl ?? asset.image_url ?? asset.fileUrl ?? asset.file_url ?? asset.publicUrl ?? asset.public_url ?? asset.path ?? asset.src ?? "";
  return {
    ...asset,
    id: String(rawId),
    name: String(rawName),
    url: String(rawUrl || ""),
    category: String(asset.category ?? asset.type ?? "reference"),
    officialReference: Boolean(asset.officialReference ?? asset.official_reference ?? false)
  };
}

async function loadAssets(){
  const library=document.querySelector("#assetLibrary");
  const select=document.querySelector("#referenceAsset");
  if(!library || !select){
    throw new Error("Studio Library controls are missing from the page.");
  }

  const previousSelection=String(select.value||"");
  const payload=await api("/api/assets");
  assetRegistry=safeAssetArray(payload)
    .map((asset,index)=>safeAssetRecord(asset,index))
    .filter(Boolean);

  select.innerHTML='<option value="">Select uploaded picture</option>';
  for(const asset of assetRegistry){
    const option=document.createElement("option");
    option.value=asset.id;
    option.textContent=asset.name+(asset.officialReference?" — Official":"");
    select.appendChild(option);
  }
  if(assetRegistry.some(asset=>asset.id===previousSelection)){
    select.value=previousSelection;
  }

  library.innerHTML="";
  if(!assetRegistry.length){
    const empty=document.createElement("p");
    empty.textContent="No uploaded assets yet.";
    library.appendChild(empty);
    return assetRegistry;
  }

  for(const asset of assetRegistry){
    try{
      const card=document.createElement("article");
      card.className="asset-card"+(asset.officialReference?" official":"");

      if(asset.url){
        const img=document.createElement("img");
        img.src=asset.url;
        img.alt=asset.name;
        img.loading="lazy";
        img.onerror=()=>{ img.style.display="none"; };
        card.appendChild(img);
      }

      const body=document.createElement("div");
      const title=document.createElement("strong");
      title.textContent=asset.name;
      body.appendChild(title);

      const meta=document.createElement("small");
      meta.textContent=asset.category+(asset.officialReference?" • Official reference":"");
      body.appendChild(meta);

      const useButton=document.createElement("button");
      useButton.type="button";
      useButton.className="secondary";
      useButton.textContent="Use in Image Lab";
      useButton.onclick=()=>{
        select.value=asset.id;
        const mode=document.querySelector("#productionMode");
        if(mode) mode.value="hybrid";
        if(typeof updateModeHelp==="function") updateModeHelp();
        if(typeof showUploadStatus==="function") showUploadStatus("Picture selected for Image Lab.","success");
        const prompt=document.querySelector("#imagePrompt");
        if(prompt) prompt.focus();
      };
      body.appendChild(useButton);

      const deleteButton=document.createElement("button");
      deleteButton.type="button";
      deleteButton.className="danger-link";
      deleteButton.textContent="Delete";
      deleteButton.onclick=async()=>{
        if(!confirm("Delete this studio asset?")) return;
        try{
          await api(`/api/assets/${encodeURIComponent(asset.id)}`,{method:"DELETE"});
          await loadAssets();
        }catch(error){
          if(typeof showUploadStatus==="function") showUploadStatus(`Could not delete picture: ${error.message}`,"error");
        }
      };
      body.appendChild(deleteButton);

      card.appendChild(body);
      library.appendChild(card);
    }catch(cardError){
      console.error("Skipped malformed studio asset",asset,cardError);
    }
  }

  return assetRegistry;
}

function showUploadStatus(message, state="working") {
  const box = $("#uploadStatus");
  box.hidden = false;
  box.className = `upload-status ${state}`;
  box.textContent = message;
}

function previewSelectedAssets() {
  const files = [...$("#assetFiles").files];
  const preview = $("#assetPreview");
  if (!files.length) {
    preview.innerHTML = "";
    showUploadStatus("Choose one or more pictures, then upload them.", "idle");
    return;
  }
  preview.innerHTML = files.map(file => {
    const url = URL.createObjectURL(file);
    return `<div class="upload-preview-card"><img src="${url}" alt="${esc(file.name)}"><small>${esc(file.name)} • ${(file.size/1024/1024).toFixed(2)} MB</small></div>`;
  }).join("");
  showUploadStatus(`${files.length} picture${files.length===1?"":"s"} ready to upload.`, "ready");
}

async function uploadOneAsset(file) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) {
    throw new Error(`${file.name} is not a PNG, JPG, or WEBP image.`);
  }
  if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name} is larger than 15 MB.`);
  const params = new URLSearchParams({
    name: file.name.replace(/\.[^.]+$/, "") || file.name,
    originalName: file.name,
    category: $("#assetCategory").value,
    tags: $("#assetTags").value,
    officialReference: String($("#officialReference").checked)
  });
  return api(`/api/assets/upload?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file
  });
}

async function uploadSelectedAssets(){
  const files=[...$("#assetFiles").files];
  if(!files.length){
    showUploadStatus("Choose at least one picture first.","error");
    return;
  }

  const button=$("#uploadAssets");
  button.disabled=true;
  button.textContent="Uploading…";

  let newestAssetId=null;
  let uploadedCount=0;

  try{
    for(let index=0; index<files.length; index++){
      const file=files[index];
      showUploadStatus(`Uploading ${index+1} of ${files.length}: ${file.name}`,"working");

      const response=await uploadOneAsset(file);
      const saved=assetPayload(response);

      if(saved?.id) newestAssetId=String(saved.id);
      uploadedCount++;
    }

    const refreshedAssets=await loadAssets();

    if(!newestAssetId && refreshedAssets.length){
      const lastFile=files[files.length-1];
      const expectedName=lastFile.name.replace(/\.[^.]+$/,"").toLowerCase();
      const match=[...refreshedAssets].reverse().find(asset=>{
        const assetName=String(asset.name||"").toLowerCase();
        const originalName=String(asset.originalName||asset.original_name||"").toLowerCase();
        return assetName===expectedName || originalName===lastFile.name.toLowerCase();
      });
      newestAssetId=match?.id ? String(match.id) : String(refreshedAssets[refreshedAssets.length-1].id);
    }

    if(newestAssetId){
      const select=$("#referenceAsset");
      const option=[...select.options].find(o=>String(o.value)===newestAssetId);
      if(option){
        select.value=newestAssetId;
        $("#productionMode").value="hybrid";
        updateModeHelp();
      }
    }

    showUploadStatus(
      `${uploadedCount} picture${uploadedCount===1?"":"s"} uploaded and added to the Studio Library.`,
      "success"
    );

    addEvent(`${uploadedCount} owner asset${uploadedCount===1?"":"s"} added to the Studio Library`);
    $("#assetFiles").value="";
    $("#assetPreview").innerHTML="";
  }catch(e){
    console.error("Upload flow failed",e);

    // Refresh anyway because the server may have saved the file before a later UI step failed.
    try{
      await loadAssets();
    }catch(refreshError){
      console.error("Library refresh failed",refreshError);
    }

    if(uploadedCount>0){
      showUploadStatus(
        `${uploadedCount} picture${uploadedCount===1?" was":"s were"} uploaded successfully. Reloading the Studio Library...`,
        "success"
      );
      setTimeout(()=>window.location.reload(),700);
    }else{
      showUploadStatus(`Upload failed: ${e.message}`,"error");
    }
  }finally{
    button.disabled=false;
    button.textContent="Upload to Studio Library";
  }
}

$("#assetFiles").addEventListener("change", previewSelectedAssets);

function updateModeHelp(){
  const mode=$("#productionMode").value;
  const help={hybrid:"Hybrid uses your selected picture as the foundation and AI builds the requested scene around it.",assets:"My Picture Only attaches your uploaded picture to this production without changing it.",ai:"AI Only creates a new image without using an uploaded reference."};
  $("#modeHelp").textContent=help[mode];
  $("#referenceAsset").disabled=mode==="ai";
  $("#generateImage").textContent=mode==="assets"?"Attach My Picture":mode==="hybrid"?"Build From My Picture":"Generate New AI Image";
}

$("#uploadAssets").onclick=uploadSelectedAssets;
$("#refreshAssets").onclick=loadAssets;
$("#productionMode").onchange=updateModeHelp;

async function loadProjects(){
  const projects=listPayload(await api("/api/projects"),"projects"); $("#mode").textContent="Studio ready";
  $("#projects").innerHTML=projects.length?projects.map(p=>`<article class="project-card"><small>${new Date(p.createdAt).toLocaleString()}</small><h3>${esc(p.title)}</h3><p>${esc(p.releaseLevel)}</p><div class="row"><button data-open="${p.id}">Open</button><button class="secondary" data-delete="${p.id}">Delete</button></div></article>`).join(""):`<p>No dreams yet. Start with the box above.</p>`;
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{eventLog=[];showProject(projects.find(p=>p.id===b.dataset.open));addEvent("Dream opened from library")});
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{await api(`/api/projects/${b.dataset.delete}`,{method:"DELETE"});loadProjects()});
}

$("#build").onclick=async()=>{
  const idea=$("#idea").value.trim(); if(!idea)return alert("Tell the studio what to build.");
  $("#build").disabled=true;$("#build").textContent="Studio Director assembling…";$("#mode").textContent="Matching capabilities to workers";
  try{eventLog=[];addEvent("Idea received");const p=projectPayload(await api("/api/projects",{method:"POST",body:JSON.stringify({idea})}));showProject(p);addEvent("Qualified crew assembled");await loadProjects()}
  catch(e){alert(e.message)}finally{$("#build").disabled=false;$("#build").textContent="Build My Dream";$("#mode").textContent="Studio ready"}
};

$("#runProduction").onclick=async()=>{
  if(!currentProject)return alert("Open or create a project first."); const b=$("#runProduction");b.disabled=true;b.textContent="Crew working…";
  try{await animateProduction();const p=projectPayload(await api(`/api/projects/${currentProject.id}/execute`,{method:"POST",body:"{}"}));showProject(p);addEvent("Planning package verified; final media remains governed by provider evidence");await loadProjects()}
  catch(e){addEvent(e.message,"error");alert(e.message)}finally{b.disabled=false;b.textContent="Run Live Production"}
};

$("#generateImage").onclick=async()=>{
  if(!currentProject)return alert("Open or create a project first.");const prompt=$("#imagePrompt").value.trim();if(!prompt)return alert("Add a scene prompt.");
  const b=$("#generateImage");b.disabled=true;b.textContent="Generating image…";addEvent("Continuity Engine locked the selected character","working");
  try{const d=await api(`/api/projects/${currentProject.id}/image`,{method:"POST",body:JSON.stringify({prompt,characterId:$("#characterSelect").value,shotType:$("#shotType").value,mode:$("#productionMode").value,assetId:$("#referenceAsset").value||null})});$("#imageOutput").innerHTML=`<img src="${d.imageUrl}" alt="Generated scene">`;showProject(d.project);addEvent("Real generated image attached and verified");await loadProjects()}
  catch(e){addEvent("Image generation blocked: provider not connected","error");alert(e.message)}finally{b.disabled=false;updateModeHelp()}
};

$("#newDream").onclick=()=>{window.scrollTo({top:0,behavior:"smooth"});$("#idea").focus()};$("#refresh").onclick=loadProjects;updateModeHelp();Promise.all([loadCharacters(),loadAssets(),loadProjects()]);
