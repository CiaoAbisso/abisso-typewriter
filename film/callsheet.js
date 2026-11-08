/* ================= Abisso Film Manager · Ordine del giorno modulare =================
   Modello costruito sugli ODG di Abisso (Il Senso della Terra, BSP) e sugli standard internazionali
   (StudioBinder, Zacuto): intestazione con convocazione, contatti, orari, location con ospedale,
   meteo ed effemeridi, avvisi, scene, cast con stato DOOD, figurazioni, note dei reparti, troupe,
   trasporti, giornata successiva, canali radio, regole del set.
   S.cs  = modello del progetto: ordine e visibilità delle sezioni, larghezza, testi fissi, dati delle location
   S.csd = dati della singola giornata, per data: orari, meteo, avvisi, orari del cast, comparse, chiamate della troupe */
const CS_SECTIONS = [
  ["head","Intestazione",1,0], ["contacts","Contatti principali",1,1], ["times","Orari della giornata",1,1],
  ["place","Location e logistica",1,1], ["weather","Meteo ed effemeridi",1,1], ["alert","Avvisi importanti",1,0],
  ["scenes","Scene",1,0], ["cast","Cast",1,0], ["extras","Figurazioni, comparse e stunt",1,0],
  ["depts","Note dei reparti",1,0], ["crew","Troupe",1,0], ["transport","Trasporti",1,0],
  ["advance","Giornata successiva",1,0], ["walkie","Canali radio",1,1], ["rules","Regole del set",1,1]
];
const CS_RULES = "Non è consentito portare sul set persone estranee senza l'autorizzazione preventiva della produzione.\nÈ vietato tenere accesi i telefoni durante le riprese e fumare sul set.\nImpegniamoci a evitare gli sprechi: seguite la raccolta differenziata e rispettate l'ambiente in cui lavoriamo.\nIn caso di dubbi contattate la produzione. Grazie!";
const CS_WALKIE = "1 · Produzione\n2 · Regia e aiuto regia\n3 · Camera\n4 · Elettricisti e macchinisti\n5 · Costumi, trucco e parrucco\n6 · Scenografia e attrezzeria";
const CS_TIMES = [["crew","Convocazione troupe"],["brief","Safety briefing"],["ready","Pronti a girare"],["lunch","Pausa pranzo"],["wrap","Wrap"],["end","Fine giornata"]];
const WMO = c => c==null ? "" : c===0 ? "Sereno" : c<=2 ? "Poco nuvoloso" : c===3 ? "Coperto" : c<=48 ? "Nebbia" : c<=57 ? "Pioviggine" : c<=67 ? "Pioggia" : c<=77 ? "Neve" : c<=82 ? "Rovesci" : c<=86 ? "Rovesci di neve" : "Temporale";

function csTpl(){
  const t = S.cs = S.cs || {};
  const keys = CS_SECTIONS.map(s => s[0]);
  t.order = (t.order || []).filter(k => keys.includes(k)); keys.forEach(k => { if (!t.order.includes(k)) t.order.push(k); });
  t.off = t.off || {}; t.half = t.half || Object.fromEntries(CS_SECTIONS.filter(s => s[3]).map(s => [s[0], true]));
  if (t.rules==null) t.rules = CS_RULES; if (t.walkie==null) t.walkie = CS_WALKIE;
  t.sites = t.sites || {}; t.actors = t.actors || {};
  return t;
}
function csDayData(date){ S.csd = S.csd || {}; return S.csd[date] || (S.csd[date] = {}); }
const csSec = k => CS_SECTIONS.find(s => s[0]===k) || [k,k];

