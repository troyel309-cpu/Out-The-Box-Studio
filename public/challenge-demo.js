(() => {
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  const presets = [
    {title:"Tiny Troy — The Test Drive", image:"Tiny Troy, a polished 3D miniature car salesman in a brown fedora and black polo, stands on the hood of a blue SUV in a bright modern showroom, confidently inviting a customer to take a test drive. Cinematic commercial lighting, expressive character animation, family friendly, no logos, no text.", video:"Tiny Troy stands on the hood of a blue SUV in a bright modern showroom. A customer hesitates. Tiny Troy smiles, points toward the driver seat and says, ‘Give me sixty seconds.’ The headlights flash, the customer laughs and opens the door. Smooth cinematic camera push, polished 3D animation, no text or logos."},
    {title:"Tiny Troy — Approval Magic", image:"Tiny Troy, a charismatic miniature salesman with warm brown skin, trimmed beard, brown fedora and black polo, stands beside a shiny red SUV as golden sparkles swirl around the vehicle in a premium dealership showroom. High-end 3D commercial render, family friendly.", video:"Tiny Troy snaps his fingers beside a shiny red SUV. Golden sparkles circle the vehicle, the headlights flash once, and he says, ‘Let’s make it happen.’ Energetic premium 3D animation, smooth camera motion, no on-screen text or logos."},
    {title:"Tiny Troy — The Keys", image:"Tiny Troy stands in the open palm of a smiling customer holding car keys beside a new SUV, warm cinematic showroom lighting, polished 3D mascot style, emotional and optimistic, no text, no logos.", video:"A worried customer holds old car keys beside a new SUV. Tiny Troy taps the keys and says, ‘You brought the keys. I’ll help with the rest.’ The customer smiles and the SUV headlights glow. Cinematic 3D animation, warm and uplifting, no text or logos."}
  ];

  function toast(message){
    let node = $("#challengeToast");
    if(!node){ node=document.createElement("div"); node.id="challengeToast"; node.className="challenge-toast"; document.body.appendChild(node); }
    node.textContent=message; node.classList.add("show"); setTimeout(()=>node.classList.remove("show"),2200);
  }

  function setPage(name){
    const nav = $(`[data-page="${name}"]`); if(nav) nav.click();
  }

  function fillImagePrompt(text){
    setPage("studio");
    setTimeout(()=>{ const input=$("#ideaInput"); if(input){input.value=text; input.focus(); input.scrollIntoView({behavior:"smooth",block:"center"}); toast("Image prompt loaded");}},120);
  }

  function fillVideoPrompt(text){
    setPage("video");
    setTimeout(()=>{ const input=$("#videoPrompt"); if(input){input.value=text; input.focus(); input.scrollIntoView({behavior:"smooth",block:"center"}); toast("Video prompt loaded");}},180);
  }

  async function refreshProof(){
    let images=0,videos=0,completed=0;
    try{ const r=await fetch('/api/projects'); if(r.ok){ const d=await r.json(); images=Array.isArray(d)?d.length:(d.projects||[]).length; }}catch{}
    try{ const r=await fetch('/api/video-studio'); if(r.ok){ const d=await r.json(); videos=(d.videos||[]).length; completed=(d.videos||[]).filter(v=>v.videoUrl).length; }}catch{}
    $("#metricImages").textContent=images;
    $("#metricVideos").textContent=videos;
    $("#metricCompleted").textContent=completed;
  }

  function build(){
    if($("#challengeDrawer")) return;
    const launch=document.createElement("button"); launch.className="challenge-launch"; launch.textContent="✦ Challenge Demo"; launch.setAttribute("aria-label","Open Challenge Demo Mode"); document.body.appendChild(launch);
    const drawer=document.createElement("div"); drawer.id="challengeDrawer"; drawer.className="challenge-drawer"; drawer.innerHTML=`
      <section class="challenge-panel" role="dialog" aria-modal="true" aria-labelledby="challengeTitle">
        <div class="challenge-head"><div><span class="challenge-badge">OpenAI Challenge Edition</span><h2 id="challengeTitle">One idea. A complete creative pipeline.</h2><p>Use the guided demo to show how Out the Box Studio turns a concept into an image, a reusable reference, and a finished video asset.</p></div><button class="challenge-close" aria-label="Close">×</button></div>
        <div class="challenge-grid">
          <article class="challenge-card"><h3>Judge-ready walkthrough</h3><p>Follow the shortest path through the product.</p><div class="challenge-flow"><div class="challenge-step active"><span>1</span><div><strong>Choose a demo story</strong><small>Load a production-ready Tiny Troy prompt.</small></div></div><div class="challenge-step"><span>2</span><div><strong>Create the image</strong><small>Generate the visual anchor for the scene.</small></div></div><div class="challenge-step"><span>3</span><div><strong>Animate it</strong><small>Move to Video Studio and create the MP4.</small></div></div><div class="challenge-step"><span>4</span><div><strong>Show the proof</strong><small>Open the saved asset from the local library.</small></div></div></div><div class="challenge-actions"><button id="startChallengeImage" class="challenge-primary">Start with image</button><button id="openChallengeVideo" class="challenge-secondary">Open Video Studio</button><button id="openChallengeLibrary" class="challenge-secondary">Open Dream Library</button></div><div class="challenge-proof"><div class="challenge-metric"><span>Image projects</span><strong id="metricImages">—</strong></div><div class="challenge-metric"><span>Video jobs</span><strong id="metricVideos">—</strong></div><div class="challenge-metric"><span>Saved MP4s</span><strong id="metricCompleted">—</strong></div><div class="challenge-metric"><span>Provider</span><strong>OpenAI</strong></div></div></article>
          <article class="challenge-card"><h3>Tiny Troy demo pack</h3><p>Pick a polished scenario, then load either the image or video prompt.</p><div class="demo-presets">${presets.map((p,i)=>`<div class="demo-preset"><strong>${p.title}</strong><small>Ready for image and video generation.</small><div class="challenge-actions" style="margin-top:10px"><button class="challenge-secondary" data-image-preset="${i}">Load image</button><button class="challenge-secondary" data-video-preset="${i}">Load video</button></div></div>`).join('')}</div></article>
        </div>
      </section>`;
    document.body.appendChild(drawer);
    const open=()=>{drawer.classList.add("open"); refreshProof();};
    const close=()=>drawer.classList.remove("open");
    launch.addEventListener("click",open); $(".challenge-close",drawer).addEventListener("click",close); drawer.addEventListener("click",e=>{if(e.target===drawer)close();});
    document.addEventListener("keydown",e=>{if(e.key==='Escape')close();});
    $("#startChallengeImage").addEventListener("click",()=>{close();fillImagePrompt(presets[0].image);});
    $("#openChallengeVideo").addEventListener("click",()=>{close();setPage("video");});
    $("#openChallengeLibrary").addEventListener("click",()=>{close();setPage("library");});
    $$('[data-image-preset]',drawer).forEach(b=>b.addEventListener('click',()=>{close();fillImagePrompt(presets[Number(b.dataset.imagePreset)].image);}));
    $$('[data-video-preset]',drawer).forEach(b=>b.addEventListener('click',()=>{close();fillVideoPrompt(presets[Number(b.dataset.videoPreset)].video);}));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build,{once:true}); else build();
})();
