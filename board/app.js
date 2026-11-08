/* ================= Abisso Board · prototipo ================= */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- lingue ---------- */
const I18N = {
  "Spoglio":{en:"Breakdown",de:"Drehbuchauszug",uk:"Розбивка"},
  "Strisce":{en:"Stripboard",de:"Stripboard",uk:"Стріпборд"},
  "Calendario":{en:"Calendar",de:"Kalender",uk:"Календар"},
  "DOOD":{en:"Day out of Days",de:"Day out of Days",uk:"Day out of Days"},
  "Report":{en:"Reports",de:"Berichte",uk:"Звіти"},
  "Ordine del giorno":{en:"Call sheet",de:"Dispo",uk:"Виклик на зйомку"},
  "Squadra":{en:"Team",de:"Team",uk:"Команда"},
  "Cambia copione":{en:"Change script",de:"Drehbuch wechseln",uk:"Змінити сценарій"},
  "Vedi come":{en:"View as",de:"Ansicht als",uk:"Переглянути як"},
  "Scene":{en:"Scenes",de:"Szenen",uk:"Сцени"},
  "Spoglio automatico":{en:"Auto breakdown",de:"Automatischer Auszug",uk:"Автоматична розбивка"},
  "Importa analisi AI":{en:"Import AI analysis",de:"KI-Analyse importieren",uk:"Імпорт аналізу ШІ"},
  "Categorie":{en:"Categories",de:"Kategorien",uk:"Категорії"},
  "Ottimizza":{en:"Optimise",de:"Optimieren",uk:"Оптимізувати"},
  "Aggiungi fine giornata":{en:"Add day break",de:"Drehtagende einfügen",uk:"Додати кінець дня"},
  "Giornata":{en:"Day",de:"Drehtag",uk:"День"},
  "Impostazioni del piano":{en:"Schedule settings",de:"Einstellungen",uk:"Налаштування плану"},
  "Avvisi":{en:"Warnings",de:"Hinweise",uk:"Попередження"},
  "Esportazioni":{en:"Exports",de:"Exporte",uk:"Експорт"},
  "Reparti":{en:"Departments",de:"Abteilungen",uk:"Відділи"},
  "Personaggi":{en:"Cast",de:"Rollen",uk:"Персонажі"},
  "Location":{en:"Locations",de:"Motive",uk:"Локації"},
  "Revisioni":{en:"Revisions",de:"Fassungen",uk:"Редакції"},
  "Trasporti":{en:"Transport",de:"Fahrdienst",uk:"Транспорт"},
  "Invita":{en:"Invite",de:"Einladen",uk:"Запросити"},
  "Pagine":{en:"Pages",de:"Seiten",uk:"Сторінки"},
  "Convocazione generale":{en:"General call",de:"Drehbeginn",uk:"Загальний збір"}
};
let LANG = "it";
const T = k => k;   // le traduzioni le fa i18n.js sullo schermo

/* ---------- stato ---------- */
const LPP = 54;                       // righe per pagina, come il Typewriter
let S = null;
function save(){
  if (!S || !Cloud.pid) return;
  try{ localStorage.setItem("abb:ui:"+Cloud.pid, JSON.stringify({view:S.view, sel:S.sel, rtab:S.rtab, csDay:S.csDay})); }catch(e){}
  Cloud.save(S);
}

/* ---------- analisi del copione ---------- */
let A = null;   // analisi: scene arricchite
function parseHead(h){
  const m = h.match(/^(INT\.\/EST\.|EST\.\/INT\.|INT\.|EST\.|EXT\.|I\/E\.?)\s*(.*)$/i);
  const ie = m ? (/^INT\.$/i.test(m[1]) ? "INT" : /^(EST|EXT)\.$/i.test(m[1]) ? "EST" : "I/E") : "";
  let rest = m ? m[2] : h;
  const parts = rest.split(/\s+-\s+/);
  const time = parts.length > 1 ? parts.pop() : "";
  const loc = parts.join(" - ");
  const dn = /NOTTE|NIGHT|NACHT/i.test(time) ? "N" : "G";
  return {ie, loc, time, dn, site: parts[0] || loc};
}
const cueName = s => s.replace(/\(.*?\)/g,"").trim();
function lines(t, w){ return Math.max(1, Math.ceil(t.length / w)); }
function analyse(){
  const sc = S.script.scenes.map(s => ({...s, ...parseHead(s.h)}));
  const names = new Set();
  sc.forEach(s => s.b.forEach(([t,x]) => { if (t==="c") names.add(cueName(x)); }));
  let cum = 0;
  sc.forEach(s => {
    let l = 2;
    s.b.forEach(([t,x]) => { l += t==="a" ? lines(x,61)+1 : t==="c" ? 1 : t==="p" ? lines(x,30) : lines(x,35)+1; });
    s.lines = l; s.e8 = Math.max(1, Math.round(l*8/LPP));
    s.page = Math.floor(cum/LPP)+1; cum += l;
    const speak = new Set(s.b.filter(b=>b[0]==="c").map(b=>cueName(b[1])).filter(n => !/V\.O\./.test(n)));
    const action = s.b.filter(b=>b[0]==="a").map(b=>b[1]).join(" ");
    names.forEach(n => { if (new RegExp("\\b"+n+"\\b","i").test(action)) speak.add(n); });
    s.cast = [...speak];
    s.text = s.b.map(b=>b[1]).join("\n");
  });
  // ID del cast per numero di scene
  const count = {}; sc.forEach(s => s.cast.forEach(n => count[n]=(count[n]||0)+1));
  const castIds = Object.keys(count).sort((a,b)=>count[b]-count[a] || a.localeCompare(b));
  A = {scenes: sc, by: Object.fromEntries(sc.map(s=>[s.id,s])), castIds, total8: sc.reduce((a,s)=>a+s.e8,0), pages: Math.ceil(cum/LPP)};
  // righe aggiunte a mano nello stripboard: note/banner e riprese fuori copione
  A.extras = Object.entries(S.extra || {}).map(([id, x]) => x.kind==="banner"
    ? {id, banner:true, text:x.text, color:x.color, e8:0, cast:[], site:null, dn:null}
    : {id, manual:true, n:x.n, h:x.desc, ie:x.ie, loc:x.loc, site:(x.loc||"").split(" - ")[0], time:x.dn==="N"?"NOTTE":"GIORNO", dn:x.dn, e8:x.e8, cast:x.cast||[], page:"—", b:[], text:x.desc});
  A.extras.forEach(x => A.by[x.id] = x);
  A.total8 += A.extras.reduce((a,x)=>a+x.e8,0);
}
const cid = n => A.castIds.indexOf(n)+1;
const isScene = id => A.by[id] && !A.by[id].banner;
function eighths(e){ const p = Math.floor(e/8), r = e%8; return (p?p:"") + (r ? (p?" ":"") + r+"/8" : (p?"":"0")); }

/* ---------- spoglio ---------- */
function tagsOf(id){ return S.tags[id] || (S.tags[id] = {}); }
function addTag(id, k, t, src){
  const tg = tagsOf(id); tg[k] = tg[k] || [];
  if (tg[k].some(x => x.t.toLowerCase()===t.toLowerCase())) return false;
  tg[k].push({t, src}); return true;
}
function ruleBreakdown(){
  A.scenes.forEach(s => {
    const tg = tagsOf(s.id);
    Object.keys(tg).forEach(k => tg[k] = tg[k].filter(x => x.src!=="r"));     // le scelte a mano restano
    const low = s.b.filter(b=>b[0]==="a").map(b=>b[1]).join(" ").toLowerCase();
    Object.entries(RULES).forEach(([k, terms]) => {
      const hit = [];
      [...terms].sort((a,b)=>b.length-a.length).forEach(t => { if (low.includes(t) && !hit.some(h=>h.includes(t))) hit.push(t); });
      hit.forEach(t => addTag(s.id, k, t, "r"));
    });
    if (/\bNOTTE\b/.test(s.h) && s.cast.length) addTag(s.id, "note", "notturna", "r");
  });
}
function aiImport(){
  let n = 0; const tbd = (S.script && S.script.tbd) || {};
  A.scenes.forEach(sc => { const bd = tbd[sc.id]; if (!bd) return;
    Object.entries(TW_MAP).forEach(([tk, k]) => (bd[tk]||[]).forEach(t => { const ai = ((bd.ai||{})[tk]||[]).includes(t); if (addTag(sc.id, k, t, ai?"ai":"m")) n++; }));
    if (bd.note && addTag(sc.id, "note", bd.note, "ai")) n++; });
  return n;
}
function castTags(s){ return s.cast.map(n => ({t:n, src:"r"})); }

