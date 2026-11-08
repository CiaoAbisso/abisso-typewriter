/* ================= Abisso Film Manager · Budget =================
   Il budget vero è un Google Sheet nel Drive di chi lo crea, copiato dal Modello Budget Abisso (con il foglio MIC collegato).
   L'ambiente riscrive solo i fogli DATI_*; il PREVENTIVO lo modifichi tu: alla creazione le voci della troupe ricevono una formula SOMMA.PIÙ.SE sui dati. */
const SPLIT_ROLES = {"regista":["Regista - prestazione","Regista - diritti"], "sceneggiatore":["Sceneggiatura - Prestazione","Sceneggiatura - Diritti"]};
function vBudget(){
  if (!canCrew()) return `<div class="wrap"><p class="note">Il budget lo vedono amministratori e produzione.</p></div>`;
  crewLoad(); if (!CR.ready) return `<div class="wrap"><p class="note">Caricamento…</p></div>`;
  const rows = crewRows(); const tot = rows.reduce((a,r)=>a+r.total,0);
  const by = DEPTS.map(d => { const rr = rows.filter(r => r.dept===d.l); const ph = k => rr.filter(r=>r.phase===k).reduce((a,r)=>a+r.total,0);
    return {d, n: new Set(rr.map(r=>r.name+r.role)).size, pre: ph("Pre-Produzione"), shoot: ph("Produzione"), post: ph("Post-Produzione"), tot: rr.reduce((a,r)=>a+r.total,0)}; }).filter(x => x.n);
  const D = days(); const castDays = dood().reduce((a,r)=>a+r.w,0);
  const sh = CR.meta;
  return `<div class="wrap"><div class="head"><div><h2>Budget</h2><p class="note">Il budget si lavora su Google Sheets, con il Modello Budget Abisso e il foglio MIC già collegato. Da qui crei il foglio e lo tieni aggiornato con troupe, giornate e cast.</p></div></div>
  <div class="grid2" style="margin-bottom:16px">
    <div class="box"><h3>Google Sheets</h3>
      ${sh ? `<p class="note">Foglio creato il ${esc(new Date(sh.created).toLocaleDateString("it-IT"))}${sh.synced ? `, dati aggiornati il ${esc(new Date(sh.synced).toLocaleString("it-IT",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}` : ""}.</p>
        <div class="row"><a class="btn primary" href="${esc(sh.url)}" target="_blank" rel="noopener">Apri il budget</a><button class="btn" data-bsync="1">Aggiorna i dati nel foglio</button></div>
        <p class="note">L'aggiornamento riscrive solo i fogli DATI_TROUPE, DATI_GIORNATE e DATI_CAST. Il PREVENTIVO e il MIC restano come li hai lasciati.</p>`
      : `<p class="note">Crea una copia del Modello Budget Abisso nel tuo Google Drive, con i dati di questo progetto. Le voci della troupe nel PREVENTIVO prendono i compensi dalla Crewlist con una formula.</p>
        <button class="btn primary" data-bcreate="1" style="justify-self:start">Crea il budget su Google Sheets</button>`}
      ${CR.unmatched && CR.unmatched.length ? `<ul class="warnlist"><li>Ruoli senza una riga nel PREVENTIVO, da collocare a mano: ${esc(CR.unmatched.join(", "))}.</li></ul>` : ""}
    </div>
    <div class="box"><h3>Numeri del progetto</h3><div class="kpis"><div><small>Troupe</small><b>${eur(tot)}</b></div><div><small>Collaboratori</small><b>${Object.keys(CR.eng).length}</b></div><div><small>Giornate di riprese</small><b>${D.length}</b></div><div><small>Pose del cast</small><b>${castDays}</b></div></div>
      <p class="note">Le pose del cast vengono dal DOOD. I compensi del cast si aggiungono nel foglio.</p></div>
  </div>
  <div class="tbl"><table><thead><tr><th>Reparto</th><th class="num">Persone</th><th class="num">Pre-produzione</th><th class="num">Riprese</th><th class="num">Post</th><th class="num">Totale</th></tr></thead>
    <tbody>${by.map(x=>`<tr><td>${esc(x.d.l)}</td><td class="num">${x.n}</td><td class="num">${eur(x.pre)}</td><td class="num">${eur(x.shoot)}</td><td class="num">${eur(x.post)}</td><td class="num"><b>${eur(x.tot)}</b></td></tr>`).join("") || `<tr><td colspan="6" class="muted">Nessun compenso ancora: aggiungi la troupe e i compensi nell'area Troupe.</td></tr>`}
    ${by.length ? `<tr><td><b>Totale troupe</b></td><td></td><td></td><td></td><td></td><td class="num"><b>${eur(tot)}</b></td></tr>` : ""}</tbody></table></div></div>`;
}

/* ---------- Google: accesso con i permessi per Drive (solo i file creati da qui) ---------- */
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
let gTokB = null, gTokBAt = 0;
async function googleTokenFor(scope){
  if (gTokB && Date.now() - gTokBAt < 50*60*1000) return gTokB;
  const prov = new Cloud.a.GoogleAuthProvider(); prov.addScope(scope); prov.setCustomParameters({prompt:"consent"});
  const u = Cloud.auth.currentUser; const res = u.providerData.some(p => p.providerId==="google.com") ? await Cloud.a.reauthenticateWithPopup(u, prov) : await Cloud.a.linkWithPopup(u, prov);
  const cred = Cloud.a.GoogleAuthProvider.credentialFromResult(res); gTokB = cred && cred.accessToken; gTokBAt = Date.now();
  if (!gTokB) throw {code:"no_token"}; return gTokB;
}
async function gfetch(url, opt={}){
  const r = await fetch(url, {...opt, headers:{Authorization:"Bearer " + gTokB, ...(opt.headers||{})}});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw {code:"gapi", status:r.status, reason:((j.error||{}).errors||[{}])[0].reason || (j.error||{}).status || "", message:(j.error||{}).message || "", api:url};
  return j;
}
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets/";
function apiHelp(e){
  const api = /sheets/.test(e.api||"") ? ["Google Sheets API","sheets.googleapis.com"] : ["Google Drive API","drive.googleapis.com"];
  modal(`<h3>Manca un'impostazione di Google</h3><p class="note" style="margin:0">Va attivata una volta la ${api[0]} nel progetto Firebase. Apri questo indirizzo con l'account dello studio e premi «Abilita», poi riprova.</p>
    <pre class="code" style="white-space:pre-wrap">https://console.cloud.google.com/apis/library/${api[1]}?project=abisso-typewriter-e4285</pre><div class="row" style="justify-content:flex-end"><button class="btn primary" data-x>Chiudi</button></div>`);
}
function gErr(e){ console.error(e);
  if (e.reason==="accessNotConfigured" || e.reason==="SERVICE_DISABLED" || /has not been used|is disabled/i.test(e.message||"")) apiHelp(e);
  else if (e.code==="auth/popup-blocked") toast("Il browser ha bloccato la finestra di Google: consenti i popup e riprova.", 4500);
  else if (e.code==="auth/popup-closed-by-user") toast("Finestra di Google chiusa: operazione annullata.");
  else { gTokB = null; toast("Google non ha completato l'operazione. Riprova.", 4000); } }

