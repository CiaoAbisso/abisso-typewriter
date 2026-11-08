/* ================= Abisso Film Manager · accessi per area di lavoro =================
   Ogni persona invitata ha, per ogni area, uno di tre livelli: "e" modifica, "v" vede, "-" niente.
   b/p/<pid>/members/<ek>/areas = {copione:"e", spoglio:"-", ...}. Senza "areas" valgono i ruoli predefiniti.
   Gli amministratori vedono e modificano tutto. Le aree chiuse restano nella barra, con il lucchetto.
   Le stesse regole stanno nel database: chi non ha l'area in modifica non può salvarne i dati. */
const AREA_KEYS = ["copione","spoglio","piano","troupe","budget","set","produzione","dossier"];
const ACC_L = {e:"Modifica", v:"Vede", "-":"—"};
const ROLE_PRESET = {
  prod:   {copione:"v", spoglio:"e", piano:"e", troupe:"e", budget:"e", set:"e", produzione:"e", dossier:"e"},
  ad:     {copione:"v", spoglio:"e", piano:"e", troupe:"-", budget:"-", set:"e", produzione:"-", dossier:"-"},
  regia:  {copione:"v", spoglio:"v", piano:"v", troupe:"-", budget:"-", set:"v", produzione:"v", dossier:"v"},
  autore: {copione:"e", spoglio:"-", piano:"-", troupe:"-", budget:"-", set:"-", produzione:"-", dossier:"-"},
  dept:   {copione:"v", spoglio:"v", piano:"v", troupe:"-", budget:"-", set:"v", produzione:"-", dossier:"-"},
  guest:  {copione:"-", spoglio:"-", piano:"v", troupe:"-", budget:"-", set:"v", produzione:"-", dossier:"-"}
};
Object.assign(ROLE_L, {regia:"Regia", autore:"Autore"});
const ROLE_ORDER = ["prod","ad","regia","autore","dept","guest"];
const ROLE_HINT = {prod:"tutto il progetto", ad:"spoglio, piano e ordini del giorno", regia:"vede copione, piano, set e dossier", autore:"solo il copione", dept:"vede lo spoglio del suo reparto, piano e set", guest:"vede piano e ordini del giorno"};

function memberAreas(m){ if (!m) return ROLE_PRESET.guest; return {...(ROLE_PRESET[m.role] || ROLE_PRESET.guest), ...(m.areas || {})}; }
function areaAccess(k){
  if (Cloud.isAdmin()){ const r = $("#roleSel") && $("#roleSel").value; return !r || r==="admin" ? "e" : (ROLE_PRESET[r]||{})[k] || "-"; }
  return memberAreas(Cloud.members[Cloud.ek(Cloud.email())])[k] || "-";
}
const viewArea = () => (S && typeof areaOf==="function") ? areaOf(S.view).k : "spoglio";
/* modificare = avere l'area di lavoro aperta in modifica */
canEditPlan = function(){ return areaAccess(viewArea())==="e"; };
function firstOpenView(){ const a = AREAS.find(a => areaAccess(a.k)!=="-"); return a ? a.views[0][0] : null; }

