/* ================= Abisso Film Manager · ponte con Abisso Dock =================
   Il Dock (claude.ai) e il Film Manager (GitHub Pages + Firebase) si parlano attraverso il Drive dello studio,
   nella cartella «Abisso · Ponte»:
     «Abisso Dock · registro.json»          lo crea il Film Manager, lo riempie il Dock: progetti, persone, location
     «Abisso Film Manager · <titolo>.json»   lo scrive il Film Manager per ogni film, lo legge il Dock
   Il Film Manager usa solo il permesso drive.file: vede soltanto i file che ha creato lui.
   Una copia del registro resta in Firebase (b/dock, solo amministratori), così si vede da ogni computer senza riaprire Drive. */
const DOCK_REG = "Abisso Dock · registro.json", DOCK_DIR = "Abisso · Ponte";
const DOCK = {reg:null, on:{}, loaded:false};
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
try{ const c = JSON.parse(localStorage.getItem("abb:dockreg") || "null"); if (c) DOCK.reg = c; }catch(e){}

async function dockLoadSnapshot(){
  if (!Cloud.isAdmin()) return;
  try{ const s = await Cloud.get("b/dock"); if (s){ if (s.reg){ const r = JSON.parse(s.reg); if (!DOCK.reg || (r.aggiornato||"") >= (DOCK.reg.aggiornato||"")) DOCK.reg = r; } DOCK.on = s.on || {}; } }catch(e){ console.warn("b/dock", e); }
  DOCK.loaded = true;
}
async function dockSaveSnapshot(){
  try{ localStorage.setItem("abb:dockreg", JSON.stringify(DOCK.reg)); }catch(e){}
  try{ await Cloud.update({"b/dock/reg": JSON.stringify(DOCK.reg), "b/dock/at": Date.now()}); }catch(e){ console.warn("b/dock non salvato: pubblica le regole nuove", e); }
}
const qEsc = s => s.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
async function driveFind(name, folder, isDir){
  const q = `name='${qEsc(name)}' and trashed=false` + (isDir ? " and mimeType='application/vnd.google-apps.folder'" : "") + (folder ? ` and '${folder}' in parents` : "");
  const r = await gfetch(`${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`);
  return (r.files||[])[0] || null;
}
async function dockDir(){
  const f = await driveFind(DOCK_DIR, null, true); if (f) return f.id;
  return (await gfetch(DRIVE_API + "?fields=id", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({name:DOCK_DIR, mimeType:"application/vnd.google-apps.folder", description:"Scambio dati tra Abisso Dock e Abisso Film Manager"})})).id;
}
async function driveJson(id){
  const r = await fetch(`${DRIVE_API}/${id}?alt=media`, {headers:{Authorization:"Bearer " + gTokB}});
  if (!r.ok) throw {code:"gapi", status:r.status, api:DRIVE_API};
  const t = await r.text(); try{ return JSON.parse(t || "{}"); }catch(e){ return {}; }
}
/* «Collega al Dock» la prima volta, «Aggiorna dal Dock» le altre: stessa funzione */
async function dockPull(btn){
  if (btn){ btn.disabled = true; btn.textContent = "Leggo il registro…"; }
  try{
    await googleTokenFor(DRIVE_SCOPE);
    const dir = await dockDir();
    let f = await driveFind(DOCK_REG, dir);
    if (!f){
      const bd = "abisso" + Date.now(); const body = JSON.stringify({schema:"abisso-dock-registro/1", aggiornato:null, nota:"Lo riempie Abisso Dock. Non modificare a mano.", progetti:[], persone:[], location:[]});
      const multi = `--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:DOCK_REG, parents:[dir], mimeType:"application/json", description:"Registro di Abisso Dock per il Film Manager"})}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${bd}--`;
      f = await gfetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {method:"POST", headers:{"Content-Type":`multipart/related; boundary=${bd}`}, body: multi});
      toast("Collegamento creato nel Drive. Il registro si riempie al prossimo aggiornamento del Dock.", 6000);
    }
    const reg = await driveJson(f.id);
    if (reg && reg.schema){ DOCK.reg = {...reg, fileId: f.id}; await dockSaveSnapshot(); if (reg.aggiornato) toast(`Registro del Dock letto: ${(reg.progetti||[]).length} progetti, ${(reg.persone||[]).length} persone, ${(reg.location||[]).length} location.`, 4500); }
  }catch(e){ gErr(e); }
  finally{ if (btn){ btn.disabled = false; } if (!S) projectsView(); }
}
async function dockSetOn(code, on){ DOCK.on[code] = on; try{ await Cloud.update({[`b/dock/on/${code}`]: on || null}); }catch(e){ toast("Non salvato: pubblica le regole nuove del database."); } }

