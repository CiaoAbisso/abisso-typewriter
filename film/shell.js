/* ================= Abisso Film Manager · aree di lavoro (come le pagine di DaVinci) ================= */
const AREAS = [
  {k:"copione", l:"Copione", ico:"M4 3h11l5 5v13H4z M14 3v6h6 M8 13h8 M8 17h6", views:[["copione","Copione"]]},
  {k:"spoglio", l:"Spoglio", ico:"M4 5h16 M4 10h10 M4 15h13 M4 20h8", views:[["spoglio","Spoglio"]]},
  {k:"piano", l:"Piano", ico:"M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4", views:[["calendario","Calendario"],["strisce","Strisce"],["dood","DOOD"],["report","Report"]]},
  {k:"troupe", l:"Troupe", ico:"M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21c0-4 3-6 7-6s7 2 7 6 M17 11a3 3 0 1 0 0-6 M22 21c0-3-2-5-5-5", views:[["crewlist","Crewlist"],["persona","Scheda"],["squadra","Accessi"]], need:"crew"},
  {k:"budget", l:"Budget", ico:"M4 3h16v18H4z M4 9h16 M4 15h16 M10 3v18", views:[["budget","Budget"]], need:"crew"},
  {k:"set", l:"Set", ico:"M3 7l4-4h10l4 4v12H3z M3 11h18 M12 11v8", views:[["odg","Ordine del giorno"],["trasporti","Trasporti"]]}
];
const areaOf = v => AREAS.find(a => a.views.some(x => x[0]===v)) || AREAS[1];
const areaOk = a => !a.need || canCrew();
function renderAreas(){
  const cur = areaOf(S.view);
  $("#areas").innerHTML = AREAS.filter(areaOk).map(a => `<button data-area="${a.k}" class="${a===cur?"on":""}" aria-label="${esc(a.l)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${a.ico}"/></svg><span>${esc(T(a.l))}</span></button>`).join("");
  $("#areas").hidden = false;
}
renderNav = function(){
  const a = areaOf(S.view); const hid = role()==="admin" ? [] : ["squadra"];
  $("#nav").innerHTML = `<span class="area-name">${esc(T(a.l))}</span>` + (a.views.length > 1 ? a.views.filter(v => !hid.includes(v[0])).map(([k,l]) => `<button data-v="${k}" class="${S.view===k?"on":""}">${esc(T(l))}</button>`).join("") : "");
};
const VIEWFN = () => ({spoglio:vSpoglio, strisce:vStrisce, calendario:vCal, dood:vDood, report:vReport, odg:vOdg, squadra:vTeam, copione:vCopione, crewlist:vCrew, persona:vPerson, budget:vBudget, trasporti:vTrasporti});
render = function(){
  if (!areaOk(areaOf(S.view)) || (S.view==="squadra" && role()!=="admin")) S.view = "spoglio";
  document.body.classList.toggle("ro", isRO());
  document.body.dataset.view = S.view;
  renderTop(); renderNav(); renderAreas();
  const v = $("#view");
  const phone = `<div class="phone-note">Sul telefono il Film Manager è in consultazione: per modificare apri il computer.</div>`;
  if (S.view==="copione" && $("#cframe")) return;     // non ricaricare il Typewriter a ogni aggiornamento
  v.innerHTML = (S.view==="copione" ? "" : phone) + (VIEWFN()[S.view] || vSpoglio)();
  if (S.view==="spoglio") afterSpoglio();
  if (S.view==="strisce") afterStrisce();
  if (S.view==="calendario") afterCal();
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
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-area],[data-go='refreshscript']"); if (!b || !S) return;
  if (b.dataset.area){ const a = AREAS.find(x => x.k===b.dataset.area); const last = (S.lastIn||{})[a.k]; S.lastIn = {...(S.lastIn||{}), [areaOf(S.view).k]: S.view};
    S.view = last && a.views.some(v => v[0]===last) ? last : a.views[0][0]; save(); render(); $("#view").scrollTop = 0; return; }
  if (b.dataset.go==="refreshscript"){ toast("Leggo l'ultima versione…"); try{ await updateScript(await Cloud.refreshSource(S.script.source)); }catch(err){ toast("Non riesco a leggere il copione d'origine."); } }
});
