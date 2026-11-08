/* ================= Abisso Film Manager · piano: tempi, sistemi di lavoro, calendario ================= */
/* strisce di servizio: [chiave, nome, minuti predefiniti, colore] */
const SERVICES = [
  ["prep","Preparazione e set-up",30,"#e3e3e8"],["move","Company move",45,"#ffd0b5"],["pranzo","Pausa pranzo",60,"#bfe3c8"],
  ["mua","Trucco e costumi",60,"#c9d8ff"],["prove","Prove",30,"#c9d8ff"],["luce","Cambio luce",20,"#ffe08a"],
  ["viaggio","Viaggio",30,"#ffd0b5"],["second","Seconda unità",0,"#e3e3e8"],["iftime","Se c'è tempo",0,"#ffe08a"],["wrap","Wrap",30,"#e3e3e8"]];
const MEAL_SVC = ["pranzo"];

/* sistemi di lavoro: minuti di lavoro, pausa pasto, massimo di lavoro continuo, riposo minimo tra due giornate */
const WORK_SYSTEMS = {
  it9:  {l:"Italia · CCNL troupe 9+1", work:540, meal:60, cont:360, rest:660,
         note:"9 ore di lavoro più 1 ora di pausa non retribuita, che inizia tra le 12 e le 14; mai più di 6 ore di fila; 11 ore di riposo tra due giornate (CCNL addetti alle troupe, art. 1)."},
  it7:  {l:"Italia · orario continuato 7 ore", work:420, meal:15, cont:420, rest:660,
         note:"7 ore senza pausa, retribuite come 8 (CCNL addetti alle troupe, art. 1). I 15 minuti di pausa breve sono prassi di set, il contratto non li prevede."},
  uk10: {l:"Regno Unito · standard day 10+1", work:600, meal:60, cont:360, rest:660,
         note:"10 ore di riprese più 1 ora di pranzo non retribuita (accordi Pact–Bectu)."},
  ukc:  {l:"Regno Unito · continuous working day", work:540, meal:20, cont:540, rest:660,
         note:"9 ore senza pausa formale, con una pausa informale fino a 20 minuti."},
  us12: {l:"Stati Uniti · giornata da 12 ore", work:690, meal:30, cont:360, rest:600,
         note:"Prassi americana: circa 12 ore, pasto entro 6 ore dalla convocazione, 10 ore di riposo per la troupe locale (IATSE)."},
  de:   {l:"Germania · legge sull'orario (ArbZG)", work:600, meal:45, cont:360, rest:660,
         note:"8 ore, fino a 10; pausa di 30 minuti oltre 6 ore e di 45 oltre 9; 11 ore di riposo. Il contratto TV FFS permette giornate più lunghe con accordi specifici: da verificare con la produzione tedesca."},
  fr:   {l:"Francia · Code du travail", work:600, meal:60, cont:360, rest:660,
         note:"Massimo 10 ore al giorno, almeno 20 minuti di pausa dopo 6 ore (sul set di solito 1 ora di pranzo), 11 ore di riposo. La convenzione collettiva del cinema può fissare regole proprie: da verificare."}
};
function sysP(){ const b = WORK_SYSTEMS[S.sys] || WORK_SYSTEMS.it9; const c = S.sysc && S.sysc.base===S.sys ? S.sysc : {}; return {...b, ...Object.fromEntries(Object.entries(c).filter(([k,v]) => k!=="base" && v!=null && v!==""))}; }
const durL = m => { m = Math.round(m); const h = Math.floor(m/60), r = m%60; return h ? `${h}h${r ? String(r).padStart(2,"0") : ""}` : `${r}'`; };
function parseDur(v){ v = String(v||"").trim().replace(",", "."); if (!v) return null; let m;
  if ((m = v.match(/^(\d+)\s*[:h.]\s*(\d{1,2})$/))) return +m[1]*60 + +m[2];
  if ((m = v.match(/^(\d+)\s*h$/i))) return +m[1]*60;
  if ((m = v.match(/^(\d+)\s*'?$/))) return +m[1];
  return null; }
/* tempo di ripresa: scritto a mano, oppure stimato dagli ottavi e dal ritmo del piano */
function estMin(s){ return Math.max(5, Math.round(s.e8 * sysP().work / Math.max(1, S.target) / 5) * 5); }
function sceneMin(id){ const s = A.by[id]; if (!s) return {m:0, est:false}; if (s.banner) return {m:+s.min||0, est:false};
  const t = (S.times||{})[id]; return t!=null ? {m:+t, est:false} : {m:estMin(s), est:true}; }
function timeCell(id){ const t = sceneMin(id);
  return `<input class="tmin ${t.est?"est":""}" data-tmin="${id}" value="${t.est ? "" : durL(t.m)}" placeholder="${durL(t.m)}" title="${t.est ? "Stima dagli ottavi: scrivi il tempo deciso con la regia" : "Tempo di ripresa"}" aria-label="Tempo di ripresa della scena ${esc(A.by[id].n)}" ${isRO()?"disabled":""}>`; }
function daySched(d){
  const P = sysP(); let t = toMin(S.call || "07:00"); let work = 0, meal = 0, run = 0, maxRun = 0, hasMeal = false, est = 0;
  const items = d.ids.map(id => { const s = A.by[id]; const st = sceneMin(id); const isMeal = s.banner && MEAL_SVC.includes(s.svc);
    const it = {id, s, start:t, end:t+st.m, m:st.m, est:st.est, meal:isMeal}; t += st.m;
    if (isMeal){ meal += st.m; hasMeal = true; run = 0; } else { work += st.m; run += st.m; maxRun = Math.max(maxRun, run); }
    if (st.est) est++; return it; });
  return {items, start: toMin(S.call || "07:00"), end:t, work, meal, maxRun, hasMeal, est, P,
    over: work > P.work, longRun: maxRun > P.cont && P.meal >= 30, noMeal: !hasMeal && work > P.cont && P.meal >= 30};
}
function dayTimesLabel(d){ const x = daySched(d); return `${hm(x.start)} → ${hm(x.end)} · ${durL(x.work)} di lavoro${x.over ? " · oltre l'orario" : ""}`; }

/* avvisi del piano: quelli della Board più orari e riposi */
const warningsBase = warnings;
warnings = function(){
  const w = warningsBase(); const D = days(); const P = sysP();
  D.forEach((d,i) => { const x = daySched(d);
    if (x.over) w.push(`Giornata ${i+1}: ${durL(x.work)} di lavoro, oltre le ${durL(P.work)} del sistema «${P.l}».`);
    if (x.noMeal) w.push(`Giornata ${i+1}: manca la pausa pranzo (${durL(P.meal)}) e il lavoro supera ${durL(P.cont)} di fila.`);
    else if (x.longRun) w.push(`Giornata ${i+1}: più di ${durL(P.cont)} di lavoro senza pausa.`);
    if (D[i+1]){ const rest = 1440 - x.end + toMin(S.call || "07:00"); const gap = (Date.parse(D[i+1].date) - Date.parse(d.date)) / 864e5;
      if (gap === 1 && rest < P.rest) w.push(`Tra la giornata ${i+1} e la ${i+2} il riposo è di ${durL(rest)}: ne servono ${durL(P.rest)}.`); }
  });
  return w;
};

/* ---------- calendario come Movie Magic: giornate in colonne, strisce trascinabili ---------- */
vCal = function(){
  const D = days(); if (!D.length || !D[0].ids.length) return `<div class="wrap"><p class="note">Il piano è vuoto.</p></div>`;
  const byDate = Object.fromEntries(D.map(d=>[d.date,d])); const P = sysP();
  const loc = {it:"it-IT",en:"en-GB",de:"de-DE",uk:"uk-UA"}[LANG];
  const d0 = new Date(D[0].date+"T12:00:00"); d0.setDate(d0.getDate() - ((d0.getDay()+6)%7));
  const dl = new Date(D[D.length-1].date+"T12:00:00");
  const weeks = []; for (const w = new Date(d0); w <= dl; w.setDate(w.getDate()+7)) weeks.push(new Date(w));
  const wdn = [1,2,3,4,5,6,0].map(i => new Date(2027,1,i===0?7:i,12).toLocaleDateString(loc,{weekday:"long"}));
  const chip = id => { const s = A.by[id]; const t = sceneMin(id);
    if (s.banner) return `<div class="cchip svc" draggable="true" data-cid="${id}" style="--cb:${esc(s.color)}" title="${esc(s.text)}"><b>${esc(s.text)}</b>${s.min?`<i>${durL(s.min)}</i>`:""}</div>`;
    return `<div class="cchip" draggable="true" data-cid="${id}" style="${stripVars(s)}" title="${esc(s.n+": "+s.loc)}"><b>${esc(s.n)}:</b> ${esc(s.loc)}<i class="${t.est?"est":""}">${durL(t.m)}</i></div>`; };
  const cells = weeks.map(w => `<div class="cweek">${[0,1,2,3,4,5,6].map(k => { const dt = new Date(w); dt.setDate(dt.getDate()+k); const iso = dt.toISOString().slice(0,10); const d = byDate[iso];
      const off = S.off.includes(dt.getDay()); const dn = dt.toLocaleDateString(loc,{day:"numeric", month: dt.getDate()===1 || (w===weeks[0] && k===0) ? "short" : undefined});
      if (!d) return `<div class="cday ${off?"off":"free"}"><div class="chead"><span></span><span class="cnum">${esc(dn)}</span></div></div>`;
      const x = daySched(d);
      return `<div class="cday shoot ${S.calDay===d.i?"sel":""}" data-cday="${d.i}"><button class="chead" data-pickday="${d.i}"><span><b>${T("Giornata")} ${d.i+1}</b></span><span class="cnum">${esc(dn)}</span>
        <span class="cmeta ${x.over||x.noMeal?"bad":""}">${hm(x.start)}–${hm(x.end)} · ${eighths(d.e8)} pag.</span></button>
        <div class="cbody" data-cdrop="${d.i}">${d.ids.map(chip).join("")}</div></div>`; }).join("")}</div>`).join("");
  return `<div class="wrap wide"><div class="head"><div><h2>${T("Calendario")}</h2><p class="note">Trascina le strisce dentro la giornata o su un altro giorno: le Strisce si aggiornano da sole. I tempi in grigio sono stime dagli ottavi; scrivi quelli decisi con la regia nel pannello della giornata.</p></div>
    <div class="row"><button class="btn" data-exp="cal:ics">.ics</button><button class="btn" data-exp="cal:google">Google Calendar</button></div></div>
    <div class="cal-layout"><div class="calgrid"><div class="cweek chdr">${wdn.map(n=>`<div>${esc(n)}</div>`).join("")}</div>${cells}</div>
    <aside class="side">${dayPanel(D)}${sysPanel()}</aside></div></div>`;
};
function dayPanel(D){
  const d = D[Math.min(S.calDay||0, D.length-1)]; const x = daySched(d); const P = sysP();
  const W = warnings().filter(w => w.startsWith(`Giornata ${d.i+1}:`) || w.startsWith(`Giornata ${d.i+1} `) || w.includes(`giornata ${d.i+1} e`));
  return `<div class="box"><div class="row" style="justify-content:space-between"><h3>${T("Giornata")} ${d.i+1}</h3><span class="muted" style="font-size:12px">${esc(fmtDate(d.date,{weekday:"long",day:"numeric",month:"long"}))}</span></div>
    <div class="kpis"><div><small>Convocazione</small><input type="time" id="calCall" value="${esc(S.call)}" class="edit-only"><b class="ro-only">${esc(S.call)}</b></div><div><small>Fine stimata</small><b>${hm(x.end)}</b></div><div><small>Lavoro</small><b class="${x.over?"badt":""}">${durL(x.work)}</b><small>su ${durL(P.work)}</small></div><div><small>Pagine</small><b>${eighths(d.e8)}</b></div></div>
    <ol class="sched">${x.items.map(it => `<li class="${it.s.banner?"svc":""}" ${it.s.banner?`style="--cb:${esc(it.s.color)}"`:`style="${stripVars(it.s)}"`}><span class="tm">${hm(it.start)}</span>
      <span class="what">${it.s.banner ? `<b>${esc(it.s.text)}</b>` : `<b>${esc(it.s.n)}</b> ${esc(it.s.loc)}<small>${esc(it.s.ie)} · ${it.s.dn} · ${eighths(it.s.e8)}</small>`}</span>
      ${it.s.banner ? `<button class="btn ghost edit-only" data-edx="${it.id}" aria-label="Modifica">${durL(it.m)}</button>` : timeCell(it.id)}</li>`).join("")}</ol>
    <div class="edit-only"><span class="muted" style="font-size:12px">Aggiungi alla giornata</span><div class="tags" style="margin-top:4px">${SERVICES.map(([k,l,m])=>`<button class="tag addsvc" data-addsvc="${k}" data-day="${d.i}">+ ${esc(l)}</button>`).join("")}</div></div>
    ${W.length ? `<ul class="warnlist">${W.map(w=>`<li>${esc(w)}</li>`).join("")}</ul>` : `<ul class="warnlist"><li class="ok">Nessun conflitto in questa giornata.</li></ul>`}</div>`;
}
function sysPanel(){
  const P = sysP(); const c = S.sysc && S.sysc.base===S.sys ? S.sysc : {};
  const f = (k, l) => `<label>${l}<input type="number" min="0" step="5" data-sysc="${k}" value="${c[k]!=null && c[k]!=="" ? c[k] : ""}" placeholder="${P[k]}"></label>`;
  return `<div class="box"><h3>Sistema di lavoro</h3>
    <select id="sysSel" class="edit-only" aria-label="Sistema di lavoro">${Object.entries(WORK_SYSTEMS).map(([k,v])=>`<option value="${k}" ${S.sys===k?"selected":""}>${esc(v.l)}</option>`).join("")}</select>
    <p class="note">${esc(P.note)}</p>
    <div class="grid4 edit-only">${f("work","Lavoro (min)")}${f("meal","Pausa (min)")}${f("cont","Max di fila (min)")}${f("rest","Riposo (min)")}</div>
    <p class="note">I valori vuoti seguono il sistema scelto. Le regole straniere sono indicative: verificale con la produzione del paese.</p></div>`;
}
function addService(key, dayIdx){
  const sv = SERVICES.find(z => z[0]===key); const rid = "x" + Date.now().toString(36);
  S.extra[rid] = {kind:"banner", text:sv[1], color:sv[3], min:sv[2], svc:sv[0]};
  let seen = 0, at = S.order.length; for (let i=0;i<S.order.length;i++){ if (S.order[i]==="|"){ if (seen===dayIdx){ at = i; break; } seen++; } }
  S.order.splice(at, 0, rid); analyse(); save(); render();
}

/* trascinamento nel calendario */
let calDrag = null;
function afterCal(){
  const g = $(".calgrid"); if (!g) return; const can = !isRO() && !matchMedia("(max-width:760px)").matches;
  $$(".cchip", g).forEach(el => { el.draggable = can;
    el.addEventListener("dragstart", e => { calDrag = el.dataset.cid; el.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", calDrag); });
    el.addEventListener("dragend", () => { el.classList.remove("dragging"); $$(".over", g).forEach(x=>x.classList.remove("over")); });
    el.addEventListener("dragover", e => { e.preventDefault(); e.stopPropagation(); $$(".over", g).forEach(x=>x.classList.remove("over")); el.classList.add("over"); });
    el.addEventListener("drop", e => { e.preventDefault(); e.stopPropagation(); if (calDrag && calDrag!==el.dataset.cid){ moveToken(calDrag, el.dataset.cid); } calDrag = null; }); });
  $$("[data-cdrop]", g).forEach(el => {
    el.addEventListener("dragover", e => { e.preventDefault(); $$(".over", g).forEach(x=>x.classList.remove("over")); el.classList.add("over"); });
    el.addEventListener("drop", e => { e.preventDefault(); if (calDrag){ const di = +el.dataset.cdrop; S.calDay = di; moveToken(calDrag, "|" + di); } calDrag = null; }); });
}
document.addEventListener("change", e => {
  const t = e.target; if (!S) return;
  if (t.dataset && t.dataset.tmin){ const v = parseDur(t.value); S.times = S.times || {}; if (v==null) delete S.times[t.dataset.tmin]; else S.times[t.dataset.tmin] = v; save(); render(); }
  else if (t.id==="sysSel"){ S.sys = t.value; save(); render(); }
  else if (t.dataset && t.dataset.sysc){ S.sysc = S.sysc && S.sysc.base===S.sys ? S.sysc : {base:S.sys}; const v = t.value==="" ? null : Math.max(0, +t.value); S.sysc[t.dataset.sysc] = v; save(); render(); }
  else if (t.id==="calCall"){ S.call = t.value || S.call; save(); render(); }
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-pickday],[data-addsvc]"); if (!b || !S) return;
  if (b.dataset.pickday!=null){ S.calDay = +b.dataset.pickday; save(); render(); }
  else if (b.dataset.addsvc){ addService(b.dataset.addsvc, +b.dataset.day); toast("Striscia aggiunta in fondo alla giornata: trascinala dove serve."); }
});