/* quali progetti del Dock entrano: le produzioni Abisso sempre, i service quando li attivi */
const dockEligible = p => p.codice && p.codice!=="P00" && (!p.service || DOCK.on[p.codice] || p.filmManager);
const FASE_ORDER = ["Riprese","Preproduzione","Pre-produzione","Finanziamento","Sviluppo","Post-produzione","Distribuzione","Chiuso"];

/* ---------- pagina Progetti ---------- */
const projectsViewBase = projectsView;
projectsView = async function(){
  if (!Cloud.isAdmin()) return projectsViewBase();
  shell(`<p class="note">Caricamento dei progetti…</p>`);
  let list = []; try{ list = await Cloud.projects(); }catch(e){ console.error(e); }
  if (!DOCK.loaded) await dockLoadSnapshot();
  const reg = DOCK.reg; const dps = (reg && reg.progetti) || [];
  const byCode = {}; list.forEach(p => { if (p.dock) byCode[p.dock] = p; });
  const fmt = t => t ? new Date(t).toLocaleDateString("it-IT",{day:"numeric",month:"short",year:"numeric"}) : "";
  const prod = dps.filter(p => dockEligible(p)).sort((a,b) => (FASE_ORDER.indexOf(a.fase)+99)%99 - (FASE_ORDER.indexOf(b.fase)+99)%99 || a.codice.localeCompare(b.codice));
  const svc = dps.filter(p => p.service && p.codice!=="P00" && !dockEligible(p));
  const card = p => { const fm = byCode[p.codice];
    return `<article class="dcard ${p.fase==="Chiuso"?"closed":""}"><button class="dmain" ${fm ? `data-open="${esc(fm.id)}"` : `data-dockp="${esc(p.codice)}"`}>
      <span class="dtop"><span class="pill code">${esc(p.codice)}</span>${p.fase ? `<span class="pill fase f-${esc((p.fase||"").toLowerCase().replace(/[^a-z]/g,""))}">${esc(p.fase)}</span>` : ""}${p.service ? `<span class="pill rule">Service</span>` : ""}</span>
      <b>${esc(p.titolo)}</b><small>${esc([p.formato, p.anno].filter(Boolean).join(" · "))}</small>
      <span class="dfoot">${fm ? `Nel Film Manager · aggiornato ${fmt(fm.updated)}` : `<span class="go">Apri nel Film Manager →</span>`}</span></button>
      ${p.service ? `<button class="btn ghost doff" data-dockon="${esc(p.codice)}" data-on="0">Disattiva</button>` : ""}</article>`; };
  const free = list.filter(p => !p.dock);
  const regLine = !reg ? `Il Film Manager non è ancora collegato al Dock.`
    : !reg.aggiornato ? `Collegamento creato: il registro è ancora vuoto e si riempie al prossimo aggiornamento del Dock.`
    : `Registro del Dock aggiornato il ${fmt(reg.aggiornato)}: ${dps.length} progetti, ${(reg.persone||[]).length} persone, ${(reg.location||[]).length} location.`;
  shell(`<div class="head"><div><h2>Progetti</h2><p class="note">Le produzioni di Abisso arrivano dal Dock con il loro codice. I progetti di service entrano quando li attivi. ${esc(regLine)}</p></div>
    <div class="row"><button class="btn ${reg ? "" : "primary"}" data-dockpull="1">${reg ? "Aggiorna dal Dock" : "Collega al Dock"}</button><button class="btn" data-go="new">Progetto senza Dock</button><button class="btn" data-go="logout">Esci</button></div></div>
    ${prod.length ? `<div class="dgrid">${prod.map(card).join("")}</div>` : `<div class="box"><h3>Progetti del Dock</h3><p class="note" style="margin:0">${reg ? "Nessun progetto ancora nel registro." : "Premi «Collega al Dock»: il Film Manager crea nel Drive dello studio la cartella «Abisso · Ponte» con il file che il Dock riempie con progetti, persone e location."}</p></div>`}
    ${svc.length ? `<details class="box dsvc"><summary><h3 style="display:inline">Service da attivare · ${svc.length}</h3></summary><div class="dsvcl">${svc.map(p => `<div class="row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--panel-2)"><span><span class="pill code">${esc(p.codice)}</span> <b>${esc(p.titolo)}</b> <small class="muted">${esc(p.fase||"")} · ${esc(p.formato||"")}</small></span><button class="btn" data-dockon="${esc(p.codice)}" data-on="1">Attiva nel Film Manager</button></div>`).join("")}</div></details>` : ""}
    ${free.length ? `<section class="box" style="margin-top:44px"><h3>Progetti non collegati al Dock</h3><div class="cards" style="margin-top:4px">${free.map(p => `<div class="card pcard" style="display:grid;gap:8px"><button class="btn ghost" data-open="${esc(p.id)}" style="justify-content:flex-start;height:auto;padding:0;border:0"><b>${esc(p.title||"Senza titolo")}</b></button><small class="muted">${p.updated ? "Aggiornato " + esc(fmt(p.updated)) : ""}</small>
        ${dps.length ? `<select class="sm" data-docklink="${esc(p.id)}" aria-label="Collega a un progetto del Dock"><option value="">Collega a un progetto del Dock…</option>${dps.filter(d => d.codice!=="P00" && !byCode[d.codice]).map(d => `<option value="${esc(d.codice)}">${esc(d.codice)} · ${esc(d.titolo)}</option>`).join("")}</select>` : ""}</div>`).join("")}</div></section>` : ""}`);
};

