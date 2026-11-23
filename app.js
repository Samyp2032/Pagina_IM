const $=s=>document.querySelector(s),A=$("#app");
const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const REVK=Object.keys(D.reviews).map(t=>"Review "+t),LK=Object.keys(D.lessons).concat(REVK);
const EXP={es:"Amplía tu respuesta con detalles.",en:"Please expand your answer with details."};
const SHORT={es:"Tu respuesta fue muy corta. Intenta ampliarla.",en:"Your answer was too short. Try to expand it."};
const PRE={es:"Parte dos: Review and Check.",en:"Part two: Review and Check."};
const SIL=2.5,MAX=120,MINX=15;
const SRC=window.SpeechRecognition||window.webkitSpeechRecognition;
const VERB_MODES={
 past:{title:"Pasado simple",form:1,instruction:"Di el verbo en pasado simple."},
 participle:{title:"Participio pasado",form:2,instruction:"Di solo el participio pasado."}
};
const S={micTrack:null,micError:"",legacyMicUsed:false,verbMode:null,speed:1,qlang:"es",alang:"en",showEach:true,items:[],i:0,log:[],st:null,abort:null,run:false};
const fmt=s=>String(s/60|0).padStart(2,"0")+":"+String(s%60|0).padStart(2,"0");
const mk=(n,l,es,en,kind="q",ord=0)=>({n,l,es,en,kind,ord});
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
function allQ(lo=1,hi=199){const o=[];for(const[k,d]of Object.entries(D.lessons))for(const[n,es,en]of d.qs)if(n>=lo&&n<=hi)o.push(mk("#"+n,k,es,en,"q",n));return o}
function revI(t,kind="q"){const[b,qs]=D.reviews[t];return qs.map(([es,en],i)=>mk(`R&C ${t}-${i+1}`,"Review "+t,es,en,kind,b+i))}
function build(mode,chosen,rnd){
 const verbMode=VERB_MODES[mode];
 if(verbMode){
  const items=VERBOS.map((verb,i)=>({
   n:"#"+(i+1),kind:"verb",base:verb[0],answer:verb[verbMode.form]
  }));
  return rnd?shuf(items):items;
 }
 if(mode=="mix")return shuf(allQ()).slice(0,15);
 if(mode=="exam"){const p1=shuf(allQ(81,115)).slice(0,5),p2=shuf(revI("5&6","expand")).slice(0,2);p2[0].pre=PRE;return p1.concat(p2)}
 if(mode=="ask")return shuf(Object.keys(D.lessons)).slice(0,5).map((k,i)=>{const d=D.lessons[k];return mk("ASK-"+(i+1),k,`Hazme una pregunta sobre ${d.te}.`,`Ask me a question about ${d.tn}.`,"ask",i)});
 let it=[];
 if(mode=="free")it=allQ();else for(const k of chosen){it=it.concat(k.startsWith("Review ")?revI(k.slice(7)):allQ().filter(x=>x.l==k))}
 return rnd?shuf(it):it}
function dyn(o){const d=new Date(),w=(d.getDay()+6)%7;
 if(o==3)return `Today is ${DAYS[w]}.`;
 if(o==4)return w==0?"Yes, it is. Today is Monday.":`No, it isn’t. Today is ${DAYS[w]}.`;
 if(o==107){const n=d.getDate(),s=(n%100>=11&&n%100<=13)?"th":({1:"st",2:"nd",3:"rd"}[n%10]||"th");return `Today is ${DAYS[w]}, ${MONTHS[d.getMonth()]} ${n}${s}.`}
 return null}
function model(it){if(it.kind==="verb")return it.answer;if(it.kind=="ask"){const q=D.lessons[it.l].qs;return "Example question: "+q[Math.random()*q.length|0][2]}return dyn(it.ord)||D.answers[it.ord]||""}

