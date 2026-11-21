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
function allQ(lo=1,hi=115){const o=[];for(const[k,d]of Object.entries(D.lessons))for(const[n,es,en]of d.qs)if(n>=lo&&n<=hi)o.push(mk("#"+n,k,es,en,"q",n));return o}
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
function home(){
 S.run=false;try{speechSynthesis.cancel()}catch(e){}if(P.stop)P.stop();
 const modes=[["free","Práctica libre (#1-115)"],["lesson","Por lección (elige una o varias)"],["mix","Mix: 15 preguntas al azar (sin Review)"],["exam","Simulacro Examen Oral #3 (lecciones 5-6)"],["ask","Extra: yo hago las preguntas"]];
 A.innerHTML=`<h1>🎤 Simulador de Examen Oral</h1><p class="sub">Escucha la pregunta y contesta hablando. No verás nada en pantalla hasta el repaso.</p>
 ${SRC?"":'<div class="box warn" style="text-align:left">Tu navegador no tiene reconocimiento de voz (usa Chrome en Android o PC). Aun así puedes practicar: contesta en voz alta y toca “Terminar respuesta”.</div>'}
 <div class="box"><h3>Modo</h3>${modes.map((m,i)=>`<label><input type="radio" name="mode" value="${m[0]}" ${i?"":"checked"}>${m[1]}</label>`).join("")}
 <h3>Lecciones <span class="muted" style="font-weight:400;font-size:12px">(solo modo “Por lección”)</span></h3>
 <div class="chips">${LK.map((k,i)=>`<label><input type="checkbox" class="lc" value="${esc(k)}" ${i?"":"checked"}>${esc(k)}</label>`).join("")}</div>
 <div class="row"><button class="alt sm" style="flex:0" onclick="document.querySelectorAll('.lc').forEach(x=>x.checked=true)">Todas</button><button class="alt sm" style="flex:0" onclick="document.querySelectorAll('.lc').forEach(x=>x.checked=false)">Ninguna</button></div>
 <h3>Idiomas</h3>
 <label>Pregunta en: <select id="ql"><option value="es">Español</option><option value="en">Inglés</option></select></label>
 <label>Mi respuesta en: <select id="al"><option value="en">Inglés</option><option value="es">Español</option></select></label>
 <label>Velocidad <input type="range" id="spd" min="0.6" max="1.4" step="0.05" value="1"></label>
 <label><input type="checkbox" id="rnd" checked>Orden aleatorio</label>
 <label><input type="checkbox" id="shw" checked>Ver pregunta y mi respuesta después de cada una</label></div>
 <p class="warn" id="msg"></p>
 <div class="row"><button class="alt" onclick="answers()">📖 Respuestas</button><button onclick="start()">▶ EMPEZAR</button></div>`}
function start(){
 const mode=document.querySelector("input[name=mode]:checked").value,chosen=[...document.querySelectorAll(".lc:checked")].map(x=>x.value);
 if(mode=="lesson"&&!chosen.length){$("#msg").textContent="⚠ Marca al menos una lección.";return}
 S.qlang=$("#ql").value;S.alang=$("#al").value;S.speed=+$("#spd").value;S.showEach=$("#shw").checked;
 S.items=build(mode,chosen,$("#rnd").checked);S.i=0;S.log=[];S.st={ans:0,skip:0,rep:0,secs:[]};S.run=true;
 try{navigator.wakeLock&&navigator.wakeLock.request("screen").catch(()=>{})}catch(e){}
 try{speechSynthesis.getVoices()}catch(e){}
 session();loadManifest().then(()=>{if(S.run)run()})}
function session(){
 A.innerHTML=`<div class="cnt" id="cnt"></div><div id="orb"></div><div class="state" id="st"></div><div class="timer" id="timer">00:00</div><div class="warn" id="warn"></div>
 <div class="box" id="rv" hidden></div>
 <div class="row"><button onclick="ab('repeat')">🔁 Repetir</button><button onclick="ab('prev')">⏮ Anterior</button><button onclick="ab('next')">⏭ Siguiente</button></div>
 <div class="row"><button onclick="ab('finish')">✅ Terminar respuesta / continuar</button></div>
 <div class="row"><button class="red" onclick="ab('end')">⏹ Terminar sesión</button></div>`}
const ab=c=>{if(S.abort)S.abort(c)};
const LBL={speaking:"🔊 Hablando",listening:"🎤 Escuchando",hearing:"🎤 Escuchando",processing:"⏳ Procesando",review:"📝 Repaso",waiting:"⏸ Esperando"};
function setState(n){const o=$("#orb"),s=$("#st");if(!o)return;o.className="o-"+n;s.textContent=LBL[n]}
const warn=t=>{const w=$("#warn");if(w)w.textContent=t};
function showRv(e){const r=$("#rv");if(!r)return;$("#orb").hidden=true;$("#timer").hidden=true;
 r.innerHTML=`<p class="go">${esc(e.it.n)} ${esc(e.it.es)}</p><p class="en">${esc(e.it.en)}</p><p class="g">Tú dijiste:</p><p>${esc(e.ans)}</p><p class="go">Respuesta modelo:</p><p>${esc(e.model)}</p><p class="muted" style="font-size:13px">Duración: ${e.secs.toFixed(1)} s</p>`;r.hidden=false}
function hideRv(){const r=$("#rv");if(r)r.hidden=true;const o=$("#orb"),t=$("#timer");if(o){o.hidden=false;t.hidden=false}}
function answers(){
 const g=Object.keys(D.lessons).map(k=>[k.startsWith("Practical")?k:"Lesson "+k,allQ().filter(x=>x.l==k)]).concat(Object.keys(D.reviews).map(t=>["Review & Check "+t,revI(t)]));
 A.innerHTML=`<h1>📖 Respuestas</h1><p class="sub">Respuestas sencillas de ejemplo: adáptalas a tu vida.</p><div class="box">${g.map(([t,its])=>`<h3>${esc(t)}</h3>`+its.map(it=>`<div class="item"><p><b>${esc(it.n)} ${esc(it.en)}</b></p><p class="g" style="font-weight:400">→ ${esc(model(it))}</p><p class="en">${esc(it.es)}</p></div>`).join("")).join("")}</div><div class="row"><button onclick="home()">↩ Volver al inicio</button></div>`}
function summary(){
 S.run=false;const s=S.st,av=s.secs.length?(s.secs.reduce((a,b)=>a+b,0)/s.secs.length).toFixed(1)+" s":"—";
 A.innerHTML=`<h1>📋 Resumen</h1><div class="box" style="text-align:center">Respondidas: ${s.ans} · Promedio: ${av} · Repetidas: ${s.rep} · Saltadas: ${s.skip}</div>
 <div class="box">${S.log.length?S.log.map((e,k)=>`<div class="item"><p class="go">${k+1}. ${esc(e.it.n)} ${esc(e.it.es)}</p><p class="en">${esc(e.it.en)}</p><p><span class="g">Tú dijiste:</span> ${esc(e.ans)}</p><p><span class="go">Modelo:</span> ${esc(e.model)}</p></div>`).join(""):"No hubo respuestas en esta sesión."}</div>
 <div class="row"><button onclick="home()">↩ Volver al inicio</button></div>`}

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
home();