/* ---------- piano ---------- */
function shootDates(n){
  const out = []; const d = new Date(S.start+"T12:00:00");
  while (out.length < n){ if (!S.off.includes(d.getDay())) out.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1); }
  return out;
}
function days(){
  const ds = [[]]; S.order.forEach(t => { if (t==="|") ds.push([]); else if (A.by[t]) ds[ds.length-1].push(t); });
  while (ds.length > 1 && !ds[ds.length-1].length) ds.pop();
  const dates = shootDates(ds.length);
  return ds.map((ids,i) => ({i, ids, date: dates[i], e8: ids.reduce((a,id)=>a+A.by[id].e8,0)}));
}
function conflicts(id, date){ return A.by[id].cast.filter(n => (S.unavail[n]||[]).includes(date)); }
function optimise(){
  const target = S.target;
  const clusters = {};
  const anchors = {}; let prev = null;
  S.order.forEach(t => { if (A.by[t] && A.by[t].banner) anchors[t] = prev; else if (t!=="|") prev = t; });
  [...A.scenes, ...A.extras.filter(x=>!x.banner)].forEach(s => { const k = s.site+"|"+s.dn; (clusters[k] = clusters[k] || {k, dn:s.dn, ids:[], e8:0}); clusters[k].ids.push(s.id); clusters[k].e8 += s.e8; });
  const cl = Object.values(clusters).sort((a,b) => (a.dn==="N")-(b.dn==="N") || b.e8-a.e8);
  // dentro ogni blocco: prima le scene con più cast, poi ordine del copione
  cl.forEach(c => c.ids.sort((a,b) => A.by[b].cast.length - A.by[a].cast.length || (A.scenes.indexOf(A.by[a])+1 || 999) - (A.scenes.indexOf(A.by[b])+1 || 999)));
  let ds = [[]], sum = 0, lastSite = null, lastDn = null;
  cl.forEach(c => c.ids.forEach(id => {
    const s = A.by[id];
    const cur = ds[ds.length-1];
    const over = sum + s.e8 > target*1.25;
    const move = lastSite && s.site!==lastSite && sum >= target*0.6;
    const flip = lastDn && s.dn!==lastDn && cur.length;
    if (cur.length && (over || move || flip)){ ds.push([]); sum = 0; }
    ds[ds.length-1].push(id); sum += s.e8; lastSite = s.site; lastDn = s.dn;
  }));
  // indisponibilità: sposta la scena al primo giorno utile
  for (let pass=0; pass<3; pass++){
    const dates = shootDates(ds.length+1);
    for (let i=0;i<ds.length;i++){
      ds[i] = ds[i].filter(id => { if (!conflicts(id, dates[i]).length) return true;
        let j = i+1; while (j<ds.length && conflicts(id, dates[j]).length) j++;
        if (j>=ds.length) ds.push([]); ds[j].push(id); return false; });
    }
  }
  ds = ds.filter(d => d.length);
  S.order = ds.flatMap((d,i) => i ? ["|", ...d] : d);
  Object.entries(anchors).forEach(([b, after]) => { const i = after ? S.order.indexOf(after) : -1; S.order.splice(i+1, 0, b); });
}
function warnings(){
  const w = []; const D = days();
  D.forEach((d,i) => {
    if (d.e8 > S.target*1.25) w.push(`${T("Giornata")} ${i+1}: ${eighths(d.e8)} pag., oltre il ritmo di ${eighths(S.target)} al giorno.`);
    d.ids.forEach(id => conflicts(id, d.date).forEach(n => w.push(`${T("Giornata")} ${i+1} (${fmtDate(d.date)}): ${n} non è disponibile, ma è in scena ${A.by[id].n}.`)));
    const night = d.ids.some(id => A.by[id].dn==="N");
    if (night && D[i+1] && D[i+1].ids.some(id => A.by[id].dn==="G")) w.push(`${T("Giornata")} ${i+1} ha notturne e la ${i+2} è di giorno: rispettare il riposo minimo tra le due convocazioni.`);
    d.ids.forEach(id => { const s = A.by[id]; if (s.dn==="N" && ((tagsOf(id).minor)||[]).length) w.push(`${T("Giornata")} ${i+1}: scena ${s.n} notturna con un minore, serve la deroga.`); });
    const sites = new Set(d.ids.filter(isScene).map(id=>A.by[id].site)); if (sites.size > 2) w.push(`${T("Giornata")} ${i+1}: ${sites.size} location diverse nello stesso giorno.`);
  });
  return w;
}
const fmtDate = (iso, opt={weekday:"short", day:"numeric", month:"short"}) => new Date(iso+"T12:00:00").toLocaleDateString({it:"it-IT",en:"en-GB",de:"de-DE",uk:"uk-UA"}[LANG], opt);

/* ---------- boot ---------- */
function boot(first){
  S.extra = S.extra || {};
  analyse();
  if (first){ ruleBreakdown(); aiImport(); optimise(); save(); }
  else { const known = new Set(S.order); [...A.scenes, ...A.extras].forEach(s => { if (!known.has(s.id)) S.order.push(s.id); }); }
}