/* dati per i fogli DATI_* */
function budgetData(){
  const D = days();
  const giornate = [["Giornata","Data","Location","Scene","Ottavi","Convocazione","Fine stimata","Ore di lavoro"], ...D.map(d => { const x = daySched(d); const sc = d.ids.filter(isScene).map(id=>A.by[id]);
    return [d.i+1, d.date, [...new Set(sc.map(s=>s.site))].join(" / "), sc.map(s=>s.n).join(", "), d.e8/8, hm(x.start), hm(x.end), Math.round(x.work/6)/10]; })];
  const cast = [["ID","Personaggio","Pose","Attese","Inizio","Fine"], ...dood().map((r,i) => [i+1, r.n, r.w, r.h, r.f<0?"":D[r.f].date, r.l<0?"":D[r.l].date])];
  const troupe = [CREW_HEAD, ...crewRows().map(crewRowArr)];
  return {DATI_TROUPE: troupe, DATI_GIORNATE: giornate, DATI_CAST: cast};
}
async function writeData(id, sheetsMeta){
  const data = budgetData(); const have = new Set(sheetsMeta.map(s => s.properties.title)); const req = [];
  Object.keys(data).forEach(t => { if (!have.has(t)) req.push({addSheet:{properties:{title:t, gridProperties:{frozenRowCount:1}}}}); });
  if (req.length) await gfetch(SHEETS + id + ":batchUpdate", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({requests:req})});
  await gfetch(SHEETS + id + "/values:batchClear", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ranges: Object.keys(data).map(t => `${t}!A:Z`)})});
  await gfetch(SHEETS + id + "/values:batchUpdate", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({valueInputOption:"RAW", data: Object.entries(data).map(([t, v]) => ({range:`${t}!A1`, values:v}))})});
}
async function budgetCreate(){
  try{ await googleTokenFor(DRIVE_SCOPE); }catch(e){ gErr(e); return; }
  toast("Creo il budget su Google Sheets…", 8000);
  try{
    const blob = await (await fetch("assets/Modello_Budget_Abisso.xlsx")).blob();
    const name = `${new Date().toISOString().slice(0,10)}_${(S.script.title||"FILM").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Z0-9]+/g,"")}_budget_IT_v1`;
    const meta = {name, mimeType:"application/vnd.google-apps.spreadsheet"};
    const fd = new FormData(); fd.append("metadata", new Blob([JSON.stringify(meta)], {type:"application/json"})); fd.append("file", blob);
    const f = await gfetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {method:"POST", body: fd});
    const ss = await gfetch(SHEETS + f.id + "?fields=properties.locale,sheets.properties");
    await writeData(f.id, ss.sheets);
    // voci della troupe nel PREVENTIVO: formula sui dati, così il foglio resta vivo
    const sep = /^(en|ja|zh|ko|th|he)/.test(ss.properties.locale||"") && !/^en_(ZA|IN)/.test(ss.properties.locale||"") ? "," : ";";
    const pv = await gfetch(SHEETS + f.id + "/values/" + encodeURIComponent("PREVENTIVO!A1:C1000"));
    const rows = pv.values || []; const norm = s => String(s||"").trim().toLowerCase();
    const rowOf = name => rows.findIndex(r => norm(r[1])===norm(name));
    const roles = [...new Set(crewRows().map(r => r.role).filter(Boolean))]; const upd = []; const unmatched = [];
    const F = (role, phase, share) => `=SUMIFS(DATI_TROUPE!N:N${sep}DATI_TROUPE!B:B${sep}"${role.replace(/"/g,'""')}"${phase?`${sep}DATI_TROUPE!F:F${sep}"${phase}"`:""})${share!=null?`*${String(share).replace(".", sep===";"?",":".")}`:""}`;
    roles.forEach(role => {
      const split = SPLIT_ROLES[norm(role)];
      if (split){ const a = rowOf(split[0]), b = rowOf(split[1]); if (a>=0 && b>=0){ upd.push({range:`PREVENTIVO!G${a+1}`, values:[[F(role,null,0.6)]]}, {range:`PREVENTIVO!G${b+1}`, values:[[F(role,null,0.4)]]}); return; } }
      const i = rowOf(role); if (i<0){ unmatched.push(role); return; }
      const phased = ["Pre-Produzione","Produzione","Post-Produzione"].every((ph,k) => rows[i+k] && rows[i+k][2]===ph);
      if (phased) ["Pre-Produzione","Produzione","Post-Produzione"].forEach((ph,k) => upd.push({range:`PREVENTIVO!G${i+k+1}`, values:[[F(role,ph)]]}));
      else upd.push({range:`PREVENTIVO!G${i+1}`, values:[[F(role)]]});
    });
    upd.push({range:"PREVENTIVO!A1", values:[[S.script.title]]});
    await gfetch(SHEETS + f.id + "/values:batchUpdate", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({valueInputOption:"USER_ENTERED", data: upd})});
    const sh = {id: f.id, url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`, created: Date.now(), synced: Date.now()};
    const up = {}; up[`f/crew/${Cloud.pid}/_sheet`] = sh; await Cloud.update(up); CR.meta = sh; CR.unmatched = unmatched;
    render(); toast("Budget creato nel tuo Google Drive.", 4000);
  }catch(e){ gErr(e); }
}
async function budgetSync(){
  const sh = CR.meta; if (!sh) return;
  try{ await googleTokenFor(DRIVE_SCOPE); }catch(e){ gErr(e); return; }
  try{ const ss = await gfetch(SHEETS + sh.id + "?fields=sheets.properties"); await writeData(sh.id, ss.sheets);
    sh.synced = Date.now(); const up = {}; up[`f/crew/${Cloud.pid}/_sheet/synced`] = sh.synced; await Cloud.update(up); render(); toast("Dati aggiornati nel foglio del budget."); }
  catch(e){ if (e.status===404 || e.status===403) toast("Non trovo più il foglio: è stato cancellato o non è nel tuo Drive.", 5000); else gErr(e); }
}
document.addEventListener("click", e => { const b = e.target.closest("[data-bcreate],[data-bsync]"); if (!b) return; if (b.dataset.bcreate) budgetCreate(); else budgetSync(); });