async function dockLinkProject(pid, code){
  const p = (DOCK.reg.progetti||[]).find(x => x.codice===code) || {};
  await Cloud.update({[`b/index/${pid}/dock`]: code, [`b/p/${pid}/meta/dock`]: code});
  toast(`Collegato a ${code} · ${p.titolo||""}.`);
}
function dockNewProject(code){
  const p = (DOCK.reg.progetti||[]).find(x => x.codice===code); if (!p) return;
  scriptPicker(async src => {
    const script = buildScript(src, null); toast("Creo il progetto…");
    try{
      const pid = await Cloud.createProject(p.titolo || src.title || "Senza titolo", script);
      await dockLinkProject(pid, code);
      const pr = {titleInt: p.titoloInt || "", format: p.formato || "", duration: p.durata || "", year: p.anno || "", logline: p.logline || "", producers: "", cdp: p.produzione || "Abisso Studio S.r.l.", dockCode: code, dockName: p.titolo};
      await Cloud.update({[`b/p/${pid}/data/prod`]: JSON.stringify(pr)});
      await openProject(pid); toast(`${code} · ${p.titolo}: progetto creato con ${script.scenes.length} scene.`, 4000);
    }catch(e){ console.error(e); toast("Non sono riuscito a creare il progetto."); }
  }, {title:`${code} · ${p.titolo}: scegli il copione`});
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-dockpull],[data-dockp],[data-dockon]"); if (!b) return;
  if (b.dataset.dockpull){ dockPull(b); return; }
  if (b.dataset.dockp){ dockNewProject(b.dataset.dockp); return; }
  if (b.dataset.dockon){ await dockSetOn(b.dataset.dockon, b.dataset.on==="1"); projectsView(); }
});
document.addEventListener("change", async e => {
  const t = e.target; if (!t.dataset || !t.dataset.docklink || !t.value) return;
  await dockLinkProject(t.dataset.docklink, t.value); projectsView();
});

/* la scheda del film va nella stessa cartella del registro, con il codice del Dock */
const dockPayloadBase = dockPayload;
dockPayload = function(){ const p = dockPayloadBase(); const pr = PRODX(); return {...p, codiceDock: pr.dockCode || null, progettoDock: pr.dockCode ? `${pr.dockCode} · ${pr.dockName || S.script.title}` : p.progettoDock}; };