/* ================= interfaccia ================= */
const VIEWS = [["spoglio","Spoglio"],["strisce","Strisce"],["calendario","Calendario"],["dood","DOOD"],["report","Report"],["odg","Ordine del giorno"],["squadra","Squadra"]];
function role(){ const r = Cloud.myRole(); if (r==="admin"){ const v = $("#roleSel") && $("#roleSel").value; return v || "admin"; } return r; }
const isRO = () => ["dept","guest"].includes(role());
function canEditPlan(){ return ["admin","prod","ad"].includes(Cloud.myRole()); }
const deptCats = () => Cloud.myRole()==="admin" ? ["cost"] : Cloud.myCats();
function renderNav(){
  const hidden = role()==="admin" ? [] : ["squadra"];
  $("#nav").innerHTML = VIEWS.filter(v=>!hidden.includes(v[0])).map(([k,l]) => `<button data-v="${k}" class="${S.view===k?"on":""}">${esc(T(l))}</button>`).join("");
}
function renderTop(){
  $("#pTitle").textContent = S.script.title;
  const rv = S.script.revision;
  const srcL = {cloud:"da Abisso Typewriter", shared:"da un copione condiviso", file:"da file"}[(S.script.source||{}).kind] || "";
  $("#pSub").innerHTML = `${A.scenes.length} scene · ${A.pages} ${esc(T("Pagine").toLowerCase())}${srcL?" · "+srcL:""}${rv ? ` · <span class="rev-dot" style="background:${esc(rv.color)}"></span>Rev. ${esc(rv.name)} ${esc(fmtDate(rv.date,{day:"numeric",month:"short"}))}` : ""}`;
  $$("[data-i]").forEach(el => el.textContent = T(el.dataset.i));
}
function render(){
  if (S.view==="squadra" && role()!=="admin") S.view = "spoglio";
  document.body.classList.toggle("ro", isRO());
  renderTop(); renderNav();
  const v = $("#view");
  const phone = `<div class="phone-note">Sul telefono Abisso Board è in consultazione: per modificare spoglio e piano apri il computer.</div>`;
  const fn = {spoglio:vSpoglio, strisce:vStrisce, calendario:vCal, dood:vDood, report:vReport, odg:vOdg, squadra:vTeam}[S.view] || vSpoglio;
  v.innerHTML = phone + fn();
  if (S.view==="spoglio") afterSpoglio();
  if (S.view==="strisce") afterStrisce();
}
function toast(m, ms=2600){ const t = document.createElement("div"); t.className="toast"; t.textContent=m; document.body.appendChild(t); setTimeout(()=>t.remove(), ms); }
function modal(html, bind){ $("#layer").innerHTML = `<div class="ov" data-close><div class="modal" role="dialog">${html}</div></div>`; bind && bind($("#layer .modal")); }
function closeModal(){ $("#layer").innerHTML = ""; }
document.addEventListener("click", e => { if (e.target.matches("[data-close]") || e.target.closest("[data-x]")) closeModal(); });
async function copy(text, btn){ try{ await navigator.clipboard.writeText(text); toast("Copiato."); }catch(e){ const pre = btn.closest(".modal").querySelector("pre"); const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Testo selezionato: premi Cmd+C."); } }

function stripVars(s){
  const ext = s.ie!=="INT";
  if (s.dn==="N") return `--sbg:var(${ext?"--s-extn":"--s-intn"});--sfg:var(--s-ink-n)`;
  return `--sbg:var(${ext?"--s-extd":"--s-intd"});--sfg:var(--s-ink-d)`;
}
const catOf = k => S.cats.find(c=>c.k===k);
const activeCats = () => S.cats.filter(c => c.on && (role()!=="dept" || ["cast","note",...deptCats()].includes(c.k)));

/* ---------- vista spoglio ---------- */
function vSpoglio(){
  const pend = A.scenes.filter(s => s.rev).length;
  const list = A.scenes.map(s => `<button class="sc-item ${S.sel===s.id?"on":""}" data-sel="${s.id}">
      <span class="stripe" style="background:var(--sbg);${stripVars(s)}"></span><span class="n">${esc(s.n)}</span>
      <span class="t">${esc(s.loc)}<small>${esc(s.ie)} · ${esc(s.time)} · ${eighths(s.e8)}</small></span>
      ${s.rev==="mod" ? `<span class="pill rev">rev</span>` : s.rev==="new" ? `<span class="pill rev">nuova</span>` : ""}</button>`).join("");
  return `<div class="bd">
    <aside class="scenes"><div class="bar">
      <div class="row" style="justify-content:space-between"><h3>${T("Scene")}</h3><span class="muted" style="font-size:12px">${eighths(A.total8)} pag.</span></div>
      <button class="btn edit-only" data-act="rules">${T("Spoglio automatico")}</button>
      <button class="btn edit-only" data-act="ai">${T("Importa analisi AI")}</button>
      <button class="btn edit-only" data-act="cats">${T("Categorie")} (${S.cats.filter(c=>c.on).length})</button>
      ${pend ? `<span class="note">Rev. ${esc((S.script.revision||{}).name||'—')}: ${pend} scene cambiate dall'ultima versione.</span>` : ""}
      </div>${list}</aside>
    <section class="desk" id="desk" aria-label="Copione">${scriptPages()}</section>
    <aside class="sheet" id="sheet">${sheet()}</aside></div>`;
}
function highlight(text, s){
  const terms = [];
  const tg = tagsOf(s.id);
  activeCats().forEach(c => {
    const items = c.k==="cast" ? castTags(s) : (tg[c.k]||[]);
    items.forEach(it => { const t = it.t.replace(/\s*\(.*\)$/,"").trim(); if (t.length<2) return;
      const ex = terms.find(x => x[0].toLowerCase()===t.toLowerCase()); if (ex){ if (!ex[1].includes(c.c)) ex[1].push(c.c); } else terms.push([t, [c.c]]); });
  });
  terms.sort((a,b)=>b[0].length-a[0].length);
  const low = text.toLowerCase(); const taken = new Array(text.length).fill(false); const hits = [];
  terms.forEach(([t,c]) => { const tl = t.toLowerCase(); let i = low.indexOf(tl);
    while (i >= 0){ const end = i+tl.length; const bound = (i===0 || !/[\p{L}]/u.test(text[i-1])) && (end>=text.length || !/[\p{L}]/u.test(text[end]));
      if (bound && !taken.slice(i,end).some(Boolean)){ hits.push([i,end,c]); for (let k=i;k<end;k++) taken[k]=true; }
      i = low.indexOf(tl, i+1); } });
  hits.sort((a,b)=>a[0]-b[0]);
  let out = "", p = 0;
  hits.forEach(([i,e,cs]) => { const n = cs.length; const ul = n>1 ? `;--ul:linear-gradient(90deg,${cs.map((c,j)=>`${c} ${Math.round(j*100/n)}% ${Math.round((j+1)*100/n)}%`).join(",")})` : "";
    out += esc(text.slice(p,i)) + `<mark style="--mc:${cs[0]}${ul}" title="${esc(cs.map(c=>(S.cats.find(x=>x.c===c)||{}).l).filter(Boolean).join(" · "))}">${esc(text.slice(i,e))}</mark>`; p = e; });
  return out + esc(text.slice(p));
}
function scriptPages(){
  const pages = [[]]; let used = 0;
  const push = (h, l) => { if (used + l > LPP && pages[pages.length-1].length){ pages.push([]); used = 0; } pages[pages.length-1].push(h); used += l; };
  A.scenes.forEach(s => {
    const rm = s.rev ? `<span class="revmark" aria-label="revisione">*</span>` : "";
    push(`<div class="sh ${S.sel===s.id?"cur":""}" id="h-${s.id}" data-sel="${s.id}"><span><span class="sn">${esc(s.n)}</span>&nbsp;&nbsp;${esc(s.h)}</span><span class="sn">${esc(s.n)}</span></div>`, 2);
    s.b.forEach(([t,x]) => {
      const cls = {a:"pa",c:"pc",p:"pp",d:"pd"}[t];
      const body = t==="c" ? esc(x) : highlight(x, s);
      push(`<div class="${cls}" data-sid="${s.id}" style="position:relative">${body}${s.rev?rm:""}</div>`, t==="a"?lines(x,61)+1:t==="c"?1:t==="p"?lines(x,30):lines(x,35)+1);
    });
  });
  return pages.map((p,i) => `<div class="page"><span class="pno">${i+1}.</span>${p.join("")}</div>`).join("");
}
function revDiff(s){
  if (s.rev==="new") return `<div class="revbox"><b>Scena nuova</b> nella revisione ${esc((S.script.revision||{}).name||'—')}. Lo spoglio automatico l'ha già letta: controlla gli elementi.</div>`;
  if (s.rev!=="mod" || !s.prev) return "";
  const rows = []; const n = Math.max(s.b.length, s.prev.length);
  for (let i=0;i<n;i++){ const a = s.prev[i], b = s.b[i];
    if (!a) rows.push(`<ins>+ ${esc(b[1])}</ins>`); else if (!b) rows.push(`<del>${esc(a[1])}</del>`);
    else if (a[1]!==b[1] || a[0]!==b[0]) rows.push(`<del>${esc(a[1])}</del><br><ins>${esc(b[1])}</ins>`); }
  return `<div class="revbox"><b>Cambiata nella revisione ${esc((S.script.revision||{}).name||'—')}</b> (prima: ${esc((S.script.revision||{}).prev||'—')}). Gli elementi già spogliati sono rimasti; controlla le righe nuove.<br><br>${rows.slice(0,4).join("<br><br>")}</div>`;
}
function sheet(){
  const s = A.by[S.sel]; if (!s) return "";
  const tg = tagsOf(s.id); const ro = isRO();
  const cats = activeCats().map(c => {
    const items = c.k==="cast" ? s.cast.map(n => ({t:`${cid(n)}. ${n}`, src:"r", fixed:true})) : (tg[c.k]||[]);
    if (ro && !items.length) return "";
    return `<div class="cat"><h4><span class="dot" style="--c:${c.c}"></span>${esc(c.l)}</h4><div class="tags">
      ${items.map((it,ix) => `<span class="tag">${c.k==="cast"?"":catsWith(s.id,it.t).filter(k=>k!==c.k&&catOf(k)&&catOf(k).on).map(k=>`<span class="dot" style="--c:${catOf(k).c};width:7px;height:7px" title="anche in ${esc(catOf(k).l)}"></span>`).join("")}${esc(it.t)} <span class="src ${it.src==="ai"?"ai":""}" title="${it.src==="ai"?"proposto dall'AI":it.src==="r"?"trovato dalle regole":"aggiunto a mano"}">${it.src==="ai"?"AI":it.src==="r"?"AUTO":"MANO"}</span>${it.fixed||ro?"":`<button data-mc="${esc(it.t)}" title="Categorie" aria-label="Scegli le categorie di ${esc(it.t)}">⊕</button><button data-rm="${c.k}|${ix}" aria-label="Rimuovi ${esc(it.t)}">×</button>`}</span>`).join("")}
      ${c.k==="cast"||ro ? "" : `<input class="tag-add edit-only" data-add="${c.k}" placeholder="+ aggiungi" aria-label="Aggiungi a ${esc(c.l)}">`}</div></div>`;
  }).join("");
  return `<div class="sh-head"><div class="row" style="justify-content:space-between"><h2 style="font-family:var(--f-script)">Scena ${esc(s.n)}</h2>
      <span class="row">${s.rev?`<span class="pill rev">${s.rev==="new"?"nuova":"rev. "+esc((S.script.revision||{}).name||'—')}</span>`:""}<span class="pill">p. ${s.page}</span></span></div>
    <div style="margin-top:6px;font-weight:700">${esc(s.loc)}</div>
    <div class="sh-grid"><div><small>INT/EST</small><b>${esc(s.ie)}</b></div><div><small>Luce</small><b>${s.dn==="N"?"Notte":"Giorno"}</b></div>
      <div><small>Momento</small><b>${esc(s.time)}</b></div><div><small>Ottavi</small><b class="e8">${eighths(s.e8)}</b></div></div>
    ${role()==="dept" ? `<p class="note" style="margin:10px 0 0">Vista di reparto: vedi cast, note e le categorie del tuo reparto.</p>` : ro ? `<p class="note" style="margin:10px 0 0">Sola lettura.</p>` : `<p class="note edit-only" style="margin:10px 0 0">Seleziona una parola nel copione per assegnarla a una o più categorie. Con ⊕ su un elemento lo metti anche in altre categorie.</p>`}</div>
    ${revDiff(s)}<div class="cats">${cats}</div>`;
}
let selMenu = null;
function afterSpoglio(){
  const h = $("#h-"+S.sel); if (h && !afterSpoglio.noScroll && !matchMedia("(max-width:760px)").matches) h.scrollIntoView({block:"start"}); afterSpoglio.noScroll = false;
  $("#desk").addEventListener("mouseup", e => {
    if (isRO() || matchMedia("(max-width:760px)").matches) return;
    setTimeout(() => {
      const sel = getSelection(); const t = sel.toString().replace(/\s+/g," ").trim();
      if (!t || t.length > 80 || !sel.rangeCount) return;
      const node = sel.anchorNode && (sel.anchorNode.nodeType===1 ? sel.anchorNode : sel.anchorNode.parentElement);
      const host = node && node.closest("[data-sid]"); if (!host) return;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      showSelMenu(t, host.dataset.sid, r);
    }, 0);
  });
}
function catsWith(sid, t){ const tg = tagsOf(sid); const l = t.toLowerCase(); return Object.keys(tg).filter(k => (tg[k]||[]).some(x => x.t.toLowerCase()===l)); }
function showSelMenu(t, sid, r){
  hideSelMenu();
  const has = catsWith(sid, t);
  selMenu = document.createElement("div"); selMenu.className = "selmenu";
  selMenu.innerHTML = `<div class="q">«${esc(t)}» · scena ${esc(A.by[sid].n)} — scegli una o più categorie:</div>` +
    S.cats.filter(c=>c.on && c.k!=="cast").map(c => `<label><input type="checkbox" value="${c.k}" ${has.includes(c.k)?"checked":""}><span class="dot" style="--c:${c.c}"></span>${esc(c.l)}</label>`).join("") +
    `<div class="foot"><button class="btn" data-sm="x">Annulla</button><button class="btn primary" data-sm="ok">Assegna</button></div>`;
  document.body.appendChild(selMenu);
  const w = 340, hgt = selMenu.offsetHeight;
  selMenu.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + "px";
  selMenu.style.top = (r.bottom + hgt + 8 < innerHeight ? r.bottom + 6 : Math.max(8, Math.min(innerHeight - hgt - 8, r.top - hgt - 6))) + "px";
  selMenu.addEventListener("mousedown", e => { if (!e.target.closest("input,label")) e.preventDefault(); });
  selMenu.addEventListener("click", e => { const b = e.target.closest("[data-sm]"); if (!b) return;
    if (b.dataset.sm==="x"){ hideSelMenu(); return; }
    const want = [...selMenu.querySelectorAll("input:checked")].map(i=>i.value);
    const tg = tagsOf(sid); const l = t.toLowerCase();
    // origine: se l'elemento esisteva già, la nuova categoria eredita da dove veniva
    const old = has.length ? (tg[has[0]].find(x=>x.t.toLowerCase()===l)) : null; const src = old ? old.src : "m"; const text = old ? old.t : t;
    has.filter(k => !want.includes(k)).forEach(k => tg[k] = tg[k].filter(x => x.t.toLowerCase()!==l));
    want.forEach(k => addTag(sid, k, text, src));
    S.sel = sid; save(); hideSelMenu(); getSelection().removeAllRanges(); afterSpoglio.noScroll = true;
    const top = $("#desk").scrollTop; render(); $("#desk").scrollTop = top;
    toast(want.length ? `«${text}» in: ${want.map(k=>catOf(k).l).join(", ")}.` : `«${text}» tolto da tutte le categorie.`); });
}
function hideSelMenu(){ if (selMenu){ selMenu.remove(); selMenu = null; } }
document.addEventListener("mousedown", e => { if (selMenu && !e.target.closest(".selmenu")) hideSelMenu(); });

/* ---------- vista strisce ---------- */
function vStrisce(){
  const D = days(); const W = warnings();
  const strip = id => { const s = A.by[id]; const tg = tagsOf(id); const n = Object.values(tg).reduce((a,x)=>a+x.length,0);
    if (s.banner) return `<div class="strip banner" draggable="true" data-id="${id}" style="--sbg:${esc(s.color)};--sfg:#000">
      <span class="grip edit-only" aria-hidden="true">⋮⋮</span><span class="btxt">${esc(s.text)}</span><button class="ed edit-only" data-edx="${id}" aria-label="Modifica riga">✎</button></div>`;
    if (s.manual) return `<div class="strip" draggable="true" data-id="${id}" style="${stripVars(s)}">
      <span class="grip edit-only" aria-hidden="true">⋮⋮</span><span class="n">${esc(s.n)}</span>
      <span>${esc(s.ie)} · ${s.dn==="N"?"N":"G"}</span>
      <span class="loc">${esc(s.loc)}<small>${esc(s.text)} · fuori copione</small></span>
      <span class="e8">${eighths(s.e8)}</span>
      <span class="ids">${s.cast.map(cid).filter(Boolean).sort((a,b)=>a-b).join(", ")||"—"}</span>
      <span class="who"><button class="ed edit-only" data-edx="${id}" aria-label="Modifica riga">✎ modifica</button></span></div>`;
    return `<div class="strip" draggable="true" data-id="${id}" style="${stripVars(s)}">
      <span class="grip edit-only" aria-hidden="true">⋮⋮</span><span class="n">${esc(s.n)}</span>
      <span>${esc(s.ie)} · ${s.dn==="N"?"N":"G"}</span>
      <span class="loc">${esc(s.loc)}<small>${esc(s.time)} · p. ${s.page}${s.rev?" · rev":""}</small></span>
      <span class="e8">${eighths(s.e8)}</span>
      <span class="ids">${s.cast.map(cid).sort((a,b)=>a-b).join(", ")||"—"}</span>
      <span class="who">${n} elem.</span></div>`; };
  let rows = ""; D.forEach((d,i) => {
    rows += d.ids.map(strip).join("");
    const over = d.e8 > S.target*1.25;
    rows += `<div class="daybreak" draggable="true" data-break="${i}"><span class="grip edit-only" aria-hidden="true">⋮⋮</span>
      <span>${esc(trUI(`FINE GIORNATA ${i+1} DI ${D.length}`))} · ${esc(fmtDate(d.date,{weekday:"long",day:"numeric",month:"long"}))} · <span class="${over?"warn":""}">${eighths(d.e8)} pag.</span></span>
      ${i<D.length-1?`<button class="del edit-only" data-delbreak="${i}" aria-label="Togli questa fine giornata">×</button>`:"<span></span>"}</div>`;
  });
  const wd = [0,1,2,3,4,5,6].map(i => new Date(2027,0,3+i,12).toLocaleDateString({it:"it-IT",en:"en-GB",de:"de-DE",uk:"uk-UA"}[LANG],{weekday:"narrow"}).toUpperCase());
  return `<div class="wrap"><div class="head"><div><h2>${T("Strisce")}</h2><p class="note">${D.length} giornate · ${eighths(A.total8)} pagine · in media ${eighths(Math.round(A.total8/D.length))} al giorno. Trascina le strisce e le fine giornata per cambiare il piano. Con «Aggiungi riga» inserisci note (spostamenti, pranzo, seconda unità) o riprese fuori copione.</p></div>
    <div class="row"><button class="btn" data-exp="strip:pdf">PDF</button></div><div class="row edit-only"><button class="btn" data-act="addrow">+ Aggiungi riga</button><button class="btn" data-act="addbreak">${T("Aggiungi fine giornata")}</button><button class="btn primary" data-act="opt">${T("Ottimizza")}</button></div></div>
    <div class="sb-layout"><div class="board"><div class="board-scroll" id="board">${rows}</div></div>
    <div class="side">
      <div class="box"><h3>${T("Avvisi")}</h3><ul class="warnlist">${W.length ? W.map(w=>`<li>${esc(w)}</li>`).join("") : `<li class="ok">Nessun conflitto nel piano.</li>`}</ul></div>
      <div class="box edit-only"><h3>${T("Impostazioni del piano")}</h3>
        <label>Primo giorno di riprese<input type="date" id="optStart" value="${S.start}"></label>
        <label>Ritmo: pagine al giorno<select id="optTarget">${[4,6,8,12,16,24,32,40].map(v=>`<option value="${v}" ${v===S.target?"selected":""}>${eighths(v)}</option>`).join("")}</select></label>
        <div><span class="muted" style="font-size:12px">Giorni di riposo</span><div class="wd">${wd.map((l,i)=>`<label><input type="checkbox" data-off="${i}" ${S.off.includes(i)?"checked":""}>${l}</label>`).join("")}</div></div>
        <label>Indisponibilità attori<select id="unWho">${A.castIds.map(n=>`<option>${esc(n)}</option>`).join("")}</select></label>
        <div class="row"><input type="date" id="unDate" aria-label="Giorno non disponibile" style="flex:1"><button class="btn" data-act="unadd">Aggiungi</button></div>
        <div class="tags">${Object.entries(S.unavail).flatMap(([n,ds])=>ds.map(d=>`<span class="tag">${esc(n)} · ${esc(fmtDate(d))}<button data-unrm="${esc(n)}|${d}" aria-label="Rimuovi">×</button></span>`)).join("") || `<span class="muted" style="font-size:12px">Nessuna.</span>`}</div>
        <p class="note">L'ottimizzazione raggruppa per location e per giorno/notte, mette le notturne in coda e sposta le scene degli attori non disponibili. Poi il piano resta tuo: trascina quello che vuoi.</p>
      </div>
      <div class="legend"><span><i style="background:var(--s-intd)"></i>INT giorno</span><span><i style="background:var(--s-extd)"></i>EST giorno</span><span><i style="background:var(--s-intn)"></i>INT notte</span><span><i style="background:var(--s-extn)"></i>EST notte</span></div>
      <div class="box"><h3>ID cast</h3><div class="tags">${A.castIds.map((n,i)=>`<span class="tag" style="padding-right:8px">${i+1}. ${esc(n)}</span>`).join("")}</div></div>
    </div></div></div>`;
}
let dragTok = null;
function afterStrisce(){
  const board = $("#board"); if (!board) return;
  const canDrag = !isRO() && !matchMedia("(max-width:760px)").matches;
  $$(".strip,.daybreak", board).forEach(el => {
    el.draggable = canDrag;
    el.addEventListener("dragstart", e => { dragTok = el.dataset.id || ("|"+el.dataset.break); el.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragTok); });
    el.addEventListener("dragend", () => { el.classList.remove("dragging"); $$(".over",board).forEach(x=>x.classList.remove("over")); });
    el.addEventListener("dragover", e => { e.preventDefault(); $$(".over",board).forEach(x=>x.classList.remove("over")); el.classList.add("over"); });
    el.addEventListener("drop", e => { e.preventDefault(); if (!dragTok) return; moveToken(dragTok, el.dataset.id || ("|"+el.dataset.break)); dragTok = null; });
  });
}
function tokIndex(tok){ if (tok[0]!=="|") return S.order.indexOf(tok); let n = -1; for (let i=0;i<S.order.length;i++) if (S.order[i]==="|" && ++n===+tok.slice(1)) return i; return S.order.length; }
function moveToken(from, to){
  if (from===to) return;
  const fi = tokIndex(from); if (fi<0 || fi>=S.order.length) return;
  let ti = tokIndex(to); if (ti<0) ti = S.order.length;
  const [it] = S.order.splice(fi,1);
  if (ti > fi) ti--;
  S.order.splice(ti,0,it); save(); render();
}

/* ---------- calendario ---------- */
function vCal(){
  const D = days(); const byDate = Object.fromEntries(D.map(d=>[d.date,d]));
  const first = new Date(D[0].date+"T12:00:00"), last = new Date(D[D.length-1].date+"T12:00:00");
  const months = []; const m = new Date(first.getFullYear(), first.getMonth(), 1, 12);
  while (m <= last){ months.push(new Date(m)); m.setMonth(m.getMonth()+1); }
  const wdn = [1,2,3,4,5,6,0].map(i => new Date(2027,1,i===0?7:i,12).toLocaleDateString({it:"it-IT",en:"en-GB",de:"de-DE",uk:"uk-UA"}[LANG],{weekday:"short"}));
  const html = months.map(mm => {
    const y = mm.getFullYear(), mo = mm.getMonth(); const startW = (new Date(y,mo,1,12).getDay()+6)%7; const nd = new Date(y,mo+1,0,12).getDate();
    let cells = wdn.map(w=>`<div class="wdh">${esc(w)}</div>`).join("") + "<div class='md out'></div>".repeat(startW);
    for (let d=1; d<=nd; d++){ const iso = `${y}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; const dt = new Date(iso+"T12:00:00");
      const sd = byDate[iso]; const off = S.off.includes(dt.getDay());
      const na = Object.entries(S.unavail).filter(([n,ds])=>ds.includes(iso)).map(([n])=>n);
      cells += `<div class="md ${sd?"shoot":""} ${off?"off":""} ${na.length?"na":""}"><span class="dn">${d}</span>${sd?`<span class="sd">G${sd.i+1} · ${eighths(sd.e8)}</span><span class="sl">${esc([...new Set(sd.ids.filter(isScene).map(id=>A.by[id].site))].join(", "))}</span>`:""}${na.length?`<span class="sl" style="color:var(--warn)">${esc(na.join(", "))} assente</span>`:""}</div>`; }
    return `<div class="month"><h4>${esc(mm.toLocaleDateString({it:"it-IT",en:"en-GB",de:"de-DE",uk:"uk-UA"}[LANG],{month:"long",year:"numeric"}))}</h4><div class="mgrid">${cells}</div></div>`;
  }).join("");
  return `<div class="wrap"><div class="head"><div><h2>${T("Calendario")}</h2><p class="note">Riprese dal ${esc(fmtDate(D[0].date,{day:"numeric",month:"long"}))} al ${esc(fmtDate(D[D.length-1].date,{day:"numeric",month:"long",year:"numeric"}))}. Il calendario segue le strisce. Dopo aver cambiato il piano, sincronizza di nuovo Google Calendar o riscarica il file .ics.</p></div>
    <div class="row"><button class="btn" data-exp="cal:ics">Scarica .ics (Apple Calendar)</button><button class="btn primary" data-exp="cal:google">Sincronizza con Google Calendar</button></div></div><div class="months">${html}</div></div>`;
}
function ics(){
  const D = days(); const stamp = new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
  const ev = D.map(d => { const ds = d.date.replace(/-/g,""); const sc = d.ids.filter(isScene).map(id=>A.by[id]);
    return ["BEGIN:VEVENT",`UID:abisso-board-${ds}-${d.i+1}@abissostudio.it`,`DTSTAMP:${stamp}`,`DTSTART;TZID=Europe/Rome:${ds}T${S.call.replace(":","")}00`,`DURATION:PT11H`,
      `SUMMARY:${S.script.title} · Giornata ${d.i+1}/${D.length}`,`LOCATION:${[...new Set(sc.map(s=>s.site))].join(" / ")}`,
      `DESCRIPTION:Scene ${sc.map(s=>s.n).join(", ")} · ${eighths(d.e8)} pag. · cast ${[...new Set(sc.flatMap(s=>s.cast))].join(", ")}`,"END:VEVENT"].join("\r\n"); });
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Abisso Studio//Abisso Board//IT",`X-WR-CALNAME:${S.script.title} – piano`,...ev,"END:VCALENDAR"].join("\r\n");
}

/* ---------- DOOD ---------- */
function dood(){
  const D = days();
  return A.castIds.map(n => {
    const work = D.map(d => d.ids.some(id => A.by[id].cast.includes(n)));
    const f = work.indexOf(true), l = work.lastIndexOf(true);
    const codes = D.map((d,i) => { const un = (S.unavail[n]||[]).includes(d.date);
      if (work[i]) return f===l ? "SWF" : i===f ? "SW" : i===l ? "WF" : "W";
      if (i>f && i<l) return un ? "X" : "H"; return un ? "X" : ""; });
    return {n, codes, w: work.filter(Boolean).length, h: codes.filter(c=>c==="H").length, span: f<0?0:l-f+1, f, l};
  });
}
function vDood(){
  const D = days(); const rows = dood();
  return `<div class="wrap"><div class="head"><div><h2>Day out of Days</h2><p class="note">Per ogni attore: SW primo giorno, W lavora, H in attesa pagata, WF ultimo giorno, SWF un giorno solo, X non disponibile. È la base per i contratti del cast.</p></div></div>
  <div class="tbl dood"><table><thead><tr><th>Cast</th>${D.map(d=>`<th>${d.i+1}<br><span style="font-weight:400">${esc(fmtDate(d.date,{day:"numeric",month:"numeric"}))}</span></th>`).join("")}<th>Lavoro</th><th>Attesa</th><th>Totale</th><th>Inizio</th><th>Fine</th></tr></thead>
  <tbody>${rows.map((r,i)=>`<tr><td><b>${i+1}.</b> ${esc(r.n)}</td>${r.codes.map(c=>`<td class="${c}">${c}</td>`).join("")}<td>${r.w}</td><td>${r.h}</td><td>${r.span}</td><td>${r.f<0?"—":esc(fmtDate(D[r.f].date,{day:"numeric",month:"short"}))}</td><td>${r.l<0?"—":esc(fmtDate(D[r.l].date,{day:"numeric",month:"short"}))}</td></tr>`).join("")}</tbody></table></div></div>`;
}

/* ---------- report ---------- */
function vReport(){
  const D = days(); const dayOf = id => D.find(d=>d.ids.includes(id));
  const tabs = [["rep","Reparti"],["cast","Personaggi"],["loc","Location"],["rev","Revisioni"],["exp","Esportazioni"]];
  let body = "";
  if (S.rtab==="rep"){
    body = `<div class="grid2">` + activeCats().filter(c=>c.k!=="cast").map(c => {
      const m = new Map(); A.scenes.forEach(s => (tagsOf(s.id)[c.k]||[]).forEach(it => { const k = it.t.toLowerCase(); if (!m.has(k)) m.set(k,{t:it.t,sc:[],d:new Set()}); const e = m.get(k); e.sc.push(s.n); const d = dayOf(s.id); if (d) e.d.add(d.i+1); }));
      if (!m.size) return "";
      return `<div class="tbl"><table><thead><tr><th><span class="dot" style="--c:${c.c};display:inline-block;margin-right:6px"></span>${esc(c.l)}</th><th>Scene</th><th>Giornate</th></tr></thead><tbody>${[...m.values()].map(e=>`<tr><td>${esc(e.t)}</td><td>${e.sc.join(", ")}</td><td>${[...e.d].sort((a,b)=>a-b).join(", ")}</td></tr>`).join("")}</tbody></table></div>`;
    }).join("") + `</div>`;
  } else if (S.rtab==="cast"){
    body = `<div class="tbl"><table><thead><tr><th>ID</th><th>Personaggio</th><th class="num">Scene</th><th class="num">Battute</th><th class="num">Pagine</th><th>Elenco scene</th><th>Note</th></tr></thead><tbody>${A.castIds.map((n,i)=>{ const sc = A.scenes.filter(s=>s.cast.includes(n));
      const lines = A.scenes.reduce((a,s)=>a+s.b.filter(b=>b[0]==="c"&&cueName(b[1])===n).length,0);
      const minor = sc.some(s=>(tagsOf(s.id).minor||[]).some(x=>x.t.toLowerCase().includes(n.toLowerCase())));
      return `<tr><td>${i+1}</td><td><b>${esc(n)}</b></td><td class="num">${sc.length}</td><td class="num">${lines}</td><td class="num">${eighths(sc.reduce((a,s)=>a+s.e8,0))}</td><td>${sc.map(s=>s.n).join(", ")}</td><td>${minor?`<span class="pill warn">minore</span>`:""}</td></tr>`; }).join("")}</tbody></table></div>`;
  } else if (S.rtab==="loc"){
    const per = {}; A.scenes.forEach(s => { const p = per[s.site] = per[s.site] || {site:s.site, sets:new Set(), sc:[], e8:0, dn:new Set(), d:new Set()}; p.sets.add(s.loc); p.sc.push(s.n); p.e8+=s.e8; p.dn.add(s.dn==="N"?"Notte":"Giorno"); const d = dayOf(s.id); if (d) p.d.add(d.i+1); });
    body = `<div class="tbl"><table><thead><tr><th>Location</th><th>Set</th><th>Luce</th><th class="num">Pagine</th><th>Scene</th><th>Giornate</th><th>Permessi</th></tr></thead><tbody>${Object.values(per).sort((a,b)=>b.e8-a.e8).map(p=>{ const perm = A.scenes.filter(s=>s.site===p.site).flatMap(s=>(tagsOf(s.id).perm||[]).map(x=>x.t));
      return `<tr><td><b>${esc(p.site)}</b></td><td>${esc([...p.sets].join(" · "))}</td><td>${[...p.dn].join(", ")}</td><td class="num">${eighths(p.e8)}</td><td>${p.sc.join(", ")}</td><td>${[...p.d].sort((a,b)=>a-b).join(", ")}</td><td>${esc(perm.join("; "))||"—"}</td></tr>`; }).join("")}</tbody></table></div>`;
  } else if (S.rtab==="rev"){
    const rv = S.script.revision || {name:"—", color:"#ffffff", date:new Date().toISOString().slice(0,10), prev:"—"};
    body = `<div class="box" style="max-width:760px"><div class="row"><span class="rev-dot" style="background:${esc(rv.color)}"></span><b>Revisione ${esc(rv.name)}</b><span class="muted">${esc(fmtDate(rv.date,{day:"numeric",month:"long",year:"numeric"}))} · rispetto alla ${esc(rv.prev)}</span></div>
      <p class="note">Il Typewriter tiene un identificativo fisso per ogni scena e un'impronta del testo. Quando il copione cambia, Abisso Board confronta le impronte: le scene uguali tengono lo spoglio, quelle cambiate vengono segnalate, quelle nuove prendono un numero A/B senza rinumerare le altre.</p>
      <div class="tbl"><table><thead><tr><th>Scena</th><th>Stato</th><th>Location</th><th>Giornata</th></tr></thead><tbody>${A.scenes.filter(s=>s.rev).map(s=>{ const d = dayOf(s.id); return `<tr><td><b>${esc(s.n)}</b></td><td><span class="pill rev">${s.rev==="new"?"nuova":"modificata"}</span></td><td>${esc(s.loc)}</td><td>${d?d.i+1:"—"}</td></tr>`; }).join("")}</tbody></table></div>
      <p class="note">Colori di revisione nell'ordine standard: bianca, blu, rosa, gialla, verde, oro, poi doppie.</p></div>`;
  } else {
    const ex = [
      ["Fogli di spoglio","Una pagina per scena con tutte le categorie, come Movie Magic.",[["breakdown:pdf","PDF"]]],
      ["Stripboard","Il piano a strisce colorate, in orizzontale.",[["strip:pdf","PDF"]]],
      ["Piano di lavorazione","Giornata per giornata con scene, cast ed elementi.",[["plan:pdf","PDF"],["plan:csv","CSV"]]],
      ["Calendario","Una data per giornata, per Apple Calendar o Google Calendar.",[["cal:ics",".ics"],["cal:google","Google Calendar"]]],
      ["Day out of Days","Lavoro e attese di ogni attore, per i contratti.",[["dood:pdf","PDF"],["dood:csv","CSV"]]],
      ["Report per reparto","Un elenco per ogni categoria, con scene e giornate.",[["dept:pdf","PDF"],["dept:csv","CSV"]]],
      ["Cast e personaggi","Scene, battute e pagine per personaggio.",[["cast:pdf","PDF"],["cast:csv","CSV"]]],
      ["Location","Set, luce, pagine e permessi per location.",[["loc:pdf","PDF"],["loc:csv","CSV"]]],
      ["Revisioni","Scene nuove e modificate, con la giornata in cui cadono.",[["rev:pdf","PDF"]]],
      ["Ordine del giorno","Il foglio della giornata scelta nella sezione Ordine del giorno.",[["call:pdf","PDF"]]],
      ["Piano trasporti","Le corse della giornata pronte per Set Transport.",[["st:js","Set Transport"]]],
      ["Tabella completa","Tutto lo spoglio in una tabella, per altri programmi.",[["full:csv","CSV"]]]];
    body = `<p class="note" style="margin:0 0 12px">I PDF si aprono in una finestra di stampa: scegli «Salva come PDF». I CSV si aprono con Excel, Numbers o Google Sheets.</p><div class="cards">${ex.map(([t,d,f])=>`<div class="card"><b>${esc(t)}</b><p>${esc(d)}</p><div class="fmt">${f.map(([k,l])=>`<button class="btn" data-exp="${k}">${esc(l)}</button>`).join("")}</div></div>`).join("")}</div>`;
  }
  return `<div class="wrap"><div class="head"><h2>${T("Report")}</h2><div class="row">${tabs.map(([k,l])=>`<button class="btn ${S.rtab===k?"primary":""}" data-rtab="${k}">${esc(T(l))}</button>`).join("")}</div></div>${body}</div>`;
}

/* ---------- ordine del giorno ---------- */
const hm = m => `${String(Math.floor(((m%1440)+1440)%1440/60)).padStart(2,"0")}:${String(((m%60)+60)%60).padStart(2,"0")}`;
const toMin = s => { const [h,m] = s.split(":").map(Number); return h*60+m; };
function callData(di){
  const D = days(); const d = D[Math.min(di, D.length-1)]; const sc = d.ids.filter(isScene).map(id=>A.by[id]); const notes = d.ids.filter(id=>A.by[id].banner).map(id=>A.by[id].text);
  const call = toMin(S.call); const cast = [...new Set(sc.flatMap(s=>s.cast))].sort((a,b)=>cid(a)-cid(b));
  const firstOf = n => sc.findIndex(s=>s.cast.includes(n));
  const people = cast.map(n => { const minor = sc.some(s=>(tagsOf(s.id).minor||[]).some(x=>x.t.toLowerCase().includes(n.toLowerCase())));
    const set = call + firstOf(n)*90; const mua = set - (n==="BEPPE"?75:45); const late = minor ? Math.max(mua, 8*60) : mua;
    return {n, id:cid(n), mua: late, pick: late - 25, set: Math.max(set, late+45), minor, sc: sc.filter(s=>s.cast.includes(n)).map(s=>s.n)}; });
  const groups = {}; people.forEach(p => { (groups[p.mua] = groups[p.mua] || []).push(p); });
  const tr = TRANSPORT_DEFAULT;
  const corse = Object.entries(groups).sort((a,b)=>a[0]-b[0]).map(([m, ps], i) => ({from: tr.base, to: tr.camp, arr: hm(+m), pax: ps.map(p=>p.n), driver: tr.drivers[i%tr.drivers.length][0], vehicle: tr.drivers[i%tr.drivers.length][1], note: `Partenza ${hm(+m-25)}.`}));
  corse.unshift({from: tr.base, to: tr.camp, arr: hm(call-60), pax:["Troupe (navetta)"], driver: tr.drivers[0][0], vehicle: tr.drivers[0][1], note:`Partenza ${hm(call-80)}. Colazione al camp base.`});
  corse.sort((a,b)=>a.arr.localeCompare(b.arr));
  const sites = [...new Set(sc.map(s=>s.site))];
  if (sites.length > 1) corse.push({from:`Loc 1 – ${sites[0]}`, to:`Loc 2 – ${sites[1]}`, fixFirst: hm(call + Math.round(sc.filter(s=>s.site===sites[0]).reduce((a,s)=>a+s.e8,0)*20)), pax:["Troupe (navetta)"], driver: tr.drivers[1][0], vehicle: tr.drivers[1][1], note:"ORARIO DA DEFINIRE – dopo il wrap della prima location (segnaposto)."});
  const need = {}; sc.forEach(s => Object.entries(tagsOf(s.id)).forEach(([k,arr]) => arr.forEach(it => { (need[k] = need[k] || new Set()).add(it.t); })));
  return {D, d, sc, people, corse, need, sites, notes};
}
function vOdg(){
  const D = days(); const di = Math.min(S.csDay||0, D.length-1); const c = callData(di); const d = c.d;
  const unav = c.sc.flatMap(s => conflicts(s.id, d.date));
  return `<div class="wrap"><div class="head"><div><h2>${T("Ordine del giorno")}</h2><p class="note">Generato dal piano e dallo spoglio. Gli orari di trucco e pickup partono dalla convocazione e dall'ordine delle scene: li correggi a mano, e le corse si aggiornano.</p></div>
    <div class="row"><select class="sm" id="csDay" aria-label="Giornata">${D.map((x,i)=>`<option value="${i}" ${i===di?"selected":""}>${T("Giornata")} ${i+1} · ${esc(fmtDate(x.date))}</option>`).join("")}</select>
    <button class="btn" data-exp="call:pdf">PDF</button><button class="btn primary" data-act="toST">Manda le corse a Set Transport</button></div></div>
  <div class="cs">
    <div class="cs-top"><div><div class="muted" style="font-size:12px">ABISSO STUDIO S.R.L. presenta</div><div class="big">${esc(S.script.title.toUpperCase())}</div>
      <div class="kv" style="margin-top:8px"><span>Giornata</span><b>${d.i+1} / ${D.length}</b><span>Data</span><b>${esc(fmtDate(d.date,{weekday:"long",day:"numeric",month:"long",year:"numeric"}))}</b><span>Revisione copione</span><b>${esc((S.script.revision||{}).name||'—')}</b></div></div>
      <div><div class="muted" style="font-size:12px">${T("Convocazione generale")}</div><input type="time" id="csCall" value="${S.call}" aria-label="${T("Convocazione generale")}" class="edit-only"><div class="call" style="display:none">${S.call}</div>
        <div class="kv" style="margin-top:8px"><span>Alba / tramonto</span><b>06:41 / 18:07 <small class="muted">(esempio)</small></b><span>Meteo</span><b class="muted">dalla location, 3 giorni prima</b></div></div>
      <div><div class="kv"><span>Location</span><b>${esc(c.sites.join(" → "))}</b><span>Camp base</span><b>${esc(TRANSPORT_DEFAULT.camp)}</b><span>Ospedale</span><b class="muted">dalla scheda location</b><span>Pagine</span><b>${eighths(d.e8)}</b></div></div></div>
    ${c.notes.length ? `<div><h3 style="margin-bottom:8px">Note del piano</h3><ul class="warnlist">${c.notes.map(n=>`<li class="ok">${esc(n)}</li>`).join("")}</ul></div>` : ""}
    ${unav.length ? `<ul class="warnlist"><li>${esc([...new Set(unav)].join(", "))} risulta non disponibile in questa data.</li></ul>` : ""}
    <div><h3 style="margin-bottom:8px">Scene</h3><div class="tbl"><table><thead><tr><th>Sc.</th><th>Set</th><th>INT/EST</th><th>G/N</th><th class="num">Pag.</th><th>Cast</th></tr></thead><tbody>${c.sc.map(s=>`<tr><td><b>${esc(s.n)}</b></td><td>${esc(s.loc)}${s.manual?`<br><small class="muted">${esc(s.text)}</small>`:""}</td><td>${esc(s.ie)}</td><td>${s.dn}</td><td class="num">${eighths(s.e8)}</td><td>${s.cast.map(cid).sort((a,b)=>a-b).join(", ")}</td></tr>`).join("")}</tbody></table></div></div>
    <div><h3 style="margin-bottom:8px">Cast</h3><div class="tbl"><table><thead><tr><th>ID</th><th>Personaggio</th><th>Pickup</th><th>Trucco</th><th>Sul set</th><th>Scene</th><th></th></tr></thead><tbody>${c.people.map(p=>`<tr><td>${p.id}</td><td><b>${esc(p.n)}</b></td><td class="num">${hm(p.pick)}</td><td class="num">${hm(p.mua)}</td><td class="num">${hm(p.set)}</td><td>${p.sc.join(", ")}</td><td>${p.minor?`<span class="pill warn">minore · tutore</span>`:""}</td></tr>`).join("")}</tbody></table></div></div>
    <div><h3 style="margin-bottom:8px">Necessità dei reparti</h3><div class="grid2">${Object.entries(c.need).filter(([k])=>catOf(k)&&catOf(k).on).map(([k,set])=>`<div><b style="font-size:12px"><span class="dot" style="--c:${catOf(k).c};display:inline-block;margin-right:6px"></span>${esc(catOf(k).l)}</b><div class="note" style="color:var(--ink)">${esc([...set].join(" · "))}</div></div>`).join("")}</div></div>
    <div><h3 style="margin-bottom:8px">${T("Trasporti")}</h3><div class="tbl"><table><thead><tr><th>Da</th><th>A</th><th>Arrivo</th><th>Chi sale</th><th>Autista</th><th>Mezzo</th><th>Note</th></tr></thead><tbody>${c.corse.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td class="num">${esc(r.arr||r.fixFirst+" (partenza)")}</td><td>${esc(r.pax.join(", "))}</td><td>${esc(r.driver)}</td><td>${esc(r.vehicle)}</td><td>${esc(r.note)}</td></tr>`).join("")}</tbody></table></div></div>
  </div></div>`;
}
function stExport(di){
  const c = callData(di); const q = s => `'${String(s).replace(/'/g,"\\'")}'`;
  const rows = c.corse.map(r => `  { from: ${q(r.from)}, to: ${q(r.to)}, ${r.fixFirst?`fixFirst: ${q(r.fixFirst)}`:`arr: ${q(r.arr)}`}, pax: [${r.pax.map(q).join(", ")}],\n    driver: ${q(r.driver)}, vehicle: ${q(r.vehicle)}, note: ${q(r.note)} },`).join("\n");
  return `/* Giornata ${c.d.i+1} · ${c.d.date} · generato da Abisso Board */\nconst CORSE = [\n${rows}\n];`;
}