/* chi interpreta chi: la troupe con reparto «Cast» e il ruolo uguale al personaggio, altrimenti il nome scritto qui */
function actorOf(ch){
  if (typeof CR!=="undefined" && CR.ready){ const e = Object.values(CR.eng).find(x => x.dept==="cast" && (x.role||"").trim().toLowerCase()===ch.toLowerCase());
    if (e){ const p = CR.people[e.person] || e.c || {}; return {name: p.name || (e.c||{}).name || "", phone: p.phone || (e.c||{}).phone || "", linked:true}; } }
  return {name: (csTpl().actors[ch]||""), linked:false};
}
function keyContacts(){
  const t = csTpl(); if (t.contacts) return t.contacts;
  if (typeof CR==="undefined" || !CR.ready) return [];
  const want = [/produttore esecutivo|produttore/i, /organizzatore|direttore di produzione/i, /^regista/i, /aiuto regia|1° aiuto|primo aiuto/i, /ispettore/i];
  const out = []; want.forEach(rx => { const e = Object.values(CR.eng).find(x => rx.test(x.role||"") && !out.some(o => o.eid===x)); if (e){ const p = CR.people[e.person] || e.c || {}; out.push({eid:e, role:e.role, name:p.name||"", phone:p.phone||""}); } });
  return out.map(({role,name,phone}) => ({role,name,phone}));
}
function crewOnDay(date){
  if (typeof CR==="undefined" || !CR.ready || !canCrew()) return null;
  return Object.entries(CR.eng).filter(([,e]) => e.dept!=="cast" && (() => { const [f,t] = phaseRange(e,"shoot"); return (e.ph||{}).shoot && f && t && date>=f && date<=t; })())
    .map(([id,e]) => ({id, e, p: CR.people[e.person] || e.c || {}}))
    .sort((a,b) => DEPTS.findIndex(d=>d.k===a.e.dept) - DEPTS.findIndex(d=>d.k===b.e.dept));
}
const encK = k => encodeURIComponent(k).replace(/\./g,"%2E");
function csDefaults(d, off=0){
  const x = daySched(d); const call = x.start + off; const h = v => hm(v + off);
  const first = x.items.find(it => !it.s.banner); const meal = x.items.find(it => it.meal);
  return {crew: hm(call), brief: d.i===0 ? hm(call+5) : "", ready: first ? h(first.start) : "", lunch: meal ? h(meal.start) : "", wrap: h(x.end), end: h(x.end+30)};
}

