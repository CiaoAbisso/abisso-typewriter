/* ================= Abisso Board · esportazioni (PDF, CSV, .ics, Google Calendar) ================= */
const PRINT_CSS = `
@page{size:A4 portrait;margin:12mm}
@page land{size:A4 landscape;margin:10mm}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Helvetica,Arial,sans-serif;font-size:10px;color:#000;margin:0;background:#fff}
.land{page:land}
h1{font-size:16px;margin:0}
h2{font-size:12px;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.06em}
.mono{font-family:"Courier Prime","Courier New",monospace}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #ff0000;padding-bottom:6px;margin-bottom:10px;gap:12px}
.hd small{color:#555;font-size:9px;display:block}
.brand{font-family:"Courier Prime","Courier New",monospace;font-size:10px;letter-spacing:.08em}
.brand b{color:#d90000}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #bbb;padding:3px 5px;text-align:left;vertical-align:top}
th{background:#f1f1f3;font-size:8px;text-transform:uppercase;letter-spacing:.05em}
td.c,th.c{text-align:center}
tr{break-inside:avoid}
.sheet{break-after:page;display:grid;gap:8px}
.sheet:last-child{break-after:auto}
.meta{display:grid;grid-template-columns:repeat(6,1fr);border:1px solid #000}
.meta div{border-right:1px solid #000;padding:4px 6px}
.meta div:last-child{border-right:0}
.meta small{display:block;font-size:7px;text-transform:uppercase;color:#555;letter-spacing:.05em}
.meta b{font-size:12px}
.set{border:1px solid #000;border-top:0;padding:5px 6px}
.cats{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cat{border:1px solid #000;min-height:52px;break-inside:avoid}
.cat .t{padding:2px 6px;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#000}
.cat ul{margin:0;padding:4px 6px 5px 18px}
.cat li{margin:1px 0}
.strip{display:grid;grid-template-columns:34px 56px minmax(0,1.6fr) 42px minmax(0,1fr) minmax(0,1.6fr);gap:6px;padding:3px 6px;border-bottom:1px solid #999;align-items:center;break-inside:avoid}
.strip .n{font-family:"Courier Prime",monospace;font-weight:700}
.daybar{background:#000;color:#fff;padding:4px 6px;font-weight:700;font-size:9px;letter-spacing:.05em;break-inside:avoid}
.banner{padding:3px 6px;font-weight:700;border-bottom:1px dashed #999}
.dood td{text-align:center;font-family:"Courier Prime",monospace}
.dood td:first-child{text-align:left;font-family:Helvetica,Arial,sans-serif;white-space:nowrap}
.W{background:#ffe1e1}.SW,.WF,.SWF{background:#ff0000;color:#fff;font-weight:700}.X{color:#d90000}.H{color:#666}
.day{margin-bottom:10px;break-inside:avoid-page}
.foot{margin-top:10px;color:#666;font-size:8px}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:0}
.cs-top{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:10px;border-bottom:2px solid #ff0000;padding-bottom:8px;margin-bottom:8px}
.big{font-family:"Courier Prime",monospace;font-size:20px;font-weight:700}
.call{font-family:"Courier Prime",monospace;font-size:26px;font-weight:700;color:#d90000}
.kv{display:grid;grid-template-columns:auto 1fr;gap:1px 8px}
.kv span{color:#555}
.need{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px}
`;
function sceneDesc(s){ if (s.manual) return s.text||""; const a = (s.b||[]).find(b=>b[0]==="a"); const t = a ? a[1] : ""; return t.length > 110 ? t.slice(0,107).trim() + "…" : t; }
function catLabel(c){ return typeof trUI==="function" ? trUI(c.l) : c.l; }
function docHead(kind, extra){
  const rv = S.script.revision;
  return `<div class="hd"><div><div class="brand"><b>ABISSO</b> Board · Abisso Studio S.r.l.</div><h1>${esc(S.script.title)}</h1><small>${esc(kind)}${extra?" · "+esc(extra):""}</small></div>
    <div style="text-align:right"><small>${rv ? esc(L("Revisione")+" "+rv.name) + " · " : ""}${esc(L("Stampato il"))} ${esc(new Date().toLocaleDateString(LOC(),{day:"numeric",month:"long",year:"numeric"}))}</small></div></div>`;
}
const LOC = () => ({it:"it-IT",en:"en-GB",de:"de-DE",uk:"uk-UA"}[LANG]||"it-IT");
const L = k => (typeof trUI==="function" ? trUI(k) : k);
function printDoc(title, html){
  const w = window.open("", "_blank");
  if (!w){ toast(L("Il browser ha bloccato la finestra di stampa: consenti i popup per questo sito e riprova."), 4500); return; }
  w.document.open();
  w.document.write(`<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><title>${esc(title)}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=Unbounded:wght@500;600&family=Courier+Prime:wght@400;700&display=swap"><style>${PRINT_CSS}</style></head><body>${html}
    <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},350)};<\/script></body></html>`);
  w.document.close();
}
const dayOfId = (D, id) => D.find(d => d.ids.includes(id));
const castIds = s => s.cast.map(cid).filter(Boolean).sort((a,b)=>a-b).join(", ");
const stripBg = s => s.dn==="N" ? (s.ie!=="INT" ? "#000;color:#fff" : "#6b6b70;color:#fff") : (s.ie!=="INT" ? "#ffa3a3" : "#fff");