/* ---------- pagina Accessi (scheda dell'area Troupe, solo amministratori) ---------- */
vTeam = function(){
  const mem = Object.entries(Cloud.members || {}).sort((a,b) => (a[1].email||"").localeCompare(b[1].email||""));
  const deptOpts = S.cats.filter(c=>c.k!=="cast").map(c => `<label><input type="checkbox" data-ic="${c.k}">${esc(c.l)}</label>`).join("");
  const cell = (ek, k, v) => `<td><select class="acc acc-${v==="-"?"n":v}" data-axs="${esc(ek)}|${k}" aria-label="${esc(k)}">${["e","v","-"].map(x => `<option value="${x}" ${x===v?"selected":""}>${ACC_L[x]}</option>`).join("")}</select></td>`;
  const lab = k => (AREAS.find(a => a.k===k)||{}).l || k;
  return `<div class="wrap wide"><div class="head"><div><h2>Accessi</h2><p class="note">Voi amministratori vedete e modificate tutto. Ogni persona invitata riceve un link per email ed entra solo in questo progetto. Il ruolo dà un punto di partenza; poi per ogni area scegli Modifica, Vede o niente. Le aree che non può aprire le vede chiuse con il lucchetto.</p></div></div>
  <form class="box" id="inv"><h3>Invita una persona</h3>
    <div class="invite"><input type="email" id="invMail" required placeholder="email@esempio.it" aria-label="Email"><select id="invRole" aria-label="Ruolo">${ROLE_ORDER.map(r=>`<option value="${r}">${ROLE_L[r]} · ${ROLE_HINT[r]}</option>`).join("")}</select><button class="btn primary">${T("Invita")}</button></div>
    <div id="invCats" hidden><span class="muted" style="font-size:12px">Categorie dello spoglio che il reparto vede</span><div class="wd" style="margin-top:4px">${deptOpts}</div></div>
  </form>
  <section class="box"><h3>Chi accede a cosa</h3>
  <div class="tbl accmx"><table><thead><tr><th>Persona</th><th>Ruolo</th>${AREA_KEYS.map(k => `<th>${svgIco(k)}<span>${esc(lab(k))}</span></th>`).join("")}<th></th></tr></thead><tbody>
    <tr><td><b>${esc((window.ABISSO_ADMINS||[])[0]||"")}</b><br><small class="muted">Martin e Alberto</small></td><td>Admin</td>${AREA_KEYS.map(() => `<td><span class="pill ok">Tutto</span></td>`).join("")}<td></td></tr>
    ${mem.map(([ek,p]) => { const ar = memberAreas(p);
      return `<tr><td><b>${esc(p.name || p.email)}</b>${p.name ? `<br><small class="muted">${esc(p.email)}</small>` : ""}${p.role==="dept" ? `<br><small class="muted">${esc((p.cats||[]).map(k => (S.cats.find(c=>c.k===k)||{}).l || k).join(", "))}</small>` : ""}</td>
        <td><select data-mrole2="${esc(ek)}" aria-label="Ruolo di ${esc(p.email)}">${ROLE_ORDER.map(r=>`<option value="${r}" ${p.role===r?"selected":""}>${ROLE_L[r]}</option>`).join("")}</select>${p.areas ? `<br><button class="btn ghost" data-accreset="${esc(ek)}" style="height:26px;font-size:11.5px;padding:0 8px">Torna al ruolo</button>` : ""}</td>
        ${AREA_KEYS.map(k => cell(ek, k, ar[k])).join("")}
        <td class="acts"><button class="btn" data-resend="${esc(p.email)}">Rimanda il link</button><button class="btn" data-mdel="${esc(ek)}">Togli</button></td></tr>`; }).join("") || `<tr><td colspan="${AREA_KEYS.length+3}" class="muted">Nessuno invitato ancora.</td></tr>`}
  </tbody></table></div>
  <p class="note" style="margin:0">Le regole valgono anche nel database: chi ha un'area solo in lettura non può salvarne modifiche, e troupe e budget li legge solo chi ha quelle aree. Il Copione in modifica funziona quando il progetto segue un copione condiviso dal Typewriter.</p></section></div>`;
};