/* ---------- pantallas ---------- */
const waveform = '<span class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
function modeOptions(modes,checkFirst=false){
 return modes.map(([value,title,detail],i)=>`
  <label class="mode"><input type="radio" name="mode" value="${value}" ${checkFirst&&i===0?"checked":""}>
   <span><strong>${title}</strong><small>${detail}</small></span>
  </label>`).join("");
}
const pronunciationForms=["Forma base","Pasado simple","Participio pasado"];
function pronunciationPanel(){
 return `<section class="box pronunciation" aria-labelledby="pronunciation-title">
  <h1 id="pronunciation-title">Pronunciación de verbos</h1>
  <p class="muted">Escucha una forma y repítela en voz alta.</p>
  <label class="field">Verbo
   <select id="pronunciation-verb" lang="en">${VERBOS.map(([base],i)=>`<option value="${i}">${esc(base)}</option>`).join("")}</select>
  </label>
  <div class="pronunciation-forms" aria-live="polite"></div>
  <div class="pronunciation-controls">
   <label class="pronunciation-speed"><input type="checkbox" id="pronunciation-slow">Escuchar más lento</label>
   <button type="button" id="pronunciation-next">Siguiente</button>
  </div>
  <p class="muted pronunciation-status" role="status"></p>
  <audio id="pronunciation-audio" preload="none"></audio>
 </section>`;
}
function stopPronunciation(){
 $("#pronunciation-audio")?.pause();
}
function setupPronunciation(){
 const select=$("#pronunciation-verb"),forms=$(".pronunciation-forms"),audio=$("#pronunciation-audio");
 const status=$(".pronunciation-status"),slow=$("#pronunciation-slow");
 const next=$("#pronunciation-next");
 let playback=0;
 function showForms(){
  const last=select.selectedIndex===select.options.length-1;
  next.disabled=last;
  next.textContent=last?"Fin de la lista":"Siguiente";
  next.classList.toggle("alt",last);
  playback++;
  audio.pause();
  status.textContent="";
  forms.innerHTML=VERBOS[select.value].map((word,i)=>`
   <div class="pronunciation-form">
    <span class="muted">${pronunciationForms[i]}</span>
    <strong lang="en">${esc(word)}</strong>
    <button type="button" class="alt sm" data-form="${i}" aria-label="Escuchar ${pronunciationForms[i].toLowerCase()}">Escuchar</button>
   </div>`).join("");
 }
 select.addEventListener("change",showForms);
 next.addEventListener("click",()=>{
  select.selectedIndex++;
  showForms();
 });
 function updateSpeed(){audio.playbackRate=slow.checked ? 0.75 : 1}
 slow.addEventListener("change",updateSpeed);
 audio.addEventListener("ended",()=>{status.textContent=""});
 forms.addEventListener("click",async event=>{
  const button=event.target.closest("button[data-form]");
  if(!button)return;
  const request=++playback,form=Number(button.dataset.form),word=VERBOS[select.value][form];
  audio.src=`audio_verbos/${form?"formas/":""}${encodeURIComponent(word)}.wav`;
  updateSpeed();
  status.textContent=`Reproduciendo: ${word}`;
  try{await audio.play()}
  catch(error){
   if(request===playback)status.textContent="No se pudo reproducir el audio.";
  }
 });
 showForms();
}
function showPronunciation(record=true){
 if($("#pronunciation-verb"))return;
 leavePractice();
 if(record)setScreenHistory("#pronunciacion");
 $("#open-pronunciation").setAttribute("aria-current","page");
 A.innerHTML=pronunciationPanel();
 setupPronunciation();
 focusScreen();
}
function home(){
 stopPronunciation();
 $("#open-pronunciation").removeAttribute("aria-current");
 releaseMicrophone();
 S.run=false;try{speechSynthesis.cancel()}catch(e){}if(P.stop)P.stop();
 const modes=[
  ["free","Práctica libre","Recorre las preguntas del banco principal."],
  ["lesson","Por lección","Elige los temas que quieres practicar."],
  ["mix","Mix","Responde 15 preguntas al azar, sin Review & Check."],
  ["exam","Simulacro Examen Oral #3","Practica con las lecciones 5 y 6."],
  ["ask","Yo hago las preguntas","Formula tus propias preguntas sobre 5 temas."]
 ];
 A.innerHTML=`
  <section class="hero">
   <div class="hero-copy">
    <h1>Simulador de <br>examen oral</h1>
    <p>Escucha cada pregunta, responde en voz alta y compara tu respuesta con un ejemplo.</p>
    <div class="row">
     <a class="button" href="#practice">Configurar práctica</a>
     <button class="alt" type="button" onclick="answers()">Ver respuestas</button>
    </div>
   </div>
   <div class="hero-art" aria-hidden="true"><div class="voice-disc">${waveform}</div></div>
  </section>
  <form id="practice" onsubmit="event.preventDefault();start()">
   ${SRC?"":'<p class="notice">Tu navegador no tiene reconocimiento de voz. Puedes responder en voz alta y tocar “Ver respuesta”.</p>'}
   <div class="setup">
    <section class="box">
     <h2>Modo de práctica</h2>
     <div class="modes">${modeOptions(modes,true)}</div>
     <div class="lesson-settings">
      <h3>Práctica de verbos</h3>
      <div class="modes">${modeOptions(Object.entries(VERB_MODES).map(([mode,config])=>[
       mode,config.title,`${VERBOS.length} verbos. ${config.instruction}`
      ]))}</div>
     </div>
     <div class="lesson-settings" id="lessons" hidden>
      <h3>Lecciones y repasos</h3>
      <div class="chips">${LK.map((k,i)=>`<label><input type="checkbox" class="lc" value="${esc(k)}" ${i?"":"checked"}>${esc(k)}</label>`).join("")}</div>
      <div class="row">
       <button type="button" class="alt sm" onclick="document.querySelectorAll('.lc').forEach(x=>x.checked=true)">Todas</button>
       <button type="button" class="alt sm" onclick="document.querySelectorAll('.lc').forEach(x=>x.checked=false)">Ninguna</button>
      </div>
     </div>
    </section>
    <section class="box">
     <h2>Ajustes de sesión</h2>
     <div class="language-grid" id="language-settings">
      <label class="field">Pregunta en<select id="ql"><option value="es">Español</option><option value="en">Inglés</option></select></label>
      <label class="field">Mi respuesta en<select id="al"><option value="en">Inglés</option><option value="es">Español</option></select></label>
     </div>
     <p class="muted" id="verb-language" hidden>Escucha y responde en inglés.</p>
     <label class="field speed" for="spd"><span>Velocidad de la voz <output id="speed-value" for="spd">1×</output></span></label>
     <input type="range" id="spd" min="0.6" max="1.4" step="0.05" value="1">
     <div class="options">
      <label id="random-setting"><input type="checkbox" id="rnd" checked>Orden aleatorio</label>
      <label><input type="checkbox" id="shw" checked>Mostrar el repaso después de cada pregunta</label>
     </div>
     <p class="notice" id="msg" role="alert" hidden></p>
     <button class="primary-action" type="submit">Empezar práctica</button>
    </section>
   </div>
  </form>`;
 $("#spd").addEventListener("input",e=>{$("#speed-value").textContent=e.target.value+"×"});
 for(const radio of document.querySelectorAll("input[name=mode]")){
  radio.addEventListener("change",e=>{
   const mode=e.target.value;
   $("#lessons").hidden=mode!=="lesson";
   const verbMode=Boolean(VERB_MODES[mode]);
   $("#language-settings").hidden=verbMode;
   $("#verb-language").hidden=!verbMode;
   $("#random-setting").hidden=!verbMode&&mode!=="lesson"&&mode!=="free";
   $("#msg").hidden=true;
  });
 }
}
async function start(){
 const mode=document.querySelector("input[name=mode]:checked").value,chosen=[...document.querySelectorAll(".lc:checked")].map(x=>x.value);
 if(mode=="lesson"&&!chosen.length){
  const message=$("#msg");
  message.textContent="Marca al menos una lección.";
  message.hidden=false;
  return;
 }
 stopPronunciation();
 S.verbMode=VERB_MODES[mode]||null;
 S.qlang=S.verbMode?"en":$("#ql").value;
 S.alang=S.verbMode?"en":$("#al").value;
 S.speed=+$("#spd").value;S.showEach=$("#shw").checked;
 S.items=build(mode,chosen,$("#rnd").checked);S.i=0;S.log=[];S.st={ans:0,skip:0,rep:0,secs:[]};S.run=true;
 try{navigator.wakeLock&&navigator.wakeLock.request("screen").catch(()=>{})}catch(e){}
 try{speechSynthesis.getVoices()}catch(e){}
 setScreenHistory("#sesion");
 session();
 await beginPractice(S.verbMode?null:loadManifest());
}
function focusScreen(){
 A.focus({preventScroll:true});
 window.scrollTo(0,0);
}
function session(){
 A.innerHTML=`<section class="box session">
  <div class="cnt" id="cnt"></div>
  ${S.verbMode?`<p class="muted">${S.verbMode.instruction}</p>`:""}
  <div id="orb" aria-hidden="true">${waveform}</div>
  <h1 class="state" role="status" id="st">Preparando la práctica</h1>
  <div class="timer" id="timer">00:00</div>
  <p class="notice warn" id="warn" role="alert"></p>
  <div class="review" id="rv" hidden></div>
  <div class="row session-nav">
   <button class="alt" onclick="ab('prev')">Anterior</button>
   <button class="alt" onclick="ab('repeat')">Repetir</button>
   <button id="session-next" class="alt" data-action="next" onclick="ab(this.dataset.action)">Saltar</button>
  </div>
  <button class="quiet session-end" onclick="ab('end')">Terminar sesión</button>
 </section>`;
 focusScreen();
}
const ab=c=>{if(S.abort)S.abort(c)};
function sessionAction(label,action){
 const next=$("#session-next");
 if(!next)return;
 next.textContent=label;
 next.dataset.action=action;
 next.classList.toggle("alt",action==="next");
}
const LBL={speaking:"Escucha la pregunta",listening:"Responde en voz alta",hearing:"Escuchando tu respuesta",preparing:"Preparando la escucha",review:"Repaso",waiting:"En espera"};
function setState(n){
 const o=$("#orb"),s=$("#st");if(!o)return;
 o.className="o-"+n;
 s.textContent=S.verbMode&&n==="speaking"?"Escucha el verbo":LBL[n];
 if(n==="speaking")sessionAction("Saltar","next");
 if(n==="review")sessionAction(S.i+1===S.items.length?"Ver resumen":"Siguiente","finish");
}
const warn=t=>{const w=$("#warn");if(w)w.textContent=t};
function reviewPrompt(it){
 if(it.kind==="verb")return `<p class="go">${esc(it.n)} · Forma base: <span lang="en">${esc(it.base)}</span></p>`;
 return `<p class="go">${esc(it.n)} ${esc(it.es)}</p><p class="en">${esc(it.en)}</p>`;
}
function showRv(e){const r=$("#rv");if(!r)return;$("#orb").hidden=true;$("#timer").hidden=true;
 r.innerHTML=`
  ${reviewPrompt(e.it)}
  <dl class="comparison"><div><dt>Tu respuesta</dt><dd>${esc(e.ans)}</dd></div>
   <div><dt>Respuesta modelo</dt><dd>${esc(e.model)}</dd></div></dl>
  <p class="muted">${S.verbMode?"Tiempo para responder":"Duración"}: ${e.secs.toFixed(1)} s</p>`;r.hidden=false}
