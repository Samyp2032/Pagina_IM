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
const S={speed:1,qlang:"es",alang:"en",showEach:true,items:[],i:0,log:[],st:null,abort:null,run:false};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fmt=s=>String(s/60|0).padStart(2,"0")+":"+String(s%60|0).padStart(2,"0");
const mk=(n,l,es,en,kind="q",ord=0)=>({n,l,es,en,kind,ord});
const shuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
function allQ(lo=1,hi=199){const o=[];for(const[k,d]of Object.entries(D.lessons))for(const[n,es,en]of d.qs)if(n>=lo&&n<=hi)o.push(mk("#"+n,k,es,en,"q",n));return o}
function revI(t,kind="q"){const[b,qs]=D.reviews[t];return qs.map(([es,en],i)=>mk(`R&C ${t}-${i+1}`,"Review "+t,es,en,kind,b+i))}
function build(mode,chosen,rnd){
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
function model(it){if(it.kind=="ask"){const q=D.lessons[it.l].qs;return "Example question: "+q[Math.random()*q.length|0][2]}return dyn(it.ord)||D.answers[it.ord]||""}

/* ---------- pantallas ---------- */
const waveform = '<span class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
function home(){
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
    <h1>Simulador de<br>examen oral</h1>
    <p>Escucha cada pregunta, responde en voz alta y compara tu respuesta con un ejemplo.</p>
    <div class="row">
     <a class="button" href="#practice">Configurar práctica</a>
     <button class="alt" type="button" onclick="answers()">Ver respuestas</button>
    </div>
   </div>
   <div class="hero-art" aria-hidden="true"><div class="voice-disc">${waveform}</div></div>
  </section>
  ${SRC?"":'<p class="notice">Tu navegador no tiene reconocimiento de voz. Puedes responder en voz alta y tocar “Terminar respuesta”.</p>'}
  <form id="practice" onsubmit="event.preventDefault();start()">
   <div class="setup">
    <section class="box">
     <h2>Modo de práctica</h2>
     <div class="modes">${modes.map(([value,title,detail],i)=>`
      <label class="mode"><input type="radio" name="mode" value="${value}" ${i?"":"checked"}>
       <span><strong>${title}</strong><small>${detail}</small></span>
      </label>`).join("")}</div>
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
     <div class="language-grid">
      <label class="field">Pregunta en<select id="ql"><option value="es">Español</option><option value="en">Inglés</option></select></label>
      <label class="field">Mi respuesta en<select id="al"><option value="en">Inglés</option><option value="es">Español</option></select></label>
     </div>
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
   $("#random-setting").hidden=mode!=="lesson"&&mode!=="free";
   $("#msg").hidden=true;
  });
 }
}
function start(){
 const mode=document.querySelector("input[name=mode]:checked").value,chosen=[...document.querySelectorAll(".lc:checked")].map(x=>x.value);
 if(mode=="lesson"&&!chosen.length){
  const message=$("#msg");
  message.textContent="Marca al menos una lección.";
  message.hidden=false;
  return;
 }
 S.qlang=$("#ql").value;S.alang=$("#al").value;S.speed=+$("#spd").value;S.showEach=$("#shw").checked;
 S.items=build(mode,chosen,$("#rnd").checked);S.i=0;S.log=[];S.st={ans:0,skip:0,rep:0,secs:[]};S.run=true;
 try{navigator.wakeLock&&navigator.wakeLock.request("screen").catch(()=>{})}catch(e){}
 try{speechSynthesis.getVoices()}catch(e){}
 session();loadManifest().then(()=>{if(S.run)run()})
}
function focusScreen(){
 A.focus({preventScroll:true});
 window.scrollTo(0,0);
}
function session(){
 A.innerHTML=`<section class="box session">
  <div class="cnt" id="cnt"></div>
  <div id="orb" aria-hidden="true">${waveform}</div>
  <h1 class="state" role="status" id="st">Preparando la práctica</h1>
  <div class="timer" id="timer">00:00</div>
  <p class="notice warn" id="warn" role="alert"></p>
  <div class="review" id="rv" hidden></div>
  <div class="row session-nav">
   <button class="alt" onclick="ab('prev')">Anterior</button>
   <button class="alt" onclick="ab('repeat')">Repetir</button>
   <button class="alt" onclick="ab('next')">Siguiente</button>
  </div>
  <button class="primary-action" onclick="ab('finish')">Terminar respuesta / continuar</button>
  <button class="quiet session-end" onclick="ab('end')">Terminar sesión</button>
 </section>`;
 focusScreen();
}
const ab=c=>{if(S.abort)S.abort(c)};
const LBL={speaking:"Escucha la pregunta",listening:"Responde en voz alta",hearing:"Escuchando tu respuesta",processing:"Procesando",review:"Repaso",waiting:"En espera"};
function setState(n){const o=$("#orb"),s=$("#st");if(!o)return;o.className="o-"+n;s.textContent=LBL[n]}
const warn=t=>{const w=$("#warn");if(w)w.textContent=t};
function showRv(e){const r=$("#rv");if(!r)return;$("#orb").hidden=true;$("#timer").hidden=true;
 r.innerHTML=`
  <p class="go">${esc(e.it.n)} ${esc(e.it.es)}</p><p class="en">${esc(e.it.en)}</p>
  <dl class="comparison"><div><dt>Tu respuesta</dt><dd>${esc(e.ans)}</dd></div>
   <div><dt>Respuesta modelo</dt><dd>${esc(e.model)}</dd></div></dl>
  <p class="muted">Duración: ${e.secs.toFixed(1)} s</p>`;r.hidden=false}
