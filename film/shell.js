/* ================= Abisso Film Manager · aree di lavoro (come le pagine di DaVinci) ================= */
/* icone disegnate per l'ambiente: tratto 1.6, un dettaglio pieno che diventa rosso nell'area attiva */
const ICO = {
  copione:`<path d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M14.5 2.5V7H19"/><path d="M8.8 11h7.4M8.8 14h7.4M8.8 17h4"/><rect class="fill acc" x="13.6" y="16" width="2.2" height="2.6"/>`,
  spoglio:`<path d="M3.5 6h9M3.5 10h6M3.5 14h8M3.5 18h5"/><path d="M14.2 16.6 19.6 4.4l2.4 1.1-5.4 12.2-3 1.9z"/><path class="acc" d="M12.6 21h8.6"/>`,
  piano:`<rect x="3" y="3.5" width="18" height="3.4"/><rect class="fill acc" x="3" y="8.6" width="18" height="3.4"/><rect x="3" y="13.7" width="18" height="3.4"/><path d="M3 20.5h11"/>`,
  troupe:`<circle cx="8.5" cy="8" r="3.3"/><path d="M2.5 20.5c.4-4 2.9-6.2 6-6.2s5.6 2.2 6 6.2"/><circle class="acc" cx="16.6" cy="7.2" r="2.6"/><path class="acc" d="M16.4 12.4c3 0 4.8 2 5.1 5.4"/>`,
  budget:`<circle cx="12" cy="12" r="9"/><path class="acc" d="M15.6 8.2a4.6 4.6 0 1 0 0 7.6"/><path class="acc" d="M7.2 10.8h6.2M7.2 13.4h6.2"/>`,
  set:`<path d="M3.5 10h17v10.5h-17z"/><path d="M3.5 10 4 5.6l16.2-2 .5 4.1z"/><path class="acc" d="m8.4 5 2.4 3.6M13.6 4.4 16 8"/><path d="M7 14h6"/>`,
  produzione:`<rect x="2.8" y="5" width="18.4" height="14" /><circle cx="8.3" cy="11" r="2.3"/><path d="M5 16.5c.5-1.8 1.7-2.8 3.3-2.8s2.8 1 3.3 2.8"/><path class="acc" d="M14 9.5h4.6M14 12.5h4.6M14 15.5h3"/>`,
  dossier:`<path d="M5.5 6.5h13v14h-13z"/><path d="M8 3.5h13v14"/><path class="acc" d="m10.3 10.4 4.2 3.1-4.2 3.1z"/>`
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