function hideRv(){const r=$("#rv");if(r)r.hidden=true;const o=$("#orb"),t=$("#timer");if(o){o.hidden=false;t.hidden=false}}
function leavePractice(){
 if(!S.run)return;
 S.run=false;
 S.abort?.("home");
 S.abort=null;
 releaseMicrophone();
}
function backHome(){
 leavePractice();
 setScreenHistory("");
 home();
 focusScreen();
}
function answers(record=true){
 leavePractice();
 stopPronunciation();
 if(record)setScreenHistory("#respuestas");
 $("#open-pronunciation").removeAttribute("aria-current");
 const g=Object.keys(D.lessons).map(k=>[k.startsWith("Practical")?k:"Lesson "+k,allQ().filter(x=>x.l==k)]).concat(Object.keys(D.reviews).map(t=>["Review & Check "+t,revI(t)]));
 A.innerHTML=`<section class="page-heading"><h1>Banco de respuestas</h1>
  <p>Usa estas respuestas como ejemplo y adáptalas a tu vida.</p></section>
  <div class="catalog">${g.map(([t,its])=>`<section class="box"><h2>${esc(t)}</h2>`+its.map(it=>`
   <div class="item"><p class="go">${esc(it.n)} ${esc(it.en)}</p><p class="en">${esc(it.es)}</p>
    <p class="example">${esc(model(it))}</p></div>`).join("")+"</section>").join("")}</div>`;
 focusScreen();
}
const reports=new Map();
function summary(){
 releaseMicrophone();
 S.run=false;
 const report={stats:S.st,entries:S.log,verbMode:S.verbMode};
 const id=reports.size+1;
 reports.set(id,report);
 setScreenHistory("#resumen",true,{report:id});
 renderSummary(report);
}
function renderSummary({stats:s,entries,verbMode}){
 stopPronunciation();
 $("#open-pronunciation").removeAttribute("aria-current");
 const av=s.secs.length?(s.secs.reduce((a,b)=>a+b,0)/s.secs.length).toFixed(1)+" s":"—";
 const stats=[["Respondidas",s.ans],[verbMode?"Tiempo promedio":"Duración promedio",av],["Repetidas",s.rep],["Saltadas",s.skip]];
 A.innerHTML=`<section class="page-heading"><h1>Resumen de la sesión</h1></section>
  <dl class="stats">${stats.map(([label,value])=>`<div class="box"><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
  <section class="box"><h2>${verbMode?verbMode.title:"Repaso de preguntas"}</h2>
   ${entries.length?entries.map(e=>`<div class="item">${reviewPrompt(e.it)}<dl class="comparison"><div><dt>Tu respuesta</dt><dd>${esc(e.ans)}</dd></div>
     <div><dt>Respuesta modelo</dt><dd>${esc(e.model)}</dd></div></dl></div>`).join(""):"<p>No hubo respuestas en esta sesión.</p>"}
  </section>`;
 focusScreen();
}

/* ---------- historial ---------- */
function setScreenHistory(hash,replace=false,state=null){
 const url=new URL(location.href);
 url.hash=hash;
 if(!replace&&url.href===location.href)return;
 if(replace)history.replaceState(state,"",url);
 else history.pushState(state,"",url);
}
function restoreScreen(){
 if(location.hash==="#pronunciacion")return showPronunciation(false);
 if(location.hash==="#respuestas")return answers(false);
 if(location.hash==="#resumen"){
  const report=reports.get(history.state?.report);
  if(report){
   leavePractice();
   return renderSummary(report);
  }
 }
 // Adelante o recargar no debe iniciar el micrófono automáticamente.
 if(location.hash==="#sesion"||location.hash==="#resumen")setScreenHistory("#practice",true);
 if(!$("#practice")){
  leavePractice();
  home();
 }
 if(location.hash==="#practice")$("#practice").scrollIntoView();
}
window.addEventListener("popstate",restoreScreen);

/* ---------- voz ---------- */
/* Las voces vienen pregrabadas en audio/ (las crea generar_audios.py). Si falta un audio, usa la voz del navegador. */
let MAN=null;const P={stop:null};
async function loadManifest(){
 if(MAN!==null)return MAN;
 try{const r=await fetch("audio/manifest.json");MAN=r.ok?await r.json():false}catch(e){MAN=false}
 return MAN}
const FEM=/dalia|paulina|sabina|helena|laura|m[oó]nica|elena|lupe|salome|camila|elvira|mar[ií]a|ximena|catalina|zira|female|mujer/i;
const MAS=/jorge|ra[uú]l|pablo|diego|carlos|[aá]lvaro|alonso|juan|andr[eé]s|enrique|miguel|ricardo|jaime|david|male|hombre/i;
const gender=v=>FEM.test(v.name)?"f":MAS.test(v.name)?"m":"?";
function pickSys(lang,g){
 let vs=[];try{vs=speechSynthesis.getVoices()}catch(e){}
 const pool=vs.filter(v=>v.lang.slice(0,2)==lang);if(!pool.length)return null;
 const code=lang=="es"?"es-MX":"en-US",L=v=>v.lang.replace("_","-");
 const score=v=>{let n=0;if(/natural|online|neural/i.test(v.name))n+=100;
  if(L(v)==code)n+=40;else if(lang=="es"&&/^es-(US|419)/.test(L(v)))n+=30;else n+=5;
  const gg=gender(v);if(gg==g)n+=60;else if(gg!="?")n-=200;return n};
 return pool.slice().sort((a,b)=>score(b)-score(a))[0]}
function sysSpeak(text,lang){return new Promise(res=>{
 if(!window.speechSynthesis)return res();
 const u=new SpeechSynthesisUtterance(text);u.lang=lang=="es"?"es-MX":"en-US";u.rate=S.speed;
 const v=pickSys(lang,lang=="es"?"m":"f");if(v){u.voice=v;u.lang=v.lang}
 let done=false;const fin=r=>{if(done)return;done=true;clearTimeout(tm);S.abort=null;res(r)};
 const tm=setTimeout(()=>fin(),text.length*110/S.speed+4000);
 u.onend=()=>fin();u.onerror=()=>fin();
 S.abort=c=>{speechSynthesis.cancel();fin(c)};
 speechSynthesis.cancel();speechSynthesis.speak(u)})}
function playFile(url){return new Promise((res,rej)=>{
 const a=new Audio(url);a.playbackRate=S.speed;let done=false;
 const fin=(r,err)=>{if(done)return;done=true;P.stop=null;S.abort=null;a.onended=a.onerror=null;err?rej(err):res(r)};
 a.onended=()=>fin();a.onerror=()=>fin(undefined,new Error("audio"));
 P.stop=()=>{try{a.pause()}catch(e){}fin()};
 S.abort=c=>{try{a.pause()}catch(e){}fin(c)};
 a.play().catch(e=>fin(undefined,e))})}
async function speak(text,lang,file){
 const f=file||(MAN&&MAN[lang+"|"+text]);
 if(f){try{return await playFile(f)}catch(e){console.error("audio:",e)}}
 return sysSpeak(text,lang)}
const micErrors={
 "not-allowed":"El navegador no recibió permiso para usar el micrófono.",
 "service-not-allowed":"El navegador bloqueó el reconocimiento de voz.",
 "network":"No se pudo conectar con el reconocimiento de voz.",
 "audio-capture":"No se encontró un micrófono disponible.",
 "language-not-supported":"El navegador no puede reconocer el idioma seleccionado."
};

function releaseMicrophone(){
 S.micTrack?.stop();
 S.micTrack=null;
}
window.addEventListener("pagehide",releaseMicrophone);

function supportsRecognitionTrack(){
 // La presencia de SpeechRecognition no indica si acepta una pista de audio.
 const version=Number(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
 return version>=135&&!/Android|Mobile/.test(navigator.userAgent);
}

async function beginPractice(ready){
 let cancelled=false;
 S.abort=action=>{
  if(action!=="end"&&action!=="home")return;
  cancelled=true;
  S.abort=null;
  if(action==="end")summary();
 };
 S.micError="";
 S.legacyMicUsed=false;
 if(SRC&&navigator.mediaDevices?.getUserMedia&&supportsRecognitionTrack()){
  $("#st").textContent="Preparando el micrófono";
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(cancelled){
    stream.getTracks().forEach(track=>track.stop());
    return;
   }
   S.micTrack=stream.getAudioTracks()[0];
   S.micTrack.enabled=false;
  }catch(error){
   if(cancelled)return;
   S.micError=error.name==="NotAllowedError"?micErrors["not-allowed"]:micErrors["audio-capture"];
  }
 }
 await ready;
 if(cancelled)return;
 S.abort=null;
 await run();
}

function listen(ns=20,singleWord=false){return new Promise(res=>{
 const t0=Date.now(),track=S.micTrack;
 let base="",cur="",vs=0,last=0,readyAt=0,over=false,rec=null,tm=0,manual=!SRC,retrying=false;
 setState("preparing");
 const txt=()=>(base+cur).trim();
 const stopRecognition=()=>{
  if(!rec)return;
  rec.onaudiostart=rec.onresult=rec.onnomatch=rec.onend=rec.onerror=null;
  try{rec.abort()}catch(e){}
  if(track)track.enabled=false;
 };
 const end=result=>{
  if(over)return;
  over=true;
  clearInterval(tm);
  S.abort=null;
  stopRecognition();
  res(result);
 };
 const done=()=>{
  if(singleWord)return end({text:txt(),secs:vs?(last-(readyAt||t0))/1000:0,manual});
  end({text:txt(),secs:vs?(last-vs)/1000:0,manual});
 };
 function waitForManualFinish(message){
  manual=true;
  stopRecognition();
  if(!readyAt)readyAt=Date.now();
  setState("listening");
  sessionAction("Ver respuesta","finish");
  warn(message+" Responde en voz alta y pulsa «Ver respuesta» para ver la solución.");
 }
 S.abort=action=>action==="finish"?done():end({cmd:action});
 tm=setInterval(()=>{
  const now=Date.now(),timer=$("#timer");
  if(timer&&readyAt)timer.textContent=fmt((now-readyAt)/1000);
  if(now-t0>MAX*1000)return done();
  if(manual)return;
  if(!readyAt){
   if(now-t0>ns*1000)waitForManualFinish("El reconocimiento de voz no se inició.");
   return;
  }
  if(vs&&now-last>SIL*1000)done();
  else if(!vs&&now-readyAt>ns*1000)done();
 },200);

 if(S.micError)return waitForManualFinish(S.micError);
 if(!SRC)return waitForManualFinish("Este navegador no tiene reconocimiento de voz.");

 rec=new SRC();
 rec.lang=S.alang==="es"?"es-MX":"en-US";
 rec.continuous=!singleWord;
 rec.interimResults=true;
 rec.onaudiostart=()=>{
  if(!readyAt)readyAt=Date.now();
  setState("listening");
  if(retrying)warn("No se entendió la palabra. Dila otra vez.");
 };
 rec.onnomatch=()=>{if(singleWord)retrying=true};
 rec.onresult=event=>{
  cur=Array.from(event.results,result=>result[0].transcript).join(" ");
  if(!cur.trim())return;
  if(retrying){
   retrying=false;
   warn("");
  }
  if(!vs){vs=Date.now();setState("hearing")}
  last=Date.now();
  if(singleWord&&event.results[event.results.length-1].isFinal)done();
 };
 rec.onerror=event=>{
  if(singleWord&&event.error==="no-speech")retrying=true;
  const message=micErrors[event.error];
  if(!message)return;
  S.micError=message;
  waitForManualFinish(message);
 };

 async function startRecognition(){
  try{
   if(track){
    if(track.readyState!=="live"){
     S.micError="Se desconectó el micrófono.";
     return waitForManualFinish(S.micError);
    }
    track.enabled=true;
    rec.start(track);
    return;
   }
   // En navegadores antiguos, evita reiniciar el micrófono si eso pediría otro permiso.
   if(S.legacyMicUsed){
    let permission;
    try{permission=await navigator.permissions?.query({name:"microphone"})}catch(e){}
    if(over||manual)return;
    if(permission?.state!=="granted"){
     S.micError="Este navegador no conservó el permiso del micrófono.";
     return waitForManualFinish(S.micError);
    }
   }
   S.legacyMicUsed=true;
   rec.start();
  }catch(e){
   S.micError="No se pudo iniciar el reconocimiento de voz.";
   waitForManualFinish(S.micError);
  }
 }
 rec.onend=()=>{
  if(over||manual)return;
  // Si el navegador solo devolvió una transcripción provisional, úsala para el verbo.
  if(singleWord&&txt())return done();
  if(retrying)setState("preparing");
  base+=cur+" ";
  cur="";
  startRecognition();
 };
 startRecognition();
})}

/* ---------- sesión ---------- */
function waitAfterPrompt(){
 return new Promise(resolve=>{
  const finish=action=>{
   clearTimeout(timer);
   S.abort=null;
   resolve(action);
  };
  const timer=setTimeout(finish,300);
  S.abort=finish;
 });
}
function isCurrentPractice(items){
 return S.run&&S.items===items;
}
async function run(){
 const items=S.items;
 while(isCurrentPractice(items)&&S.i<items.length){
  $("#cnt").textContent=`${S.verbMode?"Verbo":"Pregunta"} ${S.i+1} de ${S.items.length}`;
  const it=items[S.i],r=await runItem(it,items);
  if(!isCurrentPractice(items))return;
  if(r==="end")break;
  if(r=="repeat"){S.st.rep++;continue}
  if(r=="prev"){S.i=Math.max(0,S.i-1);continue}
  if(r=="next"){S.st.skip++;S.log.push({it,ans:"[saltada]",secs:0,model:model(it)});S.i++;continue}
  S.i++}
 try{speechSynthesis.cancel()}catch(e){}
 summary()}
async function runItem(it,items){
 const tm=$("#timer");if(tm)tm.textContent="00:00";
 const isVerb=it.kind==="verb";
 warn("");
 const parts=[];if(it.pre)parts.push(it.pre[S.qlang]);parts.push(isVerb?it.base:it[S.qlang]);if(it.kind=="expand")parts.push(EXP[S.qlang]);
 const file=isVerb?`audio_verbos/${it.base}.wav`:undefined;
 setState("speaking");let c;
 for(const t of parts){
  c=await speak(t,S.qlang,file);
  if(!isCurrentPractice(items))return;
  if(c)return c;
 }
 c=await waitAfterPrompt();
 if(!isCurrentPractice(items))return;
 if(c)return c;
 const r=await listen(20,isVerb);
 if(!isCurrentPractice(items))return;
 if(r.cmd)return r.cmd;
 let text=r.text,secs=r.secs,manual=r.manual;
 if(it.kind=="expand"&&secs<MINX&&!r.manual){
  setState("speaking");c=await speak(SHORT[S.qlang],S.qlang);
  if(!isCurrentPractice(items))return;
  if(c)return c;
  c=await waitAfterPrompt();
  if(!isCurrentPractice(items))return;
  if(c)return c;
  const r2=await listen();
  if(!isCurrentPractice(items))return;
  if(r2.cmd)return r2.cmd;
  text=(text+" "+r2.text).trim();secs+=r2.secs;
  manual=r2.manual;
 }
 const counted=isVerb?Boolean(text):secs>0;if(counted){S.st.ans++;S.st.secs.push(secs)}
 S.log.push({it,ans:text||(isVerb?"Sin transcripción":"[sin respuesta]"),secs,model:model(it)});
 if(S.showEach||manual){
  warn("");
  setState("review");showRv(S.log[S.log.length-1]);
  const c2=await new Promise(res=>{S.abort=k=>{S.abort=null;res(k=="finish"||k=="next"?"advance":k)}});
  if(!isCurrentPractice(items))return;
  hideRv();
  if(c2=="repeat"){S.log.pop();if(counted){S.st.ans--;S.st.secs.pop()}}
  if(c2!="advance")return c2}
 return "advance"}
/* ---------- tema ---------- */
const themeToggle=$("#theme-toggle");
const themeKey="simulador-oral:theme";
function setTheme(dark){
 document.documentElement.dataset.theme=dark?"dark":"light";
 themeToggle.setAttribute("aria-pressed",String(dark));
 $('meta[name="theme-color"]').content=dark?"#101f34":"#edf5ff";
}
try{setTheme(localStorage.getItem(themeKey)==="dark")}catch(e){}
themeToggle.addEventListener("click",()=>{
 const dark=themeToggle.getAttribute("aria-pressed")!=="true";
 setTheme(dark);
 try{localStorage.setItem(themeKey,dark?"dark":"light")}catch(e){}
});
restoreScreen();