function hideRv(){const r=$("#rv");if(r)r.hidden=true;const o=$("#orb"),t=$("#timer");if(o){o.hidden=false;t.hidden=false}}
function backHome(){
 home();
 focusScreen();
}
function answers(){
 const g=Object.keys(D.lessons).map(k=>[k.startsWith("Practical")?k:"Lesson "+k,allQ().filter(x=>x.l==k)]).concat(Object.keys(D.reviews).map(t=>["Review & Check "+t,revI(t)]));
 A.innerHTML=`<section class="page-heading"><h1>Banco de respuestas</h1>
  <p>Usa estas respuestas como ejemplo y adáptalas a tu vida.</p>
  <button class="alt" onclick="backHome()">Volver al inicio</button></section>
  <div class="catalog">${g.map(([t,its])=>`<section class="box"><h2>${esc(t)}</h2>`+its.map(it=>`
   <div class="item"><p class="go">${esc(it.n)} ${esc(it.en)}</p><p class="en">${esc(it.es)}</p>
    <p class="example">${esc(model(it))}</p></div>`).join("")+"</section>").join("")}</div>`;
 focusScreen();
}
function summary(){
 S.run=false;const s=S.st,av=s.secs.length?(s.secs.reduce((a,b)=>a+b,0)/s.secs.length).toFixed(1)+" s":"—";
 const stats=[["Respondidas",s.ans],["Duración promedio",av],["Repetidas",s.rep],["Saltadas",s.skip]];
 A.innerHTML=`<section class="page-heading"><h1>Resumen de la sesión</h1>
  <button class="alt" onclick="backHome()">Volver al inicio</button></section>
  <dl class="stats">${stats.map(([label,value])=>`<div class="box"><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
  <section class="box"><h2>Repaso de preguntas</h2>
   ${S.log.length?S.log.map(e=>`<div class="item"><p class="go">${esc(e.it.n)} ${esc(e.it.es)}</p>
    <p class="en">${esc(e.it.en)}</p><dl class="comparison"><div><dt>Tu respuesta</dt><dd>${esc(e.ans)}</dd></div>
     <div><dt>Respuesta modelo</dt><dd>${esc(e.model)}</dd></div></dl></div>`).join(""):"<p>No hubo respuestas en esta sesión.</p>"}
  </section>`;
 focusScreen();
}

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
async function speak(text,lang){
 const f=MAN&&MAN[lang+"|"+text];
 if(f){try{return await playFile(f)}catch(e){console.error("audio:",e)}}
 return sysSpeak(text,lang)}
function listen(ns=20){return new Promise(res=>{
 const t0=Date.now();let base="",cur="",vs=0,last=0,over=false,rec=null,tm=0;
 const txt=()=>(base+cur).trim();
 const end=r=>{if(over)return;over=true;clearInterval(tm);S.abort=null;try{if(rec){rec.onend=null;rec.stop()}}catch(e){}res(r)};
 const done=()=>SRC?end({text:txt(),spoke:!!vs,secs:vs?(last-vs)/1000:0}):end({text:"[contestaste en voz alta]",spoke:true,secs:(Date.now()-t0)/1000});
 S.abort=c=>c=="finish"?done():end({cmd:c});
 tm=setInterval(()=>{const n=Date.now(),t=$("#timer");if(t)t.textContent=fmt((n-t0)/1000);
  if(n-t0>MAX*1000)return done();if(!SRC)return;
  if(vs&&n-last>SIL*1000)done();else if(!vs&&n-t0>ns*1000)done()},200);
 if(SRC){rec=new SRC();rec.lang=S.alang=="es"?"es-MX":"en-US";rec.continuous=true;rec.interimResults=true;
  rec.onresult=e=>{let t="";for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript+" ";cur=t;if(!vs){vs=Date.now();setState("hearing")}last=Date.now()};
  rec.onerror=e=>{const M={"not-allowed":"Permiso de micrófono denegado. Actívalo con el candado junto a la dirección.","service-not-allowed":"Tu navegador bloqueó el reconocimiento de voz. Usa Chrome o Edge.","network":"No se pudo conectar con el reconocimiento de voz. Usa Chrome o Edge (Brave y Firefox no lo soportan bien).","audio-capture":"No encuentro ningún micrófono."};if(M[e.error])end({err:M[e.error]})};
  rec.onend=()=>{if(!over){base+=cur+" ";cur="";try{rec.start()}catch(x){}}};
  try{rec.start()}catch(x){}}})}

/* ---------- sesión ---------- */
async function run(){
 while(S.run&&S.i<S.items.length){
  $("#cnt").textContent=`Pregunta ${S.i+1} de ${S.items.length}`;
  const it=S.items[S.i],r=await runItem(it);
  if(r=="end")break;
  if(r=="repeat"){S.st.rep++;continue}
  if(r=="prev"){S.i=Math.max(0,S.i-1);continue}
  if(r=="next"){S.st.skip++;S.log.push({it,ans:"[saltada]",secs:0,model:model(it)});S.i++;continue}
  S.i++}
 try{speechSynthesis.cancel()}catch(e){}
 summary()}
async function runItem(it){
 const tm=$("#timer");if(tm)tm.textContent="00:00";
 const parts=[];if(it.pre)parts.push(it.pre[S.qlang]);parts.push(it[S.qlang]);if(it.kind=="expand")parts.push(EXP[S.qlang]);
 setState("speaking");let c;for(const t of parts){c=await speak(t,S.qlang);if(c&&c!="finish")return c}
 await sleep(300);setState("listening");
 let r=await listen();if(r.cmd)return r.cmd;if(r.err){warn(r.err);await sleep(2500);return "end"}
 let text=r.text,secs=r.secs;
 if(it.kind=="expand"&&secs<MINX){
  setState("speaking");c=await speak(SHORT[S.qlang],S.qlang);if(c&&c!="finish")return c;
  await sleep(300);setState("listening");const r2=await listen();if(r2.cmd)return r2.cmd;if(r2.err){warn(r2.err);await sleep(2500);return "end"}
  text=(text+" "+r2.text).trim();secs+=r2.secs}
 const counted=secs>0;if(counted){S.st.ans++;S.st.secs.push(secs)}
 S.log.push({it,ans:text||"[sin respuesta]",secs,model:model(it)});
 if(S.showEach){
  setState("review");showRv(S.log[S.log.length-1]);
  const c2=await new Promise(res=>{S.abort=k=>{S.abort=null;res(k=="finish"||k=="next"?"advance":k)}});
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
home();