/* ---------- le sezioni: stesso markup a schermo (modificabile) e in stampa ---------- */
function csRender(di, mode){
  const P = mode==="print"; const ed = !P && canEditPlan();
  const D = days(); const c = callData(di); const d = c.d; const t = csTpl(); const dd = csDayData(d.date);
  const site = c.sites[0] || ""; const L0 = t.sites[site] || {};
  const inp = (path, val, o={}) => P ? `<span>${esc(val||"")}</span>` : `<input data-cs="${path}" value="${esc(val||"")}" ${o.type?`type="${o.type}"`:""} placeholder="${esc(o.ph||"")}" ${ed?"":"disabled"} aria-label="${esc(o.al||o.ph||path)}">`;
  const area = (path, val, o={}) => P ? `<p>${esc(val||"")}</p>` : `<textarea data-cs="${path}" rows="${o.rows||3}" placeholder="${esc(o.ph||"")}" ${ed?"":"disabled"} aria-label="${esc(o.al||path)}">${esc(val||"")}</textarea>`;
  const off = dd.call ? toMin(dd.call) - toMin(S.call) : 0; const sh = v => hm(v + off);
  const def = csDefaults(d, off); const tm = {...def, ...(dd.times||{})};
  const dood1 = Object.fromEntries(dood().map(r => [r.n, r.codes[d.i]||""]));
  const callT = dd.call || S.call;
  const sec = {
    head: () => `<div class="cshead"><div><div class="prod">${esc((S.prod||{}).cdp || "Abisso Studio S.r.l.")} presenta</div><div class="ttl">${esc(S.script.title)}</div>
        <div class="dayno">ORDINE DEL GIORNO N. ${d.i+1} · GIORNATA ${d.i+1} DI ${D.length}</div>
        <div class="dayno" style="font-weight:400">${esc(fmtDate(d.date,{weekday:"long",day:"numeric",month:"long",year:"numeric"}))}${S.script.revision?` · revisione ${esc(S.script.revision.name)}`:""}</div></div>
      <div class="callbox"><small>Convocazione generale</small>${P ? `<div class="call">${esc(callT)}</div>` : `<input type="time" data-cs="d.call" value="${esc(callT)}" ${ed?"":"disabled"} aria-label="Convocazione generale">`}</div>
      <div class="ckv"><span>Location</span><div>${esc(c.sites.join(" → ")||"—")}</div><span>Pagine</span><div>${eighths(d.e8)} · ${c.sc.length} scene</div><span>Luce</span><div>${[...new Set(c.sc.map(s=>s.dn==="N"?"Notte":"Giorno"))].join(" / ")||"—"}</div></div></div>`,
    contacts: () => { const list = keyContacts(); const rows = P ? list : [...list, {role:"",name:"",phone:""}];
      return `<div class="ckv">${rows.map((r,i) => `<span>${P ? esc(r.role) : `<input data-cs="t.contacts.${i}.role" value="${esc(r.role)}" placeholder="Ruolo" style="color:inherit" ${ed?"":"disabled"} aria-label="Ruolo">`}</span><div>${inp(`t.contacts.${i}.name`, r.name, {ph:"Nome"})}${inp(`t.contacts.${i}.phone`, r.phone, {ph:"Telefono", type:"tel"})}</div>`).join("") || `<span>—</span><div class="muted">Aggiungi i contatti</div>`}</div>`; },
    times: () => `<div class="ckv">${CS_TIMES.map(([k,l]) => `<span>${l}</span><div>${P ? esc(tm[k]||"—") : `<input type="time" data-cs="d.times.${k}" value="${esc(tm[k]||"")}" ${ed?"":"disabled"} aria-label="${l}">`}</div>`).join("")}
      ${(dd.xtimes||[]).map((x,i) => `<span>${P ? esc(x.l) : `<input data-cs="d.xtimes.${i}.l" value="${esc(x.l)}" style="color:inherit" ${ed?"":"disabled"} aria-label="Voce">`}</span><div>${P ? esc(x.t) : `<input type="time" data-cs="d.xtimes.${i}.t" value="${esc(x.t||"")}" ${ed?"":"disabled"} aria-label="Orario">`}</div>`).join("")}</div>
      ${ed ? `<button class="btn" data-csadd="xtimes" style="justify-self:start">+ Voce</button>` : ""}`,
    place: () => { const s = `site.${encK(site)}`; const q = encodeURIComponent(L0.addr || site);
      return `<div class="ckv"><span>Location</span><div><b>${esc(site||"—")}</b></div>
        <span>Indirizzo</span><div>${inp(s+".addr", L0.addr, {ph:"Via, città"})}${!P && (L0.addr||site) ? `<a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">MAPPA ↗</a>` : ""}</div>
        <span>Parcheggio</span><div>${inp(s+".park", L0.park, {ph:"Dove lasciare i mezzi"})}</div>
        <span>Camp base</span><div>${inp(s+".base", L0.base, {ph:"Trucco, costumi, catering"})}</div>
        <span>Ospedale</span><div>${inp(s+".hosp", L0.hosp, {ph:"Pronto soccorso più vicino"})}${!P ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("pronto soccorso vicino a " + (L0.addr||site))}" target="_blank" rel="noopener">CERCA ↗</a>` : ""}</div>
        <span>Indirizzo PS</span><div>${inp(s+".hospAddr", L0.hospAddr, {ph:"Indirizzo dell'ospedale"})}</div></div>
        ${c.sites.length > 1 ? `<p class="note" style="margin:0">Spostamento verso ${esc(c.sites.slice(1).join(", "))} in giornata: i dati di quelle location sono nella loro giornata.</p>` : ""}`; },
    weather: () => { const w = dd.wx || {};
      return `<div class="ckv"><span>Condizioni</span><div>${inp("d.wx.cond", w.cond, {ph:"es. Sereno"})}</div><span>Min / max</span><div>${inp("d.wx.tmin", w.tmin, {ph:"min °C"})}${inp("d.wx.tmax", w.tmax, {ph:"max °C"})}</div>
        <span>Pioggia</span><div>${inp("d.wx.rain", w.rain, {ph:"probabilità %"})}</div><span>Alba</span><div>${inp("d.wx.sunrise", w.sunrise, {type: P?"":"time"})}</div><span>Tramonto</span><div>${inp("d.wx.sunset", w.sunset, {type: P?"":"time"})}</div></div>
        ${ed ? `<div class="wx"><button class="btn" data-cswx="1">Meteo automatico</button><span class="note">Previsioni gratuite di Open-Meteo, disponibili 16 giorni prima.</span></div>` : ""}`; },
    alert: () => P ? (dd.alert ? `<div class="csalert"><p style="margin:0;white-space:pre-wrap">${esc(dd.alert)}</p></div>` : "") : `<div class="csalert">${area("d.alert", dd.alert, {ph:"es. SAFETY BRIEFING OBBLIGATORIO per tutti alle 09:05. Nessuno escluso.", rows:2, al:"Avvisi"})}</div>`,
    scenes: () => `<table><thead><tr><th>Sc.</th><th>I/E</th><th>G/N</th><th>Set e sinossi</th><th class="num">Pag.</th><th>Cast</th><th>Note</th></tr></thead><tbody>
      ${c.sc.map(s => `<tr><td><b>${esc(s.n)}</b></td><td>${esc(s.ie)}</td><td>${s.dn}</td><td><b>${esc(s.loc)}</b><br>${esc(sceneDesc(s))}</td><td class="num">${eighths(s.e8)}</td><td>${castIds(s)}</td><td>${inp(`d.scn.${s.id}`, (dd.scn||{})[s.id], {ph:"—", al:"Note della scena"})}</td></tr>`).join("")}
      <tr><td colspan="4"><b>Totale</b></td><td class="num"><b>${eighths(d.e8)}</b></td><td colspan="2"></td></tr></tbody></table>`,
    cast: () => { const ct = dd.cast || {};
      return `<table><thead><tr><th>ID</th><th>Personaggio</th><th>Interprete</th><th>Stato</th><th>Pickup</th><th>Costumi</th><th>Trucco</th><th>Pronti</th><th>Scene</th><th>Note</th></tr></thead><tbody>
      ${c.people.map(p => { const o = ct[p.n] || {}; const a = actorOf(p.n); const k = `d.cast.${encK(p.n)}`;
        const T5 = (f, v) => P ? esc(o[f]||v) : `<input type="time" data-cs="${k}.${f}" value="${esc(o[f]||v)}" ${ed?"":"disabled"} aria-label="${f}">`;
        return `<tr><td>${p.id}</td><td><b>${esc(p.n)}</b></td><td>${a.linked || P ? esc(a.name) : inp(`t.actors.${encK(p.n)}`, a.name, {ph:"Attore"})}</td><td class="status">${esc(dood1[p.n]||"")}</td>
          <td>${T5("pick", sh(p.pick))}</td><td>${T5("cost", sh(p.mua))}</td><td>${T5("mua", sh(p.mua+20))}</td><td>${T5("set", sh(p.set))}</td><td>${p.sc.join(", ")}</td><td>${inp(k+".note", o.note || (p.minor ? "Minore · con tutore" : ""), {ph:"—"})}</td></tr>`; }).join("") || `<tr><td colspan="10" class="muted">Nessun personaggio in questa giornata.</td></tr>`}</tbody></table>
      ${P ? "" : `<p class="note" style="margin:0">Stato dal Day out of Days: SW primo giorno, W lavora, WF ultimo, SWF un giorno solo. Gli interpreti si collegano da soli quando in Troupe c'è il reparto Cast con il nome del personaggio come ruolo.</p>`}`; },
    extras: () => { const rows = dd.extras || (() => { const out = [];
        c.sc.forEach(s => { const tg = tagsOf(s.id); [["figs","Figurazione"],["extra","Comparse"],["stunt","Stunt"]].forEach(([k]) => (tg[k]||[]).forEach(it => { const ex = out.find(o => o.what.toLowerCase()===it.t.toLowerCase()); if (ex) ex.sc += ", " + s.n; else out.push({what: it.t, qty:"", sc: s.n, call:"", ready:"", note: k==="stunt" ? "Stunt" : ""}); })); });
        return out; })();
      if (!rows.length && P) return `<p class="muted" style="margin:0">Nessuna.</p>`;
      return `<table><thead><tr><th>Chi</th><th class="num">N.</th><th>Scene</th><th>Chiamata</th><th>Pronti</th><th>Note</th>${ed?"<th></th>":""}</tr></thead><tbody>
        ${rows.map((r,i) => `<tr><td>${inp(`d.extras.${i}.what`, r.what, {ph:"es. 25 compaesani"})}</td><td>${inp(`d.extras.${i}.qty`, r.qty, {ph:"0"})}</td><td>${inp(`d.extras.${i}.sc`, r.sc)}</td><td>${P?esc(r.call):`<input type="time" data-cs="d.extras.${i}.call" value="${esc(r.call)}" ${ed?"":"disabled"} aria-label="Chiamata">`}</td><td>${P?esc(r.ready):`<input type="time" data-cs="d.extras.${i}.ready" value="${esc(r.ready)}" ${ed?"":"disabled"} aria-label="Pronti">`}</td><td>${inp(`d.extras.${i}.note`, r.note)}</td>${ed?`<td><button class="btn ghost" data-csdel="extras.${i}" aria-label="Togli">×</button></td>`:""}</tr>`).join("")}</tbody></table>
        ${ed ? `<button class="btn" data-csadd="extras" style="justify-self:start">+ Riga</button>` : ""}`; },
    depts: () => { const cats = S.cats.filter(k => k.on && k.k!=="cast"); const notes = dd.notes || {};
      const rows = cats.filter(k => (c.need[k.k] && c.need[k.k].size) || notes[k.k]);
      return `<table><thead><tr><th style="width:22%">Reparto</th><th>Dallo spoglio</th><th style="width:34%">Note del giorno</th></tr></thead><tbody>
        ${rows.map(k => `<tr><td><span class="dot" style="--c:${k.c};background:${k.c};display:inline-block;margin-right:6px"></span><b>${esc(k.l)}</b></td><td>${esc([...(c.need[k.k]||[])].join(" · "))}</td><td>${inp(`d.notes.${k.k}`, notes[k.k], {ph:"—"})}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">Niente dallo spoglio per questa giornata.</td></tr>`}</tbody></table>`; },
    crew: () => { const list = crewOnDay(d.date);
      if (!list) return `<p class="note" style="margin:0">La troupe la vedono amministratori e produzione.</p>`;
      if (!list.length) return `<p class="note" style="margin:0">Nessun collaboratore con le riprese in questa data. Aggiungili in Troupe.</p>`;
      const cc = dd.crew || {}; let last = null;
      return `<div class="crew2">${list.map(({id,e,p}) => { const head = e.dept!==last ? `<div class="cd">${esc(deptOf(e.dept).l)}</div>` : ""; last = e.dept;
        return head + `<div class="cr"><span>${esc(e.role||"")}</span><b>${esc(p.name||"")}</b>${P ? `<span>${esc(cc[id]||callT)}</span>` : `<input type="time" data-cs="d.crew.${id}" value="${esc(cc[id]||callT)}" ${ed?"":"disabled"} aria-label="Chiamata">`}</div>`; }).join("")}</div>`; },
    transport: () => `<table><thead><tr><th>Da</th><th>A</th><th>Orario</th><th>Chi sale</th><th>Autista</th><th>Mezzo</th><th>Note</th></tr></thead><tbody>${c.corse.map(r=>`<tr><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td>${esc(r.arr||r.fixFirst+" (partenza)")}</td><td>${esc(r.pax.join(", "))}</td><td>${esc(r.driver)}</td><td>${esc(r.vehicle)}</td><td>${esc(r.note)}</td></tr>`).join("")}</tbody></table>`,
    advance: () => { const n = D[d.i+1]; if (!n) return `<p class="muted" style="margin:0">Ultima giornata di riprese.</p>`;
      const sc = n.ids.filter(isScene).map(id => A.by[id]);
      return `<p style="margin:0 0 4px;font-weight:700">Giornata ${n.i+1} · ${esc(fmtDate(n.date,{weekday:"long",day:"numeric",month:"long"}))} · ${eighths(n.e8)} pag.</p>
        <table><thead><tr><th>Sc.</th><th>I/E</th><th>G/N</th><th>Set</th><th class="num">Pag.</th><th>Cast</th></tr></thead><tbody>${sc.map(s=>`<tr><td><b>${esc(s.n)}</b></td><td>${esc(s.ie)}</td><td>${s.dn}</td><td>${esc(s.loc)}</td><td class="num">${eighths(s.e8)}</td><td>${castIds(s)}</td></tr>`).join("")}</tbody></table>`; },
    walkie: () => `<div class="cstext">${area("t.walkie", t.walkie, {rows:6, al:"Canali radio"})}</div>`,
    rules: () => `<div class="cstext">${area("t.rules", t.rules, {rows:6, al:"Regole del set"})}</div>`
  };
  return t.order.filter(k => !t.off[k]).map(k => { const body = sec[k] ? sec[k]() : ""; if (!body) return "";
    return `<section class="csx ${t.half[k]?"half":""}" data-csx="${k}">${k==="head" ? "" : `<h4>${esc(csSec(k)[1])}${k==="place"&&!P?`<small>vale per ogni giornata in questa location</small>`:""}</h4>`}${body}</section>`; }).join("");
}

vOdg = function(){
  if (canCrew()) crewLoad();
  const D = days(); if (!D.length || !D[0].ids.length) return `<div class="wrap"><p class="note">Il piano è vuoto: l'ordine del giorno nasce dalle giornate del Piano.</p></div>`;
  const di = Math.min(S.csDay||0, D.length-1); const t = csTpl(); const ed = canEditPlan();
  const unav = days()[di].ids.filter(isScene).flatMap(id => conflicts(id, D[di].date));
  return `<div class="wrap wide"><div class="head"><div><h2>Ordine del giorno</h2><p class="note">Nasce da piano, spoglio e troupe. Tutto quello che scrivi qui vale per questa giornata; i dati della location valgono per ogni giornata in quella location. A destra decidi quali sezioni stampare e in che ordine.</p></div>
    <div class="row"><select class="sm" id="csDay" aria-label="Giornata">${D.map((x,i)=>`<option value="${i}" ${i===di?"selected":""}>${T("Giornata")} ${i+1} · ${esc(fmtDate(x.date))}</option>`).join("")}</select>
      <button class="btn" data-exp="call:pdf">PDF</button><button class="btn primary" data-act="toST">Corse a Set Transport</button></div></div>
    ${unav.length ? `<ul class="warnlist" style="margin-bottom:12px"><li>${esc([...new Set(unav)].join(", "))} risulta non disponibile in questa data.</li></ul>` : ""}
    <div class="two-col"><div class="cs2">${csRender(di, "edit")}</div>
    <aside class="side sticky"><div class="box"><h3>Modello</h3><p class="note" style="margin:0">Trascina le sezioni per cambiare l'ordine. ½ le mette affiancate, ✓ le mostra o le nasconde. Il modello vale per tutto il progetto.</p>
      <ol class="sortlist" data-sort="cs">${t.order.map(k => `<li data-k="${k}" draggable="${ed}" class="${t.off[k]?"off":""}"><span class="grip" aria-hidden="true">⋮⋮</span><span>${esc(csSec(k)[1])}</span>
        ${ed ? `<span class="ctl"><button data-csmv="${k}:-1" aria-label="Su">↑</button><button data-csmv="${k}:1" aria-label="Giù">↓</button>${k==="head"?"":`<button data-cshalf="${k}" class="${t.half[k]?"on":""}" aria-label="Metà larghezza">½</button>`}<button data-csoff="${k}" class="${t.off[k]?"":"on"}" aria-label="Mostra">✓</button></span>` : ""}</li>`).join("")}</ol>
      ${ed ? `<button class="btn" data-csreset="1" style="justify-self:start">Ripristina il modello Abisso</button>` : ""}</div></aside></div></div>`;
};
SORT.cs = keys => { csTpl().order = keys; save(); render(); };

/* scrive un valore in S.cs / S.csd seguendo il percorso del campo */
function csSet(path, v){
  const D = days(); const d = D[Math.min(S.csDay||0, D.length-1)];
  const [root, ...rest] = path.split("."); const keys = rest.map(decodeURIComponent);
  let o = root==="d" ? csDayData(d.date) : root==="t" ? csTpl() : (csTpl().sites);
  if (root==="t" && keys[0]==="contacts" && !csTpl().contacts) csTpl().contacts = keyContacts();
  keys.slice(0,-1).forEach((k,i) => { const nextNum = /^\d+$/.test(keys[i+1]); if (o[k]==null || typeof o[k]!=="object") o[k] = nextNum ? [] : {}; o = o[k]; });
  o[keys.at(-1)] = v;
  if (root==="t" && keys[0]==="contacts") csTpl().contacts = csTpl().contacts.filter(r => r && (r.role||r.name||r.phone));
}
document.addEventListener("change", e => {
  const t = e.target; if (!S || !t.dataset || !t.dataset.cs) return;
  e.stopImmediatePropagation();
  if (t.dataset.cs.startsWith("d.extras.")){ const dd = csDayData(days()[Math.min(S.csDay||0, days().length-1)].date); if (!dd.extras) dd.extras = csCurrentExtras(); }
  csSet(t.dataset.cs, t.value); save();
  if (t.dataset.cs==="d.call" || (/^t\.contacts/.test(t.dataset.cs) && !document.querySelector(`[data-cs="t.contacts.${(csTpl().contacts||[]).length}.name"]`))) setTimeout(render, 0);
}, true);
function csCurrentExtras(){ const tmp = document.createElement("div"); tmp.innerHTML = `<div>${csRender(Math.min(S.csDay||0, days().length-1), "edit")}</div>`;
  const rows = {}; $$('[data-cs^="d.extras."]', tmp).forEach(i => { const [, , n, f] = i.dataset.cs.split("."); (rows[n] = rows[n] || {})[f] = i.value; }); return Object.keys(rows).sort((a,b)=>a-b).map(k => rows[k]); }
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-csmv],[data-cshalf],[data-csoff],[data-csreset],[data-csadd],[data-csdel],[data-cswx]"); if (!b || !S) return;
  const t = csTpl(); const D = days(); const d = D[Math.min(S.csDay||0, D.length-1)]; const dd = csDayData(d.date);
  if (b.dataset.csmv){ const [k, dir] = b.dataset.csmv.split(":"); t.order = moveIn(t.order, k, +dir); }
  else if (b.dataset.cshalf){ t.half[b.dataset.cshalf] = !t.half[b.dataset.cshalf]; }
  else if (b.dataset.csoff){ t.off[b.dataset.csoff] = !t.off[b.dataset.csoff]; }
  else if (b.dataset.csreset){ if (b.dataset.c!=="1"){ b.dataset.c = "1"; b.textContent = "Conferma: ripristina"; return; } t.order = []; t.off = {}; delete t.half; t.rules = CS_RULES; t.walkie = CS_WALKIE; csTpl(); }
  else if (b.dataset.csadd==="xtimes"){ (dd.xtimes = dd.xtimes || []).push({l:"Nuova voce", t:""}); }
  else if (b.dataset.csadd==="extras"){ if (!dd.extras) dd.extras = csCurrentExtras(); dd.extras.push({what:"", qty:"", sc:"", call:"", ready:"", note:""}); }
  else if (b.dataset.csdel){ const i = +b.dataset.csdel.split(".")[1]; if (!dd.extras) dd.extras = csCurrentExtras(); dd.extras.splice(i,1); }
  else if (b.dataset.cswx){ await csWeather(d, b); return; }
  save(); render();
});