/* il ruolo cambia il punto di partenza; i permessi delle aree si scrivono a parte */
async function setAreas(ek, areas){ const up = {}; up[`b/p/${Cloud.pid}/members/${ek}/areas`] = areas; await Cloud.update(up); }
document.addEventListener("change", async e => {
  const t = e.target; if (!S || !t.dataset) return;
  if (t.dataset.axs){ const [ek, k] = t.dataset.axs.split("|"); const m = Cloud.members[ek]; if (!m) return;
    const ar = memberAreas(m); ar[k] = t.value; t.className = `acc acc-${t.value==="-"?"n":t.value}`;
    try{ await setAreas(ek, ar); toast(`${(AREAS.find(a=>a.k===k)||{}).l}: ${ACC_L[t.value]==="—" ? "nessun accesso" : ACC_L[t.value].toLowerCase()} per ${m.name||m.email}.`); }catch(err){ console.error(err); toast("Non salvato: riprova."); } }
  else if (t.dataset.mrole2){ const ek = t.dataset.mrole2, r = t.value;
    try{ await Cloud.setRole(ek, r, r==="dept" ? ((Cloud.members[ek]||{}).cats || []) : []); await setAreas(ek, null); toast(`Ruolo ${ROLE_L[r]}: accessi riportati a quelli del ruolo.`); }catch(err){ console.error(err); toast("Non salvato: riprova."); } }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-accreset],[data-area]"); if (!b || !S) return;
  if (b.dataset.accreset){ await setAreas(b.dataset.accreset, null); toast("Accessi riportati a quelli del ruolo."); return; }
  if (b.dataset.area && b.classList.contains("locked")){ e.stopImmediatePropagation(); toast("Quest'area è chiusa per te: chiedi l'accesso alla produzione."); }
}, true);

/* ---------- Copione: chi modifica lavora sul copione condiviso, non sul Typewriter personale ---------- */
vCopione = function(){
  const src = S.script.source || {}; const admin = Cloud.isAdmin(); const acc = areaAccess("copione");
  const shared = src.kind==="shared" && src.sid;
  const frame = shared ? `../#c-${encodeURIComponent(src.sid)}` : "../";
  if (!admin && !shared) return `<div class="wrap"><div class="box"><h3>Copione</h3><p class="note" style="margin:0">Il copione di questo progetto è nell'archivio privato dello studio. Per lavorarci serve un copione condiviso: chiedi alla produzione di condividerlo dal Typewriter e collegarlo al progetto.</p></div></div>`;
  return `<div class="cbar"><span class="note">${shared ? (acc==="e" ? "Stai lavorando sul copione condiviso del progetto: le modifiche arrivano a chi lo segue." : "Copione del progetto in consultazione.") : `Il Copione è Abisso Typewriter${src.kind==="cloud" ? `: questo progetto segue «${esc(S.script.title)}»` : ""}.`} Quando il copione cambia, aggiorna il progetto.</span>
    <span class="row">${admin && src.kind!=="file" ? `<button class="btn primary" data-go="refreshscript">Aggiorna il progetto dal copione</button>` : ""}<a class="btn" href="${frame}" target="_blank" rel="noopener">Apri in una finestra</a></span></div>
    <iframe id="cframe" src="${frame}" title="Abisso Typewriter"></iframe>`;
};

/* ---------- aree in sola lettura: campi bloccati e comandi che modificano nascosti ---------- */
const MUTATE = "[data-crewadd],[data-crewdel],[data-crewdup],[data-acc],[data-bcreate],[data-bsync],[data-pradd],[data-prdel],[data-prmadd],[data-prmdel],[data-prin],[data-csadd],[data-csdel],[data-cswx],[data-csreset],[data-csmv],[data-cshalf],[data-csoff],[data-dsmv],[data-dsoff],[data-dspreset],[data-dockx],[data-go='refreshscript'],[data-act='toST'],.edit-only";
function lockView(){
  if (!S || areaAccess(viewArea())!=="v") return; const v = $("#view");
  $$("input,select,textarea", v).forEach(el => { if (el.matches("select.sm,#crewPick,#csDay,[data-keep]")) return; el.disabled = true; });
  $$(MUTATE, v).forEach(el => el.hidden = true);
  $$("[data-prph],[data-prbio]", v).forEach(el => { el.style.pointerEvents = "none"; });
  $$("[draggable=true]", v).forEach(el => el.setAttribute("draggable","false"));
}
const renderAcc = render;
render = function(){ renderAcc(); lockView(); };
