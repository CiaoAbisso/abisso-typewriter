/* ================= Abisso Film Manager · aree di lavoro (come le pagine di DaVinci) ================= */
/* icone disegnate per l'ambiente: tratto 1.6, un dettaglio pieno che diventa rosso nell'area attiva */
const ICO = {
  copione:`<path d="M6 3h8.5L19 7.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path class="acc" d="M8.5 12.5h7M8.5 16h4.5"/>`,
  spoglio:`<path d="M4 6h8M4 10.5h5M4 15h7M4 19.5h5"/><path class="acc" d="m14.5 17.5 5.3-11a1.6 1.6 0 0 1 2.9 1.4l-5.3 11-3.4 1.6z"/>`,
  piano:`<rect x="3" y="3.5" width="18" height="4" rx="1.4"/><rect class="acc" x="3" y="10" width="18" height="4" rx="1.4"/><rect x="3" y="16.5" width="11" height="4" rx="1.4"/>`,
  troupe:`<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle class="acc" cx="17" cy="8.5" r="2.4"/><path class="acc" d="M16.5 13.5c2.4.2 4 1.8 4.5 4.5"/>`,
  budget:`<circle cx="12" cy="12" r="9"/><path class="acc" d="M15.5 8.5a4 4 0 1 0 0 7M7 11h6M7 13.5h6"/>`,
  set:`<rect x="3" y="9.5" width="18" height="11" rx="1.6"/><path d="m3.6 9.4-.5-3.2a1 1 0 0 1 .8-1.1l15-2.4a1 1 0 0 1 1.2.8l.4 2.9"/><path class="acc" d="m8 4.8 2.4 3.9M13.2 4l2.4 3.9"/>`,
  produzione:`<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.6" cy="10.5" r="2.3"/><path d="M5.3 16.5c.5-1.8 1.7-2.8 3.3-2.8s2.8 1 3.3 2.8"/><path class="acc" d="M14.5 9.5h4M14.5 12.5h4M14.5 15.5h2.5"/>`,
  dossier:`<rect x="4" y="6" width="14" height="15" rx="1.8"/><path d="M8 3h10.2A1.8 1.8 0 0 1 20 4.8V17"/><path class="acc" d="m9.5 10.5 4.5 3-4.5 3z"/>`
};
const AREAS = [
  {k:"copione", l:"Copione", views:[["copione","Copione"]]},
  {k:"spoglio", l:"Spoglio", views:[["spoglio","Spoglio"]]},
  {k:"piano", l:"Piano", views:[["calendario","Calendario"],["strisce","Strisce"],["dood","DOOD"],["report","Report"]]},
  {k:"troupe", l:"Troupe", views:[["crewlist","Crewlist"],["persona","Scheda"],["squadra","Accessi"]], need:"crew"},
  {k:"budget", l:"Budget", views:[["budget","Budget"]], need:"crew"},
  {k:"set", l:"Set", views:[["odg","Ordine del giorno"],["trasporti","Trasporti"]]},
  {k:"produzione", l:"Produzione", views:[["prodinfo","Scheda film"],["prodpeople","Persone"],["prodmedia","Immagini"]], need:"crew", sep:true},
  {k:"dossier", l:"Dossier", views:[["dossier","Dossier"]], need:"crew"}
];
const svgIco = k => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICO[k]||""}</svg>`;
const areaOf = v => AREAS.find(a => a.views.some(x => x[0]===v)) || AREAS[1];
const areaOk = a => !a.need || canCrew();
function renderAreas(){
  const cur = areaOf(S.view);
  $("#areas").innerHTML = AREAS.filter(areaOk).map(a => `${a.sep ? `<span class="sep" aria-hidden="true"></span>` : ""}<button data-area="${a.k}" class="${a===cur?"on":""}" aria-label="${esc(a.l)}" ${a===cur?'aria-current="page"':""}>${svgIco(a.k)}<span>${esc(T(a.l))}</span></button>`).join("");
  $("#areas").hidden = false;
}
renderNav = function(){
  const a = areaOf(S.view); const hid = role()==="admin" ? [] : ["squadra"];
  $("#nav").innerHTML = `<span class="area-name">${svgIco(a.k)}${esc(T(a.l))}</span>` + (a.views.length > 1 ? a.views.filter(v => !hid.includes(v[0])).map(([k,l]) => `<button data-v="${k}" class="${S.view===k?"on":""}">${esc(T(l))}</button>`).join("") : "");
};
const VIEWFN = () => ({spoglio:vSpoglio, strisce:vStrisce, calendario:vCal, dood:vDood, report:vReport, odg:vOdg, squadra:vTeam, copione:vCopione, crewlist:vCrew, persona:vPerson, budget:vBudget, trasporti:vTrasporti,
  prodinfo:vProdInfo, prodpeople:vProdPeople, prodmedia:vProdMedia, dossier:vDossier});
const AFTER = {spoglio:() => afterSpoglio(), strisce:() => afterStrisce(), calendario:() => afterCal()};
render = function(){
  if (!areaOk(areaOf(S.view)) || (S.view==="squadra" && role()!=="admin")) S.view = "spoglio";
  document.body.classList.toggle("ro", isRO());
  document.body.dataset.view = S.view;
  renderTop(); renderNav(); renderAreas();
  const v = $("#view");
  const phone = `<div class="phone-note">Sul telefono il Film Manager è in consultazione: per modificare apri il computer.</div>`;
  if (S.view==="copione" && $("#cframe")) return;     // non ricaricare il Typewriter a ogni aggiornamento
  v.innerHTML = (S.view==="copione" ? "" : phone) + (VIEWFN()[S.view] || vSpoglio)();
  (AFTER[S.view] || (() => {}))();
  $$("[data-sort]", v).forEach(bindSort);
};
function vCopione(){
  const src = S.script.source || {};
  return `<div class="cbar"><span class="note">Il Copione è Abisso Typewriter${src.kind==="cloud" ? `: questo progetto segue «${esc(S.script.title)}»` : ""}. Quando cambi il copione, aggiorna il progetto.</span>
    <span class="row">${Cloud.myRole()==="admin" && src.kind!=="file" ? `<button class="btn primary" data-go="refreshscript">Aggiorna il progetto dal copione</button>` : ""}<a class="btn" href="../" target="_blank" rel="noopener">Apri in una finestra</a></span></div>
    <iframe id="cframe" src="../" title="Abisso Typewriter"></iframe>`;
}
function vTrasporti(){
  const D = days(); const di = Math.min(S.csDay||0, D.length-1);
  return `<div class="wrap"><div class="head"><div><h2>Trasporti</h2><p class="note">Set Transport gira su Cloudflare, separato da questo ambiente. Le corse della giornata escono già pronte dall'ordine del giorno; il collegamento diretto, senza copia e incolla, è il prossimo passo.</p></div></div>
    <div class="grid2"><div class="box"><h3>Set Transport</h3><p class="note">Apri Set Transport per gestire corse, autisti e mezzi.</p><a class="btn primary" href="https://set-transport.ciao-abissostudio.workers.dev" target="_blank" rel="noopener" style="justify-self:start">Apri Set Transport</a></div>
    <div class="box"><h3>Corse della giornata</h3><select class="sm" id="csDay" aria-label="Giornata">${D.map((x,i)=>`<option value="${i}" ${i===di?"selected":""}>${T("Giornata")} ${i+1} · ${esc(fmtDate(x.date))}</option>`).join("")}</select>
      <button class="btn" data-exp="st:js" style="justify-self:start">Prepara le corse per Set Transport</button></div></div></div>`;
}

/* ---------- elenco riordinabile (sezioni dell'ordine del giorno e del dossier) ----------
   <ol class="sortlist" data-sort="nome"> con <li data-k="chiave">: trascinando si chiama SORT[nome](nuovoOrdine) */
const SORT = {};
let sortDrag = null;
function bindSort(ol){
  ol.addEventListener("dragstart", e => { const li = e.target.closest("li[data-k]"); if (!li) return; sortDrag = li; li.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try{ e.dataTransfer.setData("text/plain", li.dataset.k); }catch(err){} });
  ol.addEventListener("dragend", () => { if (sortDrag) sortDrag.classList.remove("dragging"); sortDrag = null; $$("li.over", ol).forEach(x => x.classList.remove("over")); });
  ol.addEventListener("dragover", e => { if (!sortDrag) return; e.preventDefault(); const li = e.target.closest("li[data-k]"); $$("li.over", ol).forEach(x => x.classList.remove("over")); if (li && li!==sortDrag) li.classList.add("over"); });
  ol.addEventListener("drop", e => { if (!sortDrag) return; e.preventDefault(); const li = e.target.closest("li[data-k]");
    const keys = $$("li[data-k]", ol).map(x => x.dataset.k).filter(k => k!==sortDrag.dataset.k);
    const at = li && li!==sortDrag ? keys.indexOf(li.dataset.k) : keys.length; keys.splice(at < 0 ? keys.length : at, 0, sortDrag.dataset.k);
    const fn = SORT[ol.dataset.sort]; sortDrag = null; if (fn) fn(keys); });
}
const moveIn = (arr, k, dir) => { const i = arr.indexOf(k), j = i + dir; if (i < 0 || j < 0 || j >= arr.length) return arr; const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a; };

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-area],[data-go='refreshscript']"); if (!b || !S) return;
  if (b.dataset.area){ const a = AREAS.find(x => x.k===b.dataset.area); const last = (S.lastIn||{})[a.k]; S.lastIn = {...(S.lastIn||{}), [areaOf(S.view).k]: S.view};
    S.view = last && a.views.some(v => v[0]===last) ? last : a.views[0][0]; save(); render(); $("#view").scrollTop = 0; return; }
  if (b.dataset.go==="refreshscript"){ toast("Leggo l'ultima versione…"); try{ await updateScript(await Cloud.refreshSource(S.script.source)); }catch(err){ toast("Non riesco a leggere il copione d'origine."); } }
});