/* ---------- PDF ---------- */
function pdfBreakdown(){
  const D = days();
  const sheets = [...A.scenes, ...A.extras.filter(x=>!x.banner)].map(s => {
    const d = dayOfId(D, s.id); const tg = tagsOf(s.id);
    const boxes = S.cats.filter(c=>c.on).map(c => {
      const items = c.k==="cast" ? s.cast.map(n => `${cid(n)}. ${n}`) : (tg[c.k]||[]).map(x=>x.t);
      return `<div class="cat"><div class="t" style="background:${c.c}33;border-bottom:2px solid ${c.c}">${esc(catLabel(c))}</div>${items.length ? `<ul>${items.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>` : ""}</div>`;
    }).join("");
    return `<section class="sheet">${docHead(L("Foglio di spoglio"))}
      <div class="meta"><div><small>${L("Scena")}</small><b class="mono">${esc(s.n)}</b></div><div><small>${L("Pagina")}</small><b>${esc(s.page)}</b></div><div><small>INT/EST</small><b>${esc(s.ie)}</b></div>
        <div><small>${L("Luce")}</small><b>${s.dn==="N"?L("Notte"):L("Giorno")}</b></div><div><small>${L("Ottavi")}</small><b>${eighths(s.e8)}</b></div><div><small>${L("Giornata")}</small><b>${d ? (d.i+1) + " · " + esc(fmtDate(d.date,{day:"numeric",month:"short"})) : "—"}</b></div></div>
      <div class="set"><b>${esc(s.loc)}</b> — ${esc(s.time)}${s.rev ? ` · <b style="color:#3b6fd8">${s.rev==="new"?L("nuova"):L("modificata")}</b>` : ""}<br>${esc(sceneDesc(s))}</div>
      <div class="cats">${boxes}</div></section>`;
  }).join("");
  printDoc(fileBase() + " - " + L("Fogli di spoglio"), sheets);
}
function pdfStrip(){
  const D = days(); let rows = "";
  D.forEach(d => {
    d.ids.forEach(id => { const s = A.by[id];
      if (s.banner){ rows += `<div class="banner" style="background:${esc(s.color)}">${esc(s.text)}</div>`; return; }
      rows += `<div class="strip" style="background:${stripBg(s)}"><span class="n">${esc(s.n)}</span><span>${esc(s.ie)} · ${s.dn==="N"?"N":"G"}</span><span><b>${esc(s.loc)}</b> ${esc(sceneDesc(s))}</span><span>${eighths(s.e8)}</span><span class="mono">${castIds(s)||"—"}</span><span>${esc(s.time)} · p. ${esc(s.page)}</span></div>`; });
    rows += `<div class="daybar">${L("FINE GIORNATA")} ${d.i+1} / ${D.length} · ${esc(fmtDate(d.date,{weekday:"long",day:"numeric",month:"long"}))} · ${eighths(d.e8)} ${L("pag.")}</div>`;
  });
  const legend = A.castIds.map((n,i)=>`${i+1}. ${esc(n)}`).join(" · ");
  printDoc(fileBase() + " - Stripboard", `<div class="land">${docHead("Stripboard", D.length + " " + L("giornate"))}${rows}<p class="foot">${L("Cast")}: ${legend}</p></div>`);
}
function pdfPlan(){
  const D = days();
  const html = D.map(d => {
    const sc = d.ids.map(id=>A.by[id]);
    return `<div class="day"><h2>${L("Giornata")} ${d.i+1} · ${esc(fmtDate(d.date,{weekday:"long",day:"numeric",month:"long",year:"numeric"}))} · ${eighths(d.e8)} ${L("pag.")}</h2>
      <table><thead><tr><th>${L("Sc.")}</th><th>INT/EST</th><th>${L("Set")}</th><th>G/N</th><th class="c">${L("Pag.")}</th><th>${L("Cast")}</th><th>${L("Elementi")}</th></tr></thead><tbody>
      ${sc.map(s => s.banner ? `<tr><td colspan="7" style="background:${esc(s.color)};font-weight:700">${esc(s.text)}</td></tr>` :
        `<tr><td class="mono"><b>${esc(s.n)}</b></td><td>${esc(s.ie)}</td><td><b>${esc(s.loc)}</b><br>${esc(sceneDesc(s))}</td><td>${s.dn}</td><td class="c">${eighths(s.e8)}</td><td>${castIds(s)}</td>
          <td>${esc(Object.entries(tagsOf(s.id)).filter(([k,v])=>v.length && catOf(k) && catOf(k).on).map(([k,v])=>catLabel(catOf(k))+": "+v.map(x=>x.t).join(", ")).join(" · "))}</td></tr>`).join("")}</tbody></table></div>`;
  }).join("");
  printDoc(fileBase() + " - " + L("Piano di lavorazione"), docHead(L("Piano di lavorazione"), D.length + " " + L("giornate") + " · " + eighths(A.total8) + " " + L("pag.")) + html + `<p class="foot">${L("Cast")}: ${A.castIds.map((n,i)=>`${i+1}. ${esc(n)}`).join(" · ")}</p>`);
}
function pdfDood(){
  const D = days(); const rows = dood();
  printDoc(fileBase() + " - DOOD", `<div class="land">${docHead("Day out of Days")}
    <table class="dood"><thead><tr><th>${L("Cast")}</th>${D.map(d=>`<th class="c">${d.i+1}<br>${esc(fmtDate(d.date,{day:"numeric",month:"numeric"}))}</th>`).join("")}<th>${L("Lavoro")}</th><th>${L("Attesa")}</th><th>${L("Totale")}</th></tr></thead>
    <tbody>${rows.map((r,i)=>`<tr><td><b>${i+1}.</b> ${esc(r.n)}</td>${r.codes.map(c=>`<td class="${c}">${c}</td>`).join("")}<td>${r.w}</td><td>${r.h}</td><td>${r.span}</td></tr>`).join("")}</tbody></table>
    <p class="foot">SW = ${L("primo giorno")} · W = ${L("lavora")} · H = ${L("attesa")} · WF = ${L("ultimo giorno")} · SWF = ${L("un solo giorno")} · X = ${L("non disponibile")}</p></div>`);
}
function deptData(){
  const D = days();
  return S.cats.filter(c=>c.on && c.k!=="cast").map(c => {
    const m = new Map();
    [...A.scenes, ...A.extras.filter(x=>!x.banner)].forEach(s => (tagsOf(s.id)[c.k]||[]).forEach(it => { const k = it.t.toLowerCase(); if (!m.has(k)) m.set(k,{t:it.t,sc:[],d:new Set()}); const e = m.get(k); e.sc.push(s.n); const d = dayOfId(D, s.id); if (d) e.d.add(d.i+1); }));
    return {c, items:[...m.values()].map(e => ({t:e.t, sc:e.sc.join(", "), d:[...e.d].sort((a,b)=>a-b).join(", ")}))};
  }).filter(x => x.items.length);
}
function pdfDept(){
  const html = deptData().map(({c,items}) => `<h2><span class="dot" style="background:${c.c}"></span>${esc(catLabel(c))}</h2><table><thead><tr><th>${L("Elemento")}</th><th>${L("Scene")}</th><th>${L("Giornate")}</th></tr></thead><tbody>${items.map(e=>`<tr><td>${esc(e.t)}</td><td>${esc(e.sc)}</td><td>${esc(e.d)}</td></tr>`).join("")}</tbody></table>`).join("");
  printDoc(fileBase() + " - " + L("Report per reparto"), docHead(L("Report per reparto")) + html);
}
function castData(){
  return A.castIds.map((n,i) => { const sc = [...A.scenes, ...A.extras.filter(x=>!x.banner)].filter(s=>s.cast.includes(n));
    const lines = A.scenes.reduce((a,s)=>a+s.b.filter(b=>b[0]==="c"&&cueName(b[1])===n).length,0);
    return {id:i+1, n, scenes:sc.length, lines, e8:sc.reduce((a,s)=>a+s.e8,0), list:sc.map(s=>s.n).join(", ")}; });
}
function pdfCast(){
  printDoc(fileBase() + " - Cast", docHead(L("Cast e personaggi")) + `<table><thead><tr><th>ID</th><th>${L("Personaggio")}</th><th class="c">${L("Scene")}</th><th class="c">${L("Battute")}</th><th class="c">${L("Pagine")}</th><th>${L("Elenco scene")}</th></tr></thead><tbody>${castData().map(r=>`<tr><td>${r.id}</td><td><b>${esc(r.n)}</b></td><td class="c">${r.scenes}</td><td class="c">${r.lines}</td><td class="c">${eighths(r.e8)}</td><td>${esc(r.list)}</td></tr>`).join("")}</tbody></table>`);
}
function locData(){
  const D = days(); const per = {};
  [...A.scenes, ...A.extras.filter(x=>!x.banner)].forEach(s => { const p = per[s.site] = per[s.site] || {site:s.site, sets:new Set(), sc:[], e8:0, dn:new Set(), d:new Set(), perm:[]}; p.sets.add(s.loc); p.sc.push(s.n); p.e8 += s.e8; p.dn.add(s.dn==="N"?L("Notte"):L("Giorno")); const d = dayOfId(D, s.id); if (d) p.d.add(d.i+1); (tagsOf(s.id).perm||[]).forEach(x=>p.perm.push(x.t)); });
  return Object.values(per).sort((a,b)=>b.e8-a.e8).map(p => ({site:p.site, sets:[...p.sets].join(" · "), dn:[...p.dn].join(", "), e8:p.e8, sc:p.sc.join(", "), d:[...p.d].sort((a,b)=>a-b).join(", "), perm:p.perm.join("; ")}));
}
function pdfLoc(){
  printDoc(fileBase() + " - Location", docHead(L("Location")) + `<table><thead><tr><th>${L("Location")}</th><th>${L("Set")}</th><th>${L("Luce")}</th><th class="c">${L("Pagine")}</th><th>${L("Scene")}</th><th>${L("Giornate")}</th><th>${L("Permessi")}</th></tr></thead><tbody>${locData().map(p=>`<tr><td><b>${esc(p.site)}</b></td><td>${esc(p.sets)}</td><td>${esc(p.dn)}</td><td class="c">${eighths(p.e8)}</td><td>${esc(p.sc)}</td><td>${esc(p.d)}</td><td>${esc(p.perm)||"—"}</td></tr>`).join("")}</tbody></table>`);
}
function pdfRev(){
  const D = days(); const ch = A.scenes.filter(s=>s.rev);
  const rows = ch.map(s => { const d = dayOfId(D, s.id);
    return `<tr><td class="mono"><b>${esc(s.n)}</b></td><td>${s.rev==="new"?L("nuova"):L("modificata")}</td><td>${esc(s.loc)}</td><td>${d ? (d.i+1)+" · "+esc(fmtDate(d.date,{day:"numeric",month:"short"})) : "—"}</td></tr>`; }).join("");
  printDoc(fileBase() + " - " + L("Revisioni"), docHead(L("Revisioni"), S.script.revision ? S.script.revision.name : "") + (ch.length ? `<table><thead><tr><th>${L("Scena")}</th><th>${L("Stato")}</th><th>${L("Location")}</th><th>${L("Giornata")}</th></tr></thead><tbody>${rows}</tbody></table>` : `<p>${L("Nessuna scena cambiata nell'ultima revisione.")}</p>`));
}
function pdfCall(){
  const D = days(); const di = Math.min(S.csDay||0, D.length-1); const c = callData(di); const d = c.d;
  const need = Object.entries(c.need).filter(([k])=>catOf(k)&&catOf(k).on).map(([k,set])=>`<div><b><span class="dot" style="background:${catOf(k).c}"></span>${esc(catLabel(catOf(k)))}</b><br>${esc([...set].join(" · "))}</div>`).join("");
  printDoc(fileBase() + " - " + L("Ordine del giorno") + " " + (d.i+1), `
    <div class="cs-top"><div><div class="brand"><b>ABISSO STUDIO</b> S.R.L.</div><div class="big">${esc(S.script.title.toUpperCase())}</div>
      <div class="kv"><span>${L("Giornata")}</span><b>${d.i+1} / ${D.length}</b><span>${L("Data")}</span><b>${esc(fmtDate(d.date,{weekday:"long",day:"numeric",month:"long",year:"numeric"}))}</b>${S.script.revision?`<span>${L("Revisione")}</span><b>${esc(S.script.revision.name)}</b>`:""}</div></div>
      <div><small>${L("Convocazione generale")}</small><div class="call">${esc(S.call)}</div></div>
      <div class="kv"><span>${L("Location")}</span><b>${esc(c.sites.join(" → "))}</b><span>Camp base</span><b>${esc(TRANSPORT_DEFAULT.camp)}</b><span>${L("Pagine")}</span><b>${eighths(d.e8)}</b></div></div>
    ${c.notes.length ? `<h2>${L("Note del piano")}</h2><p>${c.notes.map(esc).join("<br>")}</p>` : ""}
    <h2>${L("Scene")}</h2><table><thead><tr><th>${L("Sc.")}</th><th>${L("Set")}</th><th>INT/EST</th><th>G/N</th><th class="c">${L("Pag.")}</th><th>${L("Cast")}</th></tr></thead><tbody>${c.sc.map(s=>`<tr><td class="mono"><b>${esc(s.n)}</b></td><td><b>${esc(s.loc)}</b><br>${esc(sceneDesc(s))}</td><td>${esc(s.ie)}</td><td>${s.dn}</td><td class="c">${eighths(s.e8)}</td><td>${castIds(s)}</td></tr>`).join("")}</tbody></table>
    <h2>${L("Cast")}</h2><table><thead><tr><th>ID</th><th>${L("Personaggio")}</th><th>Pickup</th><th>${L("Trucco")}</th><th>${L("Sul set")}</th><th>${L("Scene")}</th><th></th></tr></thead><tbody>${c.people.map(p=>`<tr><td>${p.id}</td><td><b>${esc(p.n)}</b></td><td>${hm(p.pick)}</td><td>${hm(p.mua)}</td><td>${hm(p.set)}</td><td>${p.sc.join(", ")}</td><td>${p.minor?L("minore · tutore"):""}</td></tr>`).join("")}</tbody></table>
    <h2>${L("Necessità dei reparti")}</h2><div class="need">${need}</div>
    <h2>${L("Trasporti")}</h2><table><thead><tr><th>${L("Da")}</th><th>${L("A")}</th><th>${L("Orario")}</th><th>${L("Chi sale")}</th><th>${L("Autista")}</th><th>${L("Mezzo")}</th><th>${L("Note")}</th></tr></thead><tbody>${c.corse.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td>${esc(r.arr||r.fixFirst)}</td><td>${esc(r.pax.join(", "))}</td><td>${esc(r.driver)}</td><td>${esc(r.vehicle)}</td><td>${esc(r.note)}</td></tr>`).join("")}</tbody></table>`);
}

/* ---------- CSV ---------- */
function csv(name, head, rows){
  const cell = v => { v = String(v ?? ""); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; };
  download(fileBase() + " - " + name + ".csv", "﻿" + [head, ...rows].map(r => r.map(cell).join(";")).join("\r\n"), "text/csv;charset=utf-8");
}
function csvPlan(){
  const D = days(); const rows = [];
  D.forEach(d => d.ids.forEach(id => { const s = A.by[id]; if (s.banner) rows.push([d.i+1, d.date, "", "", s.text, "", "", "", ""]); else rows.push([d.i+1, d.date, s.n, s.ie, s.loc, s.dn, eighths(s.e8), castIds(s), sceneDesc(s)]); }));
  csv(L("Piano di lavorazione"), [L("Giornata"),L("Data"),L("Scena"),"INT/EST",L("Set"),"G/N",L("Ottavi"),L("Cast"),L("Descrizione")], rows);
}
function csvDept(){ const rows = []; deptData().forEach(({c,items}) => items.forEach(e => rows.push([catLabel(c), e.t, e.sc, e.d]))); csv(L("Report per reparto"), [L("Categoria"),L("Elemento"),L("Scene"),L("Giornate")], rows); }
function csvCast(){ csv("Cast", ["ID",L("Personaggio"),L("Scene"),L("Battute"),L("Pagine"),L("Elenco scene")], castData().map(r=>[r.id,r.n,r.scenes,r.lines,eighths(r.e8),r.list])); }
function csvLoc(){ csv("Location", [L("Location"),L("Set"),L("Luce"),L("Pagine"),L("Scene"),L("Giornate"),L("Permessi")], locData().map(p=>[p.site,p.sets,p.dn,eighths(p.e8),p.sc,p.d,p.perm])); }

/* ---------- Google Calendar (gratuito: il browser scrive direttamente nel calendario dell'utente) ---------- */
const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
let gToken = null, gTokenAt = 0;
async function googleToken(){
  if (gToken && Date.now() - gTokenAt < 50*60*1000) return gToken;
  const prov = new Cloud.a.GoogleAuthProvider(); prov.addScope(GCAL_SCOPE); prov.setCustomParameters({prompt:"consent"});
  const u = Cloud.auth.currentUser; let res;
  if (u.providerData.some(p => p.providerId==="google.com")) res = await Cloud.a.reauthenticateWithPopup(u, prov);
  else res = await Cloud.a.linkWithPopup(u, prov);
  const cred = Cloud.a.GoogleAuthProvider.credentialFromResult(res);
  gToken = cred && cred.accessToken; gTokenAt = Date.now();
  if (!gToken) throw {code:"no_token"};
  return gToken;
}
async function gapi(method, path, body){
  const r = await fetch("https://www.googleapis.com/calendar/v3/" + path, {method, headers:{Authorization:"Bearer " + gToken, "Content-Type":"application/json"}, body: body ? JSON.stringify(body) : undefined});
  if (r.status===204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw {code:"gapi", status:r.status, reason: ((j.error||{}).errors||[{}])[0].reason || "", message:(j.error||{}).message || ""};
  return j;
}
async function syncGoogle(){
  const D = days();
  if (!D.length || !D[0].ids.length){ toast(L("Il piano è vuoto: niente da sincronizzare.")); return; }
  try{ await googleToken(); }catch(e){ console.error(e); toast(e.code==="auth/popup-blocked" ? L("Il browser ha bloccato la finestra di Google: consenti i popup e riprova.") : e.code==="auth/popup-closed-by-user" ? L("Finestra di Google chiusa: sincronizzazione annullata.") : L("Accesso a Google Calendar non riuscito."), 4500); return; }
  toast(L("Sincronizzo con Google Calendar…"), 6000);
  const key = "abb:gcal:" + Cloud.pid + ":" + Cloud.email();
  let calId = null; try{ calId = localStorage.getItem(key); }catch(e){}
  try{
    if (calId){ try{ await gapi("GET", "calendars/" + encodeURIComponent(calId)); }catch(e){ calId = null; } }
    if (!calId){ const c = await gapi("POST", "calendars", {summary: "Abisso Film Manager · " + S.script.title, timeZone: "Europe/Rome"}); calId = c.id; try{ localStorage.setItem(key, calId); }catch(e){} }
    const enc = encodeURIComponent(calId);
    const ex = await gapi("GET", `calendars/${enc}/events?maxResults=2500&privateExtendedProperty=abb%3D1`);
    for (const ev of (ex.items||[])) await gapi("DELETE", `calendars/${enc}/events/${ev.id}`);
    const end = (date, call) => { const [h,m] = call.split(":").map(Number); const t = h*60+m+11*60; const dd = new Date(date+"T12:00:00"); if (t>=1440) dd.setDate(dd.getDate()+1); return `${dd.toISOString().slice(0,10)}T${String(Math.floor(t%1440/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}:00`; };
    for (const d of D){
      const sc = d.ids.filter(isScene).map(id=>A.by[id]);
      await gapi("POST", `calendars/${enc}/events`, {
        summary: `${S.script.title} · ${L("Giornata")} ${d.i+1}/${D.length}`,
        location: [...new Set(sc.map(s=>s.site))].join(" / "),
        description: `${L("Scene")}: ${sc.map(s=>s.n).join(", ")}\n${L("Pagine")}: ${eighths(d.e8)}\n${L("Cast")}: ${[...new Set(sc.flatMap(s=>s.cast))].join(", ")}\n\n${location.origin + location.pathname}`,
        start: {dateTime: `${d.date}T${S.call}:00`, timeZone: "Europe/Rome"}, end: {dateTime: end(d.date, S.call), timeZone: "Europe/Rome"},
        extendedProperties: {private: {abb: "1"}}
      });
    }
    toast(L("Google Calendar aggiornato: {n} giornate nel calendario «Abisso Film Manager · {t}».").replace("{n}", D.length).replace("{t}", S.script.title), 5000);
  }catch(e){
    console.error(e);
    if (e.reason==="accessNotConfigured" || /has not been used|is disabled/i.test(e.message||"")) modal(`<h3>${L("Manca un'impostazione di Google")}</h3><p class="note" style="margin:0">${L("Per scrivere nei calendari va attivata una volta l'API di Google Calendar nel progetto Firebase. Apri questo indirizzo con l'account dello studio e premi «Abilita»:")}</p><pre class="code" style="white-space:pre-wrap">https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=abisso-typewriter-e4285</pre><div class="row" style="justify-content:flex-end"><button class="btn primary" data-x>${L("Chiudi")}</button></div>`);
    else if (e.status===401 || e.status===403){ gToken = null; toast(L("Google non ha dato il permesso di scrivere nel calendario. Riprova e accetta l'accesso al calendario."), 5000); }
    else toast(L("Sincronizzazione non riuscita. Riprova tra poco."), 4500);
  }
}

/* ---------- smistamento dei pulsanti di esportazione ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-exp]"); if (!b || !S || !A) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const fn = {
    "breakdown:pdf":pdfBreakdown, "strip:pdf":pdfStrip, "plan:pdf":pdfPlan, "plan:csv":csvPlan,
    "cal:ics":() => { download(fileBase() + " - piano.ics", ics(), "text/calendar;charset=utf-8"); toast(L("File .ics scaricato: aprilo per aggiungere le giornate al calendario.")); },
    "cal:google":syncGoogle, "dood:pdf":pdfDood, "dood:csv":exportDood, "dept:pdf":pdfDept, "dept:csv":csvDept,
    "cast:pdf":pdfCast, "cast:csv":csvCast, "loc:pdf":pdfLoc, "loc:csv":csvLoc, "rev:pdf":pdfRev, "call:pdf":pdfCall,
    "st:js":() => { const t = stExport(S.csDay||0); modal(`<h3>${L("Corse per Set Transport")}</h3><pre class="code">${esc(t)}</pre><div class="row" style="justify-content:flex-end"><button class="btn" id="cp">${L("Copia")}</button><button class="btn primary" data-x>${L("Chiudi")}</button></div>`, m => { m.querySelector("#cp").onclick = ev => copy(t, ev.target); }); },
    "full:csv":exportTable
  }[b.dataset.exp];
  if (fn) fn();
}, true);
