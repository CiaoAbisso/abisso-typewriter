/* ================= Abisso Board · accesso, progetti, squadra, copione ================= */
const ROLE_L = {admin:"Admin", prod:"Produzione", ad:"Aiuto regia", dept:"Reparto", guest:"Ospite"};
function setSync(st){ const el = $("#sync"); if (!el) return; el.textContent = st==="err" ? "Non salvato · riprovo" : "Salvato"; el.className = "sync " + st; if (st==="err") setTimeout(() => S && Cloud.flush(S), 5000); }

/* ---------- schermate fuori dal progetto ---------- */
function shell(html){ $("#nav").innerHTML = ""; $("#pTitle").textContent = "Abisso Board"; $("#pSub").textContent = Cloud.email() || ""; $$(".in-project").forEach(e => e.hidden = true); $("#view").innerHTML = `<div class="wrap">${html}</div>`; }
function loginView(msg){
  const mail = (() => { try{ return localStorage.getItem("abb:mail") || ""; }catch(e){ return ""; } })();
  shell(`<div class="login box">
    <h2>Accedi ad Abisso Board</h2>
    <p class="note">Spoglio e piano di lavorazione dei progetti Abisso Studio. Entri con l'account Google dello studio, oppure con l'indirizzo email a cui hai ricevuto l'invito.</p>
    ${msg ? `<ul class="warnlist"><li>${esc(msg)}</li></ul>` : ""}
    <button class="btn primary" data-go="google">Entra con Google</button>
    <form id="mailForm" class="row"><input type="email" id="mailIn" required placeholder="la-tua@email.it" value="${esc(mail)}" aria-label="Email" style="flex:1;min-width:0"><button class="btn">Mandami il link</button></form>
    <p class="note">Il link arriva per email e vale una volta sola: aprilo su questo dispositivo.</p></div>`);
}
function finishLinkView(){
  shell(`<div class="login box"><h2>Conferma il tuo indirizzo</h2><p class="note">Hai aperto il link su un dispositivo diverso: scrivi l'email a cui è arrivato.</p>
    <form id="finForm" class="row"><input type="email" id="finIn" required placeholder="la-tua@email.it" aria-label="Email" style="flex:1;min-width:0"><button class="btn primary">Entra</button></form></div>`);
}
async function projectsView(){
  shell(`<p class="note">Caricamento dei progetti…</p>`);
  let list = []; try{ list = await Cloud.projects(); }catch(e){ console.error(e); }
  const admin = Cloud.isAdmin();
  shell(`<div class="head"><div><h2>Progetti</h2><p class="note">${admin ? "Ogni progetto parte da un copione: dal Typewriter, da un link condiviso o da un file." : "I progetti a cui sei stato invitato."}</p></div>
    <div class="row">${admin ? `<button class="btn primary" data-go="new">Nuovo progetto</button>` : ""}<button class="btn" data-go="logout">Esci</button></div></div>
    ${list.length ? `<div class="cards">${list.map(p => `<button class="card pcard" data-open="${esc(p.id)}"><b>${esc(p.title||"Senza titolo")}</b><p>${p.updated ? "Aggiornato " + esc(new Date(p.updated).toLocaleDateString("it-IT",{day:"numeric",month:"short",year:"numeric"})) : ""}</p></button>`).join("")}</div>`
      : `<div class="box"><p class="note" style="margin:0">${admin ? "Nessun progetto ancora. Creane uno con «Nuovo progetto»." : "Non sei ancora stato invitato a nessun progetto. Chiedi a chi te ne ha parlato di invitarti con questo indirizzo: " + esc(Cloud.email())}</p></div>`}`);
}
async function openProject(pid){
  shell(`<p class="note">Apertura del progetto…</p>`);
  try{
    S = await Cloud.open(pid, onRemote);
  }catch(e){ console.error(e); toast("Non riesco ad aprire il progetto. Controlla la connessione."); return projectsView(); }
  try{ localStorage.setItem("abb:last", pid); }catch(e){}
  $$(".in-project").forEach(e => e.hidden = false);
  $("#roleWrap").hidden = !Cloud.isAdmin();
  const first = !S.order.length;
  boot(first && A === null ? true : first);
  if (!S.sel || !A.by[S.sel]) S.sel = A.scenes[0] ? A.scenes[0].id : null;
  if (!A.scenes.length){ S.view = "spoglio"; }
  render(); setSync("ok");
}
function onRemote(kind, val){
  if (!S) return;
  if (kind==="data"){ const keep = {script:S.script, view:S.view, sel:S.sel, rtab:S.rtab, csDay:S.csDay}; S = dataInto(keep, val); analyse(); }
  else if (kind==="script"){ S.script = val; analyse(); const known = new Set(S.order); [...A.scenes, ...A.extras].forEach(s => { if (!known.has(s.id)) S.order.push(s.id); }); }
  const a = document.activeElement; if (a && a.closest && a.closest("#view, .modal") && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;   // non disturbare chi sta scrivendo
  if (selMenu) return;
  const top = $("#desk") ? $("#desk").scrollTop : null; afterSpoglio.noScroll = true; render(); if (top!=null && $("#desk")) $("#desk").scrollTop = top;
}
/* override del boot del prototipo: la prima volta fa lo spoglio a regole, importa l'AI del Typewriter e propone un piano */
const bootProto = boot;
boot = function(first){
  S.extra = S.extra || {};
  analyse();
  if (first && A.scenes.length){ ruleBreakdown(); aiImport(); optimise(); save(); }
  else { const known = new Set(S.order); [...A.scenes, ...A.extras].forEach(s => { if (!known.has(s.id)) S.order.push(s.id); }); }
};

/* ---------- scelta del copione ---------- */
function rowsFromProto(scenes){
  const seen = {}; const rows = [];
  scenes.forEach(s => { const k = hashStr(s.h); seen[k] = (seen[k]||0) + 1; rows.push(["s", s.h, "f" + k + (seen[k]>1 ? "-" + seen[k] : "")]); s.b.forEach(b => rows.push([b[0], b[1], ""])); });
  return rows;
}
function scriptPicker(onPick, opts={}){
  modal(`<h3>${opts.title || "Scegli il copione"}</h3>
    <div class="opt" style="cursor:default"><span class="dot" style="--c:var(--red);margin-top:4px"></span><span style="display:grid;gap:6px;min-width:0"><b>Dai tuoi copioni di Abisso Typewriter</b>
      <div id="twList" class="twlist"><small class="muted">Caricamento…</small></div></span></div>
    <div class="opt" style="cursor:default"><span class="dot" style="--c:var(--rev);margin-top:4px"></span><span style="display:grid;gap:6px;min-width:0"><b>Da un link condiviso del Typewriter</b>
      <input id="srcLink" placeholder="https://ciaoabisso.github.io/abisso-typewriter/#c-…" aria-label="Link del copione">
      <input id="srcPw" placeholder="Parola d'ordine, se c'è" aria-label="Parola d'ordine"><button class="btn" id="srcLinkGo" style="justify-self:start">Usa questo link</button></span></div>
    <label class="opt"><span class="dot" style="--c:var(--ink);margin-top:4px"></span><span><b>Da un file</b><small>Final Draft (.fdx), Fountain (.fountain), testo (.txt).</small><input type="file" id="srcFile" accept=".fdx,.fountain,.txt,.xml" style="margin-top:6px;display:block"></span></label>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-x>Annulla</button></div>`, async m => {
      const done = async src => { closeModal(); await onPick(src); };
      try{
        const l = await Cloud.typewriterList();
        $("#twList").innerHTML = l.length ? l.map(x => `<button class="btn tw" data-tw="${esc(x.id)}"><b>${esc(x.title||"Senza titolo")}</b><small>${x.updated ? esc(new Date(x.updated).toLocaleDateString("it-IT",{day:"numeric",month:"short"})) : ""}</small></button>`).join("")
          : `<small class="muted">Nessun copione nel cloud. Nel Typewriter apri Profilo e premi «Entra con Google»: i copioni arrivano qui.</small>`;
      }catch(e){ $("#twList").innerHTML = `<small class="muted">Il Typewriter non è raggiungibile da questo account.</small>`; }
      m.addEventListener("click", async e => { const b = e.target.closest("[data-tw]"); if (!b) return;
        b.disabled = true; try{ await done(await Cloud.typewriterScript(b.dataset.tw)); }catch(err){ toast("Non riesco a leggere questo copione."); b.disabled = false; } });
      $("#srcLinkGo").onclick = async () => { try{ await done(await Cloud.sharedScript($("#srcLink").value, $("#srcPw").value)); }catch(err){ toast(err.code==="bad_link" ? "Il link non sembra un copione del Typewriter." : "Copione non trovato: controlla link e parola d'ordine."); } };
      $("#srcFile").onchange = async e => { const f = e.target.files[0]; if (!f) return; const txt = await f.text(); const sc = /\.(fdx|xml)$/i.test(f.name) ? parseFDX(txt) : parseFountain(txt);
        if (!sc.length){ toast("Non ho trovato intestazioni di scena (INT./EST.) in questo file."); return; }
        await done({title: f.name.replace(/\.[^.]+$/,""), updated: f.lastModified || Date.now(), rows: rowsFromProto(sc), bd:{}, source:{kind:"file", name:f.name}}); };
  });
}
function newProject(){
  scriptPicker(async src => {
    const script = buildScript(src, null);
    toast("Creo il progetto…");
    try{ const pid = await Cloud.createProject(src.title || "Senza titolo", script); await openProject(pid); toast(`Progetto creato: ${script.scenes.length} scene, spoglio automatico fatto.`, 3500); }
    catch(e){ console.error(e); toast("Non sono riuscito a creare il progetto."); }
  }, {title:"Nuovo progetto: scegli il copione"});
}
async function updateScript(src){
  const before = S.script;
  const script = buildScript(src, before);
  const nNew = script.scenes.filter(s=>s.rev==="new" && !(before.scenes.find(o=>o.id===s.id))).length;
  const nMod = script.scenes.filter(s=>s.rev==="mod").length;
  try{ await Cloud.saveScript(script); }catch(e){ toast("Non sono riuscito a salvare il copione."); return; }
  S.script = script; analyse(); ruleBreakdown();
  const known = new Set(S.order); [...A.scenes, ...A.extras].forEach(s => { if (!known.has(s.id)) S.order.push(s.id); });
  save(); render();
  toast(nNew || nMod ? `Copione aggiornato: ${nMod} scene cambiate, ${nNew} nuove. Le nuove sono in fondo allo stripboard.` : "Il copione è già aggiornato.", 4000);
}
function sourceModal(){
  if (Cloud.myRole()!=="admin"){ toast("Solo gli amministratori cambiano il copione del progetto."); return; }
  const src = S.script.source || {};
  modal(`<h3>Copione del progetto</h3>
    <p class="note" style="margin:0">«${esc(S.script.title)}» · ${esc({cloud:"dai tuoi copioni del Typewriter", shared:"da un link condiviso", file:"da file: "+(src.name||"")}[src.kind]||"")} · importato il ${esc(new Date(S.script.imported||Date.now()).toLocaleString("it-IT",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}</p>
    ${src.kind==="file" ? "" : `<button class="opt" id="srcRefresh"><span class="dot" style="--c:var(--red);margin-top:4px"></span><span><b>Aggiorna dal copione</b><small>Prende l'ultima versione: le scene uguali tengono lo spoglio, quelle cambiate e nuove vengono segnate. I numeri di scena restano bloccati.</small></span></button>`}
    <button class="opt" id="srcOther"><span class="dot" style="--c:var(--ink);margin-top:4px"></span><span><b>${src.kind==="file" ? "Carica la nuova versione" : "Usa un altro copione"}</b><small>Dal Typewriter, da un link o da un file. Le scene con la stessa intestazione tengono lo spoglio.</small></span></button>
    <div class="row" style="justify-content:space-between"><button class="btn" id="projDel" style="color:var(--bad)">Elimina il progetto</button><button class="btn" data-x>Chiudi</button></div>`, m => {
    if ($("#srcRefresh")) $("#srcRefresh").onclick = async () => { closeModal(); toast("Leggo l'ultima versione…"); try{ await updateScript(await Cloud.refreshSource(src)); }catch(e){ toast("Non riesco a leggere il copione d'origine."); } };
    $("#srcOther").onclick = () => scriptPicker(updateScript, {title:"Scegli la nuova versione del copione"});
    $("#projDel").onclick = async e => { const b = e.target; if (b.dataset.c!=="1"){ b.dataset.c = "1"; b.textContent = "Conferma: elimina per tutti"; return; }
      await Cloud.deleteProject(Cloud.pid); closeModal(); Cloud.close(); S = null; toast("Progetto eliminato."); projectsView(); };
  });
}

/* ---------- squadra ---------- */
function vTeam(){
  const mem = Object.entries(Cloud.members || {});
  const deptOpts = S.cats.filter(c=>c.k!=="cast").map(c => `<label><input type="checkbox" data-ic="${c.k}">${esc(c.l)}</label>`).join("");
  return `<div class="wrap"><div class="head"><div><h2>${T("Squadra")}</h2><p class="note">Voi amministratori entrate con l'account Google dello studio. Le altre persone ricevono un'email con il link di accesso: entrano con quell'indirizzo e vedono solo questo progetto, con il ruolo che scegliete.</p></div></div>
  <form class="box" id="inv" style="margin-bottom:16px">
    <div class="invite"><input type="email" id="invMail" required placeholder="email@esempio.it" aria-label="Email"><select id="invRole" aria-label="Ruolo">${["prod","ad","dept","guest"].map(r=>`<option value="${r}">${ROLE_L[r]}</option>`).join("")}</select><button class="btn primary">${T("Invita")}</button></div>
    <div id="invCats" hidden><span class="muted" style="font-size:12px">Categorie che il reparto vede</span><div class="wd" style="margin-top:4px">${deptOpts}</div></div>
  </form>
  <div class="tbl" style="margin-bottom:20px"><table><thead><tr><th>Email</th><th>Ruolo</th><th>Invitato</th><th></th></tr></thead><tbody>
    <tr><td>${esc((window.ABISSO_ADMINS||[])[0]||"")}</td><td>Admin</td><td>—</td><td></td></tr>
    ${mem.map(([ek,p]) => `<tr><td>${esc(p.email)}</td><td><select data-mrole="${esc(ek)}" aria-label="Ruolo di ${esc(p.email)}">${["prod","ad","dept","guest"].map(r=>`<option value="${r}" ${p.role===r?"selected":""}>${ROLE_L[r]}</option>`).join("")}</select>${p.role==="dept" ? `<br><small class="muted">${esc((p.cats||[]).map(k=>(catOf(k)||{}).l).filter(Boolean).join(", ")||"nessuna categoria")}</small>` : ""}</td>
      <td>${p.invited ? esc(new Date(p.invited).toLocaleDateString("it-IT",{day:"numeric",month:"short"})) : ""}</td>
      <td><button class="btn" data-resend="${esc(p.email)}">Rimanda il link</button> <button class="btn" data-mdel="${esc(ek)}" style="color:var(--bad)">Togli</button></td></tr>`).join("")}
  </tbody></table></div>
  <h3 style="margin-bottom:8px">Cosa può fare ogni ruolo</h3>
  <div class="tbl matrix"><table><thead><tr><th></th>${["Admin","Produzione","Aiuto regia","Reparto","Ospite"].map(r=>`<th>${r}</th>`).join("")}</tr></thead><tbody>${[
    ["Vedere lo spoglio",[1,1,1,"solo le sue categorie",0]],["Modificare spoglio e piano",[1,1,1,0,0]],["Vedere strisce, calendario, DOOD",[1,1,1,1,1]],
    ["Ordini del giorno",[1,1,1,"leggere","leggere"]],["Cambiare il copione",[1,0,0,0,0]],["Invitare persone",[1,0,0,0,0]]].map(([l,v])=>`<tr><td>${esc(l)}</td>${v.map(x=>`<td>${x===1?'<span class="yes">sì</span>':x===0?'<span class="no">—</span>':`<small>${esc(x)}</small>`}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  <p class="note" style="margin-top:10px">I permessi sono applicati anche dal database: chi non è invitato non legge il progetto, e chi ha un ruolo di sola lettura non può salvare modifiche.</p></div>`;
}

/* ---------- esportazioni ---------- */
function download(name, text, type){ const blob = new Blob([text], {type}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
const fileBase = () => (S.script.title || "progetto").replace(/[\\/:*?"<>|]+/g, "").trim();
function exportTable(){
  const D = days(); const dayOf = id => D.find(d=>d.ids.includes(id));
  const cats = S.cats.filter(c=>c.on && c.k!=="cast");
  const head = ["Scena","Giornata","Data","INT/EST","Location","Momento","Ottavi","Pagina","Cast",...cats.map(c=>c.l)];
  const rows = [...A.scenes, ...A.extras.filter(x=>!x.banner)].map(s => { const d = dayOf(s.id); const tg = tagsOf(s.id);
    return [s.n, d?d.i+1:"", d?d.date:"", s.ie, s.loc, s.time, eighths(s.e8), s.page, s.cast.map(n=>`${cid(n)}. ${n}`).join(", "), ...cats.map(c => (tg[c.k]||[]).map(x=>x.t).join(", "))]; });
  const cell = v => { v = String(v ?? ""); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; };
  download(fileBase() + " - spoglio e piano.csv", "﻿" + [head, ...rows].map(r => r.map(cell).join(";")).join("\r\n"), "text/csv;charset=utf-8");
}
function exportDood(){
  const D = days(); const rows = dood();
  const head = ["ID","Cast",...D.map(d=>`G${d.i+1} ${d.date}`),"Lavoro","Attesa","Totale"];
  download(fileBase() + " - DOOD.csv", "﻿" + [head, ...rows.map((r,i)=>[i+1, r.n, ...r.codes, r.w, r.h, r.span])].map(r=>r.join(";")).join("\r\n"), "text/csv;charset=utf-8");
}

/* ---------- eventi ---------- */
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-go],[data-open],[data-mdel],[data-resend],#btnBack"); if (!b) return;
  if (b.id==="btnBack"){ Cloud.close(); S = null; A = null; try{ localStorage.removeItem("abb:last"); }catch(err){} projectsView(); return; }
  if (b.dataset.open){ openProject(b.dataset.open); return; }
  if (b.dataset.go==="google"){ try{ await Cloud.google(); afterLogin(); }catch(err){ toast("Accesso non riuscito. Riprova."); } return; }
  if (b.dataset.go==="logout"){ await Cloud.logout(); loginView(); return; }
  if (b.dataset.go==="new"){ newProject(); return; }
  if (b.dataset.mdel){ if (b.dataset.c!=="1"){ b.dataset.c = "1"; b.textContent = "Conferma"; return; } await Cloud.removeMember(b.dataset.mdel); toast("Accesso tolto."); return; }
  if (b.dataset.resend){ try{ await Cloud.sendLink(b.dataset.resend); toast("Link di accesso inviato di nuovo."); }catch(err){ toast("Invio non riuscito: " + (err.code||"")); } return; }
});
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.id==="invRole") $("#invCats").hidden = t.value!=="dept";
  if (t.dataset && t.dataset.mrole){ const r = t.value; await Cloud.setRole(t.dataset.mrole, r, r==="dept" ? deptPick() : []); toast("Ruolo aggiornato."); }
});
function deptPick(){ return $$("[data-ic]:checked").map(i=>i.dataset.ic); }
document.addEventListener("submit", async e => {
  e.preventDefault();
  if (e.target.id==="mailForm"){ const m = $("#mailIn").value.trim(); try{ await Cloud.sendLink(m); toast("Link inviato: controlla la posta (anche lo spam).", 5000); }catch(err){ toast("Invio non riuscito. Controlla l'indirizzo."); } }
  if (e.target.id==="finForm"){ try{ await Cloud.finishLink($("#finIn").value.trim()); afterLogin(); }catch(err){ toast("Il link non è valido o è scaduto: chiedine uno nuovo."); loginView(); } }
  if (e.target.id==="inv"){ const mail = $("#invMail").value.trim(), role = $("#invRole").value;
    if (role==="dept" && !deptPick().length){ toast("Scegli quali categorie vede il reparto."); return; }
    try{ await Cloud.invite(mail, role, role==="dept" ? deptPick() : []); toast(`Invito inviato a ${mail}.`, 3500); }catch(err){ console.error(err); toast("Invito non riuscito: " + (err.code||"riprova")); } }
});
$("#btnSource").onclick = () => sourceModal();

/* ---------- avvio ---------- */
async function afterLogin(){
  if (!Cloud.email()){ loginView(); return; }
  const last = (() => { try{ return localStorage.getItem("abb:last"); }catch(e){ return null; } })();
  if (last){ try{ await openProject(last); return; }catch(e){} }
  projectsView();
}
(async function start(){
  shell(`<p class="note">Avvio…</p>`);
  try{ await Cloud.init(); }catch(e){ shell(`<p class="note">Non riesco a collegarmi. Controlla la connessione e ricarica la pagina.</p>`); return; }
  if (Cloud.isLink && Cloud.isLink()){
    const mail = (() => { try{ return localStorage.getItem("abb:mail"); }catch(e){ return null; } })();
    if (!mail){ finishLinkView(); return; }
    try{ await Cloud.finishLink(mail); }catch(e){ loginView("Il link non è valido o è scaduto: chiedine uno nuovo."); return; }
  } else await Cloud.ready();
  afterLogin();
})();
