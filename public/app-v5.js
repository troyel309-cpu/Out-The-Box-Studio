(() => {
  "use strict";

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const state={assets:[],projects:[],videos:[],uploads:[],selectedAssetId:"",currentProject:null,imageUrl:"",activity:[]};

  const workers=[
    ["✦","Studio Director","Turns the idea into a production brief"],
    ["◈","Continuity Specialist","Protects character and brand identity"],
    ["🎨","Visual Director","Creates the visual result"],
    ["✓","Evidence Quality","Checks and verifies completion"]
  ];

  function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
  function toast(msg){const e=$("#toast");e.textContent=msg;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)}
  async function api(path,options={}){const headers={Accept:"application/json",...(options.headers||{})};if(options.body&&!(options.body instanceof Blob)&&!(options.body instanceof File))headers["Content-Type"]="application/json";const r=await fetch(path,{...options,headers});const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text}}if(!r.ok)throw new Error(data.error||`Request failed (${r.status})`);return data}
  function collection(data,key){return Array.isArray(data)?data:Array.isArray(data?.[key])?data[key]:[]}

  function showView(name){
    $$(".view").forEach(v=>v.classList.toggle("active",v.id===`${name}View`));
    $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.view===name));
    const titles={home:"Command Center",create:"Create",media:"Media Vault",projects:"Dream Library",production:"Living Workforce"};
    $("#viewTitle").textContent=titles[name]||"Studio";
    if(name==="projects")loadProjects();
    if(name==="media")loadMedia();
  }

  function addActivity(title,detail){
    state.activity.unshift({title,detail,time:new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})});
    state.activity=state.activity.slice(0,8);
    renderActivity();
  }

  function renderActivity(){
    const feed=$("#activityFeed");
    if(!feed)return;
    feed.innerHTML=(state.activity.length?state.activity:[{title:"Studio ready",detail:"Waiting for your next production.",time:"Now"}]).map(a=>`
      <div class="activity-row"><time>${esc(a.time)}</time><i></i><div><strong>${esc(a.title)}</strong><small>${esc(a.detail)}</small></div></div>
    `).join("");
  }

  function renderMetrics(){
    $("#metricProjects").textContent=state.projects.length;
    $("#metricAssets").textContent=state.assets.length;
    $("#metricVideos").textContent=state.videos.length;
    $("#metricVerified").textContent=state.projects.filter(p=>/verified|complete|approved/i.test(String(p.status||p.releaseLevel||""))||p.imageUrl).length;
  }

  async function loadAll(){
    const [p,a,v,u]=await Promise.allSettled([
      api("/api/projects"),api("/api/assets"),api("/api/video-studio"),api("/api/video-studio/uploads")
    ]);
    state.projects=p.status==="fulfilled"?collection(p.value,"projects"):[];
    state.assets=a.status==="fulfilled"?collection(a.value,"assets"):[];
    state.videos=v.status==="fulfilled"?collection(v.value,"videos"):[];
    state.uploads=u.status==="fulfilled"?collection(u.value,"uploads"):[];
    renderMetrics();renderAssets();renderProjects();renderMedia();
  }

  function selectedAsset(){return state.assets.find(a=>a.id===state.selectedAssetId)||null}

  function renderAssets(){
    if(!state.selectedAssetId&&state.assets.length)state.selectedAssetId=state.assets[0].id;
    const asset=selectedAsset();
    $("#selectedReference").innerHTML=asset?`<img src="${esc(asset.url)}" alt="">`:`<div class="empty">No picture selected</div>`;
    $("#assetGrid").innerHTML=state.assets.slice(0,12).map(a=>`<button class="asset-card ${a.id===state.selectedAssetId?"selected":""}" data-asset="${esc(a.id)}"><img src="${esc(a.url)}" alt=""></button>`).join("");
    $$("[data-asset]").forEach(b=>b.addEventListener("click",()=>{state.selectedAssetId=b.dataset.asset;renderAssets();addActivity("Reference selected",selectedAsset()?.name||"Picture selected")}));
  }

  function renderProjects(){
    const grid=$("#projectGrid");if(!grid)return;
    grid.innerHTML=state.projects.length?state.projects.map(p=>{const img=p.imageUrl||p.generatedImageUrl||p.artifacts?.find?.(a=>a.url)?.url||"/otb-v2-logo.svg";return `
      <article class="project-item"><img src="${esc(img)}" alt=""><div><strong>${esc(p.title||"Creative production")}</strong><small>${esc(new Date(p.createdAt||Date.now()).toLocaleString())}</small></div></article>
    `}).join(""):`<div class="card">No productions yet.</div>`;
  }

  function renderMedia(){
    const grid=$("#mediaGrid");if(!grid)return;
    const images=state.assets.map(a=>({...a,kind:"image",filename:a.originalName||a.name}));
    const all=[...state.uploads,...images].slice(0,30);
    grid.innerHTML=all.length?all.map(item=>`
      <article class="media-item">
        ${item.kind==="video"?`<video src="${esc(item.url)}" controls preload="metadata"></video>`:`<img src="${esc(item.url)}" alt="">`}
        <div><strong>${esc(item.filename||item.name||"Media")}</strong><small>${esc(item.kind||"image")}</small></div>
      </article>`).join(""):`<div class="card">No media uploaded yet.</div>`;
  }

  function renderWorkers(stage="ready",active=0){
    $("#workerLine").innerHTML=workers.map((w,i)=>{
      let cls="worker",status="Ready";
      if(stage==="working"){if(i<active){cls+=" complete";status="Complete"}else if(i===active){cls+=" active";status="Working"}else status="Queued"}
      if(stage==="complete"){cls+=" complete";status="Verified"}
      return `<article class="${cls}"><span>${w[0]}</span><strong>${w[1]}</strong><small>${w[2]}</small><b>${status}</b></article>`;
    }).join("");
  }

  function addTimeline(title,detail){
    const e=document.createElement("div");e.className="timeline-row";
    e.innerHTML=`<time>${new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</time><i></i><div><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>`;
    $("#jobTimeline").prepend(e);
  }

  async function createProduction(){
    const idea=$("#ideaInput").value.trim();
    if(!idea)return toast("Describe what you want to create.");
    if(!selectedAsset())return toast("Choose or upload a reference picture.");

    showView("production");
    $("#currentJobTitle").textContent=idea.slice(0,70);
    $("#crewStatus").textContent="Working";
    $("#railStatus").textContent="Production in progress";
    renderWorkers("working",0);
    addActivity("Production started",idea);
    addTimeline("Job received","Studio Director accepted the production.");

    workers.forEach((w,i)=>setTimeout(()=>{renderWorkers("working",i);addTimeline(w[1],w[2]);},700*(i+1)));

    try{
      const prompt=[idea,`${$("#styleSelect").value} visual style.`].join(" ");
      const project=await api("/api/projects",{method:"POST",body:JSON.stringify({idea:prompt})});
      state.currentProject=project;
      const result=await api(`/api/projects/${project.id}/image`,{method:"POST",body:JSON.stringify({prompt,characterId:"tiny-troy",shotType:"Medium cinematic shot",mode:"hybrid",assetId:selectedAsset().id})});
      state.imageUrl=result.imageUrl;
      state.currentProject=result.project||project;
      $("#resultStage").innerHTML=`<img src="${esc(result.imageUrl)}" alt="Generated result">`;
      $("#resultStatus").textContent="Verified";
      $("#crewStatus").textContent="Complete";
      $("#railStatus").textContent="Production complete";
      renderWorkers("complete");
      addTimeline("Production verified","Final image saved to the project registry.");
      addActivity("Production complete","A verified creation was saved.");
      await loadAll();
      showView("create");
    }catch(e){
      $("#crewStatus").textContent="Needs attention";
      $("#railStatus").textContent="Production stopped";
      addTimeline("Production stopped",e.message);
      toast(e.message);
    }
  }

  function setUploadStatus(text,p=0){$("#uploadStatus").textContent=text;$("#uploadProgress").style.width=`${p}%`}

  async function uploadImage(file){
    if(file.size>15*1024*1024)throw new Error("Picture must be 15 MB or smaller.");
    const q=new URLSearchParams({name:file.name.replace(/\.[^.]+$/,""),originalName:file.name,category:"reference"});
    const data=await api(`/api/assets/upload?${q}`,{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream","X-File-Name":encodeURIComponent(file.name)},body:file});
    state.assets.unshift(data);state.selectedAssetId=data.id;
  }

  async function uploadVideo(file){
    if(file.size>150*1024*1024)throw new Error("Video must be 150 MB or smaller.");
    const data=await api(`/api/video-studio/upload?filename=${encodeURIComponent(file.name)}`,{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream","X-File-Name":encodeURIComponent(file.name)},body:file});
    state.uploads.unshift(data);
  }

  async function handleFiles(files,kind){
    for(const file of [...files]){
      try{
        setUploadStatus(`Uploading ${file.name}…`,30);
        kind==="image"?await uploadImage(file):await uploadVideo(file);
        setUploadStatus(`${file.name} uploaded successfully.`,100);
        addActivity("Media uploaded",file.name);
        renderMedia();renderAssets();renderMetrics();
      }catch(e){setUploadStatus(e.message,0);toast(e.message);break}
    }
  }

  function bindUpload(zoneId,inputId,kind){
    const zone=document.getElementById(zoneId),input=document.getElementById(inputId);
    input.addEventListener("change",()=>handleFiles(input.files,kind));
    zone.addEventListener("dragover",e=>e.preventDefault());
    zone.addEventListener("drop",e=>{e.preventDefault();handleFiles(e.dataTransfer.files,kind)});
  }

  function bind(){
    $$("[data-view]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();showView(b.dataset.view)}));
    $("#refreshAll").addEventListener("click",async()=>{await loadAll();toast("Studio refreshed")});
    $("#useTemplate").addEventListener("click",()=>{$("#ideaInput").value="Create a cinematic Tiny Troy commercial where he welcomes a customer, shows the vehicle, and hands them the keys.";toast("Example loaded")});
    $("#createButton").addEventListener("click",createProduction);
    bindUpload("imageDropZone","imageUploadInput","image");
    bindUpload("videoDropZone","videoUploadInput","video");
  }

  document.addEventListener("DOMContentLoaded",async()=>{
    bind();renderWorkers();renderActivity();await loadAll();addActivity("Studio connected","Projects, assets, video, and workforce are online.");
  },{once:true});
})();