function parseFountain(txt){
  const out = []; let cur = null; const L = txt.replace(/\r/g,"").split("\n"); let n = 0;
  for (let i=0;i<L.length;i++){ const l = L[i].trim(); if (!l) continue;
    if (/^(INT|EST|EXT|I\/E|INT\.\/EST)[\.\s]/i.test(l) || /^\.[A-Z]/.test(l)){ n++; cur = {id:"f"+n, n:String(n), h:l.replace(/^\./,"").toUpperCase(), b:[]}; out.push(cur); continue; }
    if (!cur) continue;
    if (/^[A-ZÀ-Ý0-9 .'()\-]+$/.test(l) && l.length<40 && /[A-Z]/.test(l) && L[i+1] && L[i+1].trim()){ cur.b.push(["c", l.replace(/^@/,"")]);
      while (L[i+1] && L[i+1].trim()){ i++; const d = L[i].trim(); cur.b.push([/^\(.*\)$/.test(d)?"p":"d", d]); } continue; }
    cur.b.push(["a", l]);
  }
  return out;
}
function parseFDX(xml){
  const doc = new DOMParser().parseFromString(xml, "text/xml"); const out = []; let cur = null; let n = 0;
  const map = {"Action":"a","Character":"c","Dialogue":"d","Parenthetical":"p"};
  doc.querySelectorAll("Content > Paragraph").forEach(p => { const t = p.getAttribute("Type"); const x = [...p.querySelectorAll("Text")].map(e=>e.textContent).join("").trim(); if (!x) return;
    if (t==="Scene Heading"){ n++; cur = {id:"x"+n, n: p.getAttribute("Number") || String(n), h:x.toUpperCase(), b:[]}; out.push(cur); }
    else if (cur && map[t]) cur.b.push([map[t], x]); });
  return out;
}
function catsModal(){
  const rows = () => S.cats.map((c,i)=>`<div class="catrow"><input type="checkbox" data-con="${i}" ${c.on?"checked":""} ${c.fixed?"disabled":""} aria-label="Attiva ${esc(c.l)}"><input type="color" data-ccol="${i}" value="${c.c}" aria-label="Colore"><input type="text" data-cname="${i}" value="${esc(c.l)}" aria-label="Nome"><button class="btn ghost" data-cdel="${i}" ${c.fixed?"disabled":""} aria-label="Elimina">×</button></div>`).join("");
  modal(`<h3>Categorie di questo progetto</h3><p class="note" style="margin:0">Valgono solo per «${esc(S.script.title)}». Spegnere una categoria la nasconde senza perdere gli elementi.</p><div id="catList" style="display:grid;gap:6px">${rows()}</div>
    <div class="row" style="justify-content:space-between"><button class="btn" id="catAdd">+ Nuova categoria</button><button class="btn primary" data-x>Fatto</button></div>`, m => {
    const refresh = () => { $("#catList").innerHTML = rows(); save(); };
    m.addEventListener("change", e => { const t = e.target;
      if (t.dataset.con) S.cats[+t.dataset.con].on = t.checked; if (t.dataset.ccol) S.cats[+t.dataset.ccol].c = t.value; if (t.dataset.cname) S.cats[+t.dataset.cname].l = t.value.trim() || S.cats[+t.dataset.cname].l; save(); });
    m.addEventListener("click", e => { const b = e.target.closest("[data-cdel]"); if (b){ S.cats.splice(+b.dataset.cdel,1); refresh(); } });
    $("#catAdd").onclick = () => { S.cats.push({k:"u"+Date.now().toString(36), l:"Nuova categoria", c:"#888888", on:true}); refresh(); };
  });
  const obs = new MutationObserver(() => { if (!$("#layer").children.length){ obs.disconnect(); render(); } }); obs.observe($("#layer"), {childList:true});
}

function rowModal(id){
  const x = {kind:"banner", text:"", color:"#ffe08a", n:"", desc:"", ie:"EST", loc:"", dn:"G", e8:2, cast:[], ...(id ? S.extra[id] : {})};
  const D = days(); const curDay = id ? D.findIndex(d=>d.ids.includes(id)) : D.length-1;
  const COLS = ["#ffe08a","#bfe3c8","#c9d8ff","#ffd0b5","#e3e3e8"];
  modal(`<h3>${id?"Modifica riga":"Aggiungi una riga allo stripboard"}</h3>
    <div class="row"><label class="row" style="gap:4px"><input type="radio" name="rk" value="banner" ${x.kind==="banner"?"checked":""}> Nota o banner</label>
      <label class="row" style="gap:4px"><input type="radio" name="rk" value="scene" ${x.kind==="scene"?"checked":""}> Ripresa fuori copione</label></div>
    <div id="rkB" class="box" ${x.kind==="banner"?"":"hidden"}>
      <label>Testo<input id="rbText" value="${esc(x.text)}" placeholder="es. Spostamento a Lago - Riva · 45 min"></label>
      <div><span class="muted" style="font-size:12px">Colore</span><div class="row" style="margin-top:4px">${COLS.map(c=>`<label class="row" style="gap:3px"><input type="radio" name="rbc" value="${c}" ${x.color===c?"checked":""}><span class="dot" style="--c:${c};width:16px;height:16px;border:1px solid var(--line)"></span></label>`).join("")}</div></div>
      <div class="tags">${["Spostamento troupe","Pranzo","Seconda unità","Preparazione notturna","Giornata di prove"].map(t=>`<button class="tag" style="border:0;padding-right:8px" data-quick="${t}">${t}</button>`).join("")}</div>
    </div>
    <div id="rkS" class="box" ${x.kind==="scene"?"":"hidden"}>
      <div class="row"><label style="flex:1">Numero<input id="rsN" value="${esc(x.n)}" placeholder="es. X1 o 7B"></label><label style="flex:1">INT/EST<select id="rsIE">${["INT","EST","I/E"].map(v=>`<option ${x.ie===v?"selected":""}>${v}</option>`).join("")}</select></label><label style="flex:1">Luce<select id="rsDN"><option value="G" ${x.dn==="G"?"selected":""}>Giorno</option><option value="N" ${x.dn==="N"?"selected":""}>Notte</option></select></label></div>
      <label>Location<input id="rsLoc" value="${esc(x.loc)}" placeholder="es. DIGA - CORONAMENTO" list="locList"><datalist id="locList">${[...new Set(A.scenes.map(s=>s.loc))].map(l=>`<option value="${esc(l)}">`).join("")}</datalist></label>
      <label>Cosa si gira<input id="rsDesc" value="${esc(x.desc)}" placeholder="es. inserti mani sulla ruota, riprese aeree con drone"></label>
      <label>Durata in ottavi di pagina<input id="rsE8" type="number" min="1" max="64" value="${x.e8}"></label>
      <div><span class="muted" style="font-size:12px">Cast</span><div class="wd" style="margin-top:4px">${A.castIds.map(n=>`<label><input type="checkbox" data-rc="${esc(n)}" ${x.cast.includes(n)?"checked":""}>${esc(n)}</label>`).join("")}</div></div>
    </div>
    <label class="muted" style="font-size:12px;display:grid;gap:4px">In quale giornata<select id="rDay" class="sm">${D.map((d,i)=>`<option value="${i}" ${i===curDay?"selected":""}>${T("Giornata")} ${i+1} · ${esc(fmtDate(d.date))}</option>`).join("")}</select></label>
    <div class="row" style="justify-content:space-between">${id?`<button class="btn" id="rDel" style="color:var(--bad)">Elimina riga</button>`:"<span></span>"}<span class="row"><button class="btn" data-x>Annulla</button><button class="btn primary" id="rOk">${id?"Salva":"Aggiungi"}</button></span></div>`, m => {
    const kind = () => m.querySelector('input[name="rk"]:checked').value;
    m.querySelectorAll('input[name="rk"]').forEach(r => r.onchange = () => { $("#rkB").hidden = kind()!=="banner"; $("#rkS").hidden = kind()!=="scene"; });
    m.querySelectorAll("[data-quick]").forEach(b => b.onclick = () => { $("#rbText").value = b.dataset.quick; });
    if (id) $("#rDel").onclick = () => { delete S.extra[id]; S.order = S.order.filter(t=>t!==id); delete S.tags[id]; save(); closeModal(); analyse(); render(); toast("Riga eliminata."); };
    $("#rOk").onclick = () => {
      const k = kind(); let nx;
      if (k==="banner"){ const t = $("#rbText").value.trim(); if (!t){ toast("Scrivi il testo della nota."); return; }
        nx = {kind:"banner", text:t, color:(m.querySelector('input[name="rbc"]:checked')||{}).value || COLS[0]}; }
      else { const loc = $("#rsLoc").value.trim().toUpperCase(); if (!loc){ toast("Indica la location."); return; }
        const used = Object.values(S.extra).filter(e=>e.kind==="scene").length;
        nx = {kind:"scene", n:$("#rsN").value.trim() || "X"+(used+(id?0:1)), ie:$("#rsIE").value, dn:$("#rsDN").value, loc, desc:$("#rsDesc").value.trim() || "ripresa aggiuntiva",
          e8: Math.max(1, Math.min(64, +$("#rsE8").value || 1)), cast: m.querySelectorAll("[data-rc]:checked").length ? [...m.querySelectorAll("[data-rc]:checked")].map(c=>c.dataset.rc) : []}; }
      const rid = id || ("x"+Date.now().toString(36));
      S.extra[rid] = nx;
      // posizione: in fondo alla giornata scelta
      S.order = S.order.filter(t=>t!==rid);
      const day = +$("#rDay").value; let seen = 0, at = S.order.length;
      for (let i=0;i<S.order.length;i++){ if (S.order[i]==="|"){ if (seen===day){ at = i; break; } seen++; } }
      S.order.splice(at, 0, rid);
      save(); closeModal(); analyse(); render(); toast(id ? "Riga aggiornata." : "Riga aggiunta: trascinala dove vuoi.");
    };
  });
}

/* ---------- eventi ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("button,[data-sel]"); if (!b) return;
  if (b.dataset.v){ S.view = b.dataset.v; save(); render(); $("#view").scrollTop = 0; return; }
  if (b.dataset.sel){ S.sel = b.dataset.sel; save(); render(); return; }
  if (b.dataset.mc){ showSelMenu(b.dataset.mc, S.sel, b.getBoundingClientRect()); return; }
  if (b.dataset.rm){ const [k,ix] = b.dataset.rm.split("|"); tagsOf(S.sel)[k].splice(+ix,1); save(); afterSpoglio.noScroll = true; const top = $("#desk").scrollTop; render(); $("#desk").scrollTop = top; return; }
  if (b.dataset.rtab){ S.rtab = b.dataset.rtab; save(); render(); return; }
  if (b.dataset.exp){ toast(`L'esportazione ${b.dataset.exp} arriva con il prossimo aggiornamento. Ora sono pronte CSV e .ics.`, 3400); return; }
  if (b.dataset.edx){ rowModal(b.dataset.edx); return; }
  if (b.dataset.delbreak !== undefined){ const i = tokIndex("|"+b.dataset.delbreak); if (i < S.order.length) S.order.splice(i,1); save(); render(); return; }
  if (b.dataset.unrm){ const [n,d] = b.dataset.unrm.split("|"); S.unavail[n] = (S.unavail[n]||[]).filter(x=>x!==d); save(); render(); return; }
  const a = b.dataset.act; if (!a) return;
  if (a==="rules"){ ruleBreakdown(); save(); render(); toast("Spoglio automatico rifatto. Gli elementi aggiunti a mano e dall'AI sono rimasti."); }
  else if (a==="ai"){ const n = aiImport(); save(); render(); toast(n ? `${n} elementi importati dall'analisi AI del Typewriter.` : "L'analisi AI è già importata."); }
  else if (a==="cats") catsModal();
  else if (a==="opt"){ optimise(); save(); render(); toast("Piano ottimizzato. Ora puoi rifinirlo trascinando."); }
  else if (a==="addrow") rowModal(null);
  else if (a==="addbreak"){ S.order.push("|"); save(); render(); }
  else if (a==="unadd"){ const n = $("#unWho").value, d = $("#unDate").value; if (!d){ toast("Scegli prima il giorno."); return; } (S.unavail[n] = S.unavail[n]||[]); if (!S.unavail[n].includes(d)) S.unavail[n].push(d); save(); render(); }
  else if (a==="ics"){ const t = ics(); modal(`<h3>Calendario del piano</h3><p class="note" style="margin:0">Nella versione finale scarichi il file .ics per Apple Calendar oppure ti abboni a un link che si aggiorna da solo quando cambi il piano. Qui puoi vedere e copiare il contenuto.</p><pre class="code">${esc(t)}</pre><div class="row" style="justify-content:flex-end"><button class="btn" id="cp">Copia</button><button class="btn primary" data-x>Chiudi</button></div>`, m => { m.querySelector("#cp").onclick = ev => copy(t, ev.target); }); }
  else if (a==="toST"){ const t = stExport(S.csDay||0); modal(`<h3>Corse per Set Transport</h3><p class="note" style="margin:0">Stesso formato del tuo script di inserimento automatico, con i nomi di Luoghi, Troupe, Autisti e Mezzi. Nella versione finale le corse arrivano in Set Transport direttamente, senza console.</p><pre class="code">${esc(t)}</pre><div class="row" style="justify-content:flex-end"><button class="btn" id="cp">Copia</button><button class="btn primary" data-x>Chiudi</button></div>`, m => { m.querySelector("#cp").onclick = ev => copy(t, ev.target); }); }
});
document.addEventListener("keydown", e => {
  const i = e.target.closest && e.target.closest("[data-add]"); if (!i || e.key!=="Enter") return;
  e.preventDefault(); const v = i.value.trim(); if (!v) return; addTag(S.sel, i.dataset.add, v, "m"); save();
  afterSpoglio.noScroll = true; const top = $("#desk").scrollTop; const k = i.dataset.add; render(); $("#desk").scrollTop = top; const ni = $(`[data-add="${k}"]`); ni && ni.focus();
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id==="optStart"){ S.start = t.value || S.start; save(); render(); }
  else if (t.id==="optTarget"){ S.target = +t.value; save(); render(); }
  else if (t.dataset.off !== undefined){ const d = +t.dataset.off; S.off = t.checked ? [...new Set([...S.off,d])] : S.off.filter(x=>x!==d); if (S.off.length>=7) S.off = [0]; save(); render(); }
  else if (t.id==="csDay"){ S.csDay = +t.value; save(); render(); }
  else if (t.id==="csCall"){ S.call = t.value || S.call; save(); render(); }
  else if (t.id==="roleSel"){ if (role()!=="admin" && S.view==="squadra") S.view = "spoglio"; render(); }
  else if (t.id==="langSel"){ LANG = t.value; document.documentElement.lang = LANG; render(); }
});
