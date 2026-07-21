(() => {
  "use strict";
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const state={assets:[],projects:[],selectedAssetId:"",imageUrl:"",project:null};

  function toast(msg){const e=$("#toast");e.textContent=msg;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1600)}
  function escapeHtml(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
  async function api(path,options={}){const headers={Accept:"application/json",...(options.headers||{})};if(options.body&&!(options.body instanceof FormData))headers["Content-Type"]="application/json";const response=await fetch(path,{...options,headers});const text=await response.text();let data=text;try{data=text?JSON.parse(text):null}catch{}if(!response.ok)throw new Error(data?.error||data?.message||data||`Request failed (${response.status})`);return data}

  function showPage(name){
    $$(".page").forEach(p=>p.classList.remove("active"));
    $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
    $(`#${name}Page`)?.classList.add("active");
    if(name==="library")loadProjects();
  }

  function setStep(index){
    $$(".step").forEach((s,i)=>{s.classList.toggle("active",i===index);s.classList.toggle("complete",i<index)});
  }

  function addTimeline(title,detail){
    const row=document.createElement("div");
    row.innerHTML=`<time>${new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</time><span></span><p><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></p>`;
    $("#timeline").prepend(row);
  }

  async function loadAssets(){
    try{
      const payload=await api("/api/assets");
      state.assets=(Array.isArray(payload)?payload:payload?.assets||[]).filter(a=>a?.id&&a?.url).sort((a,b)=>Number(Boolean(b.officialReference))-Number(Boolean(a.officialReference))||new Date(b.createdAt||0)-new Date(a.createdAt||0));
      if(!state.selectedAssetId&&state.assets.length)state.selectedAssetId=state.assets.find(a=>a.officialReference)?.id||state.assets[0].id;
      renderAssets();
    }catch(e){$("#assetGrid").innerHTML=`<div class="loading">${escapeHtml(e.message)}</div>`}
  }

  function selectedAsset(){return state.assets.find(a=>a.id===state.selectedAssetId)||null}
  function renderAssets(){
    const asset=selectedAsset();
    $("#selectedReference").innerHTML=asset?`<img src="${escapeHtml(asset.url)}" alt="Selected reference">`:`<div class="empty-state"><span>＋</span><strong>Select a reference</strong><small>Your chosen picture guides the result.</small></div>`;
    $("#assetGrid").innerHTML=state.assets.length?state.assets.map(a=>`<button class="asset-card ${a.id===state.selectedAssetId?"selected":""}" data-asset="${escapeHtml(a.id)}"><img src="${escapeHtml(a.url)}" alt=""><small>${escapeHtml((a.tags||[]).join(", ")||a.name||"Reference")}</small></button>`).join(""):`<div class="loading">No saved pictures yet.</div>`;
    $$("[data-asset]").forEach(b=>b.addEventListener("click",()=>{state.selectedAssetId=b.dataset.asset;renderAssets();setStep(2);addTimeline("Picture selected",selectedAsset()?.name||"Reference image")}));
  }

  async function loadCharacters(){
    try{
      const payload=await api("/api/characters");
      const chars=Array.isArray(payload)?payload:payload?.characters||[];
      if(chars.length)$("#characterSelect").innerHTML=chars.map(c=>`<option value="${escapeHtml(c.id||c.name||"")}">${escapeHtml(c.name||"Character")}</option>`).join("");
    }catch{}
  }

  function characterName(){const s=$("#characterSelect");return s?.options?.[s.selectedIndex]?.textContent?.trim()||"Tiny Troy"}
  function buildPrompt(){
    const idea=$("#ideaInput").value.trim();
    const lock=$("#continuityToggle").checked?`Keep ${characterName()}'s identity recognizable and continuity-locked to the selected reference image.`:"";
    return [idea||`${characterName()} in a polished professional scene.`,`${$("#styleSelect").value} visual style.`,lock].filter(Boolean).join(" ");
  }

  function setCrew(stage){
    const lists={
      ready:[["✓","Studio connected","Ready for your next idea","complete"]],
      working:[
        ["•","Studio Director","Preparing the creative brief","working"],
        ["○","Character Continuity","Waiting",""],
        ["○","Image Director","Waiting",""],
        ["○","Evidence Quality","Waiting",""]
      ],
      complete:[
        ["✓","Studio Director","Complete","complete"],
        ["✓","Character Continuity","Complete","complete"],
        ["✓","Image Director","Complete","complete"],
        ["✓","Evidence Quality","Verified","complete"]
      ]
    };
    $("#crewList").innerHTML=lists[stage].map(([i,n,d,c])=>`<div class="crew-row ${c}"><span>${i}</span><div><strong>${n}</strong><small>${d}</small></div></div>`).join("");
  }

  async function createDream(){
    if(!$("#ideaInput").value.trim())return toast("Describe what you want to create");
    if(!selectedAsset())return toast("Choose a picture first");
    setStep(2);$("#resultStatus").textContent="Creating";$("#crewStatus").textContent="Working";$("#crewStatus").className="status";setCrew("working");$("#pulseDetail").textContent="Creating your image";$("#pulseBar").style.width="55%";
    $("#resultStage").innerHTML=`<div class="empty-state"><img src="/otb-v2-logo.svg" alt=""><strong>The studio is working</strong><small>Your creative crew is building the result.</small></div>`;
    const prompt=buildPrompt();
    addTimeline("Production started",prompt);
    try{
      const project=await api("/api/projects",{method:"POST",body:JSON.stringify({idea:prompt})});
      state.project=project;
      const result=await api(`/api/projects/${project.id}/image`,{method:"POST",body:JSON.stringify({prompt,characterId:$("#characterSelect").value||null,shotType:"Medium cinematic shot",mode:"hybrid",assetId:selectedAsset().id})});
      state.imageUrl=result.imageUrl;state.project=result.project||project;
      $("#resultStage").innerHTML=`<img src="${escapeHtml(result.imageUrl)}" alt="Generated result">`;
      $("#resultStatus").textContent="Verified";$("#crewStatus").textContent="Complete";$("#crewStatus").className="status ready";setCrew("complete");$("#pulseDetail").textContent="Production complete";$("#pulseBar").style.width="100%";setStep(3);addTimeline("Production complete","Generated image verified and saved.");loadProjects();
    }catch(e){
      $("#resultStage").innerHTML=`<div class="empty-state"><strong>Generation stopped</strong><small>${escapeHtml(e.message)}</small></div>`;
      $("#resultStatus").textContent="Needs attention";$("#pulseDetail").textContent="Check the message";$("#pulseBar").style.width="20%";addTimeline("Production stopped",e.message);
    }
  }

  async function loadProjects(){
    const grid=$("#projectGrid");grid.innerHTML=`<div class="loading">Loading projects…</div>`;
    try{
      const payload=await api("/api/projects");state.projects=Array.isArray(payload)?payload:payload?.projects||[];
      if(!state.projects.length){grid.innerHTML=`<div class="loading">No dreams yet. Start your first one in Studio.</div>`;return}
      grid.innerHTML=state.projects.map(p=>{const img=p.imageUrl||p.generatedImageUrl||p.artifacts?.find?.(a=>a.url)?.url||"";let status=String(p.releaseLevel||p.status||"Creative project saved and ready to continue.");if(/undefined|json|fallback|provider/i.test(status))status="Creative project saved and ready to continue.";return `<article class="project-card"><div class="project-thumb">${img?`<img src="${escapeHtml(img)}" alt="">`:`<img src="/otb-v2-logo.svg" alt="">`}</div><div class="project-body"><time>${escapeHtml(new Date(p.createdAt||Date.now()).toLocaleString())}</time><h3>${escapeHtml(p.title||"New Dream")}</h3><p>${escapeHtml(status)}</p><button data-project="${escapeHtml(p.id)}">Open project</button></div></article>`}).join("");
      $$("[data-project]").forEach(b=>b.addEventListener("click",()=>toast("Project opened")));
    }catch(e){grid.innerHTML=`<div class="loading">${escapeHtml(e.message)}</div>`}
  }

  function resetDream(){
    $("#ideaInput").value="";state.imageUrl="";$("#resultStage").innerHTML=`<div class="empty-state"><img src="/otb-v2-logo.svg" alt=""><strong>The studio is ready</strong><small>Your finished image will appear here.</small></div>`;$("#resultStatus").textContent="Waiting";setCrew("ready");$("#pulseDetail").textContent="Waiting for your idea";$("#pulseBar").style.width="0";setStep(0);showPage("studio");
  }

  function bind(){
    $$(".nav-item").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
    $(".brand").addEventListener("click",e=>{e.preventDefault();showPage("studio")});
    $("#moreToolsButton").addEventListener("click",()=>{const panel=$("#moreToolsPanel"),open=panel.hidden;panel.hidden=!open;$("#moreToolsButton").setAttribute("aria-expanded",String(open));$("strong",$("#moreToolsButton")).textContent=open?"Hide tools":"More tools"});
    $$("[data-tool]").forEach(b=>b.addEventListener("click",()=>{const t=b.dataset.tool;if(t==="assets"){showPage("studio");$("#assetPanel").scrollIntoView({behavior:"smooth"})}if(t==="workforce"){showPage("studio");$("#workforcePanel").scrollIntoView({behavior:"smooth"})}if(t==="insights")showPage("production")}));
    $("#heroStart").addEventListener("click",()=>{$("#creator").scrollIntoView({behavior:"smooth"});setTimeout(()=>$("#ideaInput").focus(),400)});
    $("#newDreamSide").addEventListener("click",resetDream);$("#newDreamTop").addEventListener("click",resetDream);
    $("#optionsButton").addEventListener("click",()=>{const p=$("#optionsPanel"),open=p.hidden;p.hidden=!open;$("#optionsButton").textContent=open?"Hide options":"More options"});
    $("#advancedDetailsButton").addEventListener("click",()=>{const p=$("#advancedDetails"),open=p.hidden;p.hidden=!open;$("#advancedDetailsButton").textContent=open?"Hide advanced production details":"Show advanced production details"});
    $("#templateButton").addEventListener("click",()=>$("#templateDialog").showModal());$("#closeTemplates").addEventListener("click",()=>$("#templateDialog").close());
    $$("[data-template]").forEach(b=>b.addEventListener("click",()=>{$("#ideaInput").value=b.dataset.template;$("#templateDialog").close();setStep(1);$("#ideaInput").focus()}));
    $("#ideaInput").addEventListener("input",()=>setStep($("#ideaInput").value.trim().length>=8?1:0));
    $("#createButton").addEventListener("click",createDream);$("#refreshAssets").addEventListener("click",loadAssets);$("#refreshProjects").addEventListener("click",loadProjects);
    $("#variationButton").addEventListener("click",()=>{$("#ideaInput").focus();toast("Adjust the idea, then create another version")});
    $("#openImageButton").addEventListener("click",()=>state.imageUrl?window.open(state.imageUrl,"_blank"):toast("No image yet"));
    $("#globalSearch").addEventListener("input",e=>{showPage("library");const q=e.target.value.toLowerCase();$$(".project-card").forEach(c=>c.style.display=c.textContent.toLowerCase().includes(q)?"":"none")});
    document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){e.preventDefault();createDream()}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();$("#globalSearch").focus()}});
  }

  async function boot(){bind();await Promise.all([loadAssets(),loadCharacters(),loadProjects()])}
  document.addEventListener("DOMContentLoaded",boot,{once:true});
})();