/* meteo ed effemeridi gratuiti da Open-Meteo (nessuna chiave): cerca la località, poi la previsione del giorno */
async function csWeather(d, btn){
  const t = csTpl(); const c = callData(d.i); const site = c.sites[0] || ""; const L0 = t.sites[site] = t.sites[site] || {};
  btn.disabled = true; btn.textContent = "Cerco…";
  try{
    if (!L0.geo){
      const tries = [...new Set([L0.addr, ...(L0.addr||"").split(","), site, ...site.split(/[-–,]/)].map(s => (s||"").replace(/\d{5}|\b\d+\b|\b(via|viale|piazza|corso|strada|loc\.?|località)\b/gi,"").trim()).filter(s => s.length > 2))];
      for (const q of tries){ const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=it&name=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({}));
        if (r.results && r.results[0]){ L0.geo = {lat: r.results[0].latitude, lon: r.results[0].longitude, name: r.results[0].name}; break; } }
      if (!L0.geo){ toast("Non trovo la località: scrivi l'indirizzo con la città nella sezione Location."); return; }
    }
    const f = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${L0.geo.lat}&longitude=${L0.geo.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&start_date=${d.date}&end_date=${d.date}`).then(r => r.json());
    const x = f.daily; if (!x || !x.time || !x.time.length){ toast("Previsioni non ancora disponibili per questa data: arrivano 16 giorni prima."); return; }
    const dd = csDayData(d.date); const tt = s => (s||"").slice(11,16);
    dd.wx = {cond: WMO(x.weather_code[0]), tmin: Math.round(x.temperature_2m_min[0]) + " °C", tmax: Math.round(x.temperature_2m_max[0]) + " °C", rain: x.precipitation_probability_max[0]!=null ? x.precipitation_probability_max[0] + "%" : "", sunrise: tt(x.sunrise[0]), sunset: tt(x.sunset[0]), at: Date.now(), place: L0.geo.name};
    save(); render(); toast(`Meteo di ${L0.geo.name} aggiornato.`);
  }catch(err){ console.error(err); toast("Previsioni non raggiungibili: riprova più tardi o scrivile a mano."); }
  finally{ btn.disabled = false; btn.textContent = "Meteo automatico"; }
}

/* ---------- PDF: stesse sezioni, stesso ordine ---------- */
const CS_PRINT = `
@page{size:A4 portrait;margin:9mm}
.cs2{display:grid;grid-template-columns:1fr 1fr;gap:7px 10px}
.csx{grid-column:1/-1;break-inside:avoid}
.csx.half{grid-column:auto}
.csx h4{margin:0 0 3px;font-family:"Courier Prime",monospace;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;background:#000;color:#fff;padding:2px 6px}
.csx h4 small{display:none}
.csx table{font-size:8.5px}
.cshead{display:grid;grid-template-columns:1.3fr auto 1fr;gap:10px;border-bottom:3px solid #ff0000;padding-bottom:6px;align-items:start}
.cshead .prod{font-family:"Courier Prime",monospace;font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#555}
.cshead .ttl{font-size:20px;font-weight:800;text-transform:uppercase;line-height:1;margin:3px 0 5px}
.cshead .dayno{font-family:"Courier Prime",monospace;font-size:9px;font-weight:700}
.callbox{border:2.5px solid #000;text-align:center;padding:3px 10px}
.callbox small{font-family:"Courier Prime",monospace;font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.1em}
.callbox .call{font-family:"Courier Prime",monospace;font-size:28px;font-weight:700;color:#d90000}
.ckv{display:grid;grid-template-columns:auto 1fr;border:1px solid #000;font-size:9px}
.ckv > span{background:#000;color:#fff;font-family:"Courier Prime",monospace;font-size:7.5px;font-weight:700;text-transform:uppercase;padding:2px 5px;border-bottom:1px solid #444}
.ckv > div{padding:2px 5px;border-bottom:1px solid #ccc;display:flex;gap:8px}
.csalert{border:2.5px solid #ff0000;padding:4px 7px;font-weight:700;font-size:10px}
.cstext p{margin:0;white-space:pre-wrap;font-size:8.5px;line-height:1.4}
.crew2{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
.crew2 .cd{grid-column:1/-1;font-family:"Courier Prime",monospace;font-size:7.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid #000;margin-top:4px}
.crew2 .cr{display:grid;grid-template-columns:1fr 1fr 40px;gap:4px;border-bottom:1px solid #ddd;font-size:8.5px;padding:1px 0}
.crew2 .cr span:first-child{color:#555}
.status{font-family:"Courier Prime",monospace;font-weight:700}
.num{text-align:right}
.muted,.note{color:#666}
`;
pdfCall = function(){
  if (canCrew()) crewLoad();
  const D = days(); const di = Math.min(S.csDay||0, D.length-1); const d = D[di];
  printDoc(fileBase() + " - " + L("Ordine del giorno") + " " + (d.i+1), `<style>${CS_PRINT}</style><div class="cs2">${csRender(di, "print")}</div>`);
};
