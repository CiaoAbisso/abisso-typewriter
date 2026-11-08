/* ================= Abisso Film Manager · Troupe (Crew Manager) =================
   f/people/<personId>      persona: anagrafica che resta tra un film e l'altro (solo amministratori)
   f/crew/<projectId>/<eid> ingaggio sul progetto: reparto, ruolo, periodi, compensi, allegati (amministratori e produzione) */
const PHASES = [["pre","Pre-produzione","Pre-Produzione"],["shoot","Riprese","Produzione"],["post","Post-produzione","Post-Produzione"]];
const CONTRACTS = ["Dipendente (CCNL troupe)","Autonomo con P.IVA","Prestazione occasionale","Cessione diritti"];
const ATTACH = ["Busta paga","UNILAV","Notula / fattura","Rimborsi","CV","Documento d'identità","Contratto"];
const CR = {people:{}, eng:{}, off:null, pid:null, ready:false, t:{}};
const deptOf = k => DEPTS.find(d => d.k===k) || {k, l:k||"—", cats:[], roles:[]};
const canCrew = () => ["admin","prod"].includes(Cloud.myRole());
const uidc = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,5);

async function crewLoad(){
  if (CR.pid===Cloud.pid && CR.ready) return;
  CR.pid = Cloud.pid; CR.ready = false;
  try{ if (CR.off) CR.off(); }catch(e){}
  try{
    const ppl = Cloud.isAdmin() ? (await Cloud.get("f/people") || {}) : {};
    CR.people = Object.fromEntries(Object.entries(ppl).map(([k,v]) => [k, JSON.parse(v)]));
    CR.off = Cloud.m.onValue(Cloud.r("f/crew/" + Cloud.pid), async s => {
      const v = s.val() || {}; CR.meta = v._sheet || null;
      CR.eng = Object.fromEntries(Object.entries(v).filter(([k]) => k[0]!=="_").map(([k,x]) => [k, JSON.parse(x)]));
      // chi non è amministratore legge le persone del proprio progetto una per una
      for (const e of Object.values(CR.eng)) if (!CR.people[e.person]){ let p = null; try{ p = await Cloud.get("f/people/" + e.person); }catch(err){} CR.people[e.person] = p ? JSON.parse(p) : {...(e.c||{}), _limited:true}; }
      CR.ready = true; if (S && ["crewlist","persona","budget"].includes(S.view) && !document.activeElement.closest(".labor")) render();
    });
  }catch(e){ console.error(e); CR.ready = true; CR.err = true; }
}
function savePerson(id){ clearTimeout(CR.t["p"+id]); CR.t["p"+id] = setTimeout(async () => { try{ const up = {}; up["f/people/"+id] = JSON.stringify(CR.people[id]); await Cloud.update(up); setSync("ok"); }catch(e){ setSync("err"); } }, 400); }
function saveEng(id){ clearTimeout(CR.t["e"+id]); CR.t["e"+id] = setTimeout(async () => { try{ const up = {}; up[`f/crew/${Cloud.pid}/${id}`] = JSON.stringify(CR.eng[id]); await Cloud.update(up); setSync("ok"); }catch(e){ setSync("err"); } }, 400); }

/* ---------- giorni e compensi ---------- */
function workDays(from, to){ if (!from || !to || to < from) return 0; let n = 0; const d = new Date(from+"T12:00:00"), e = new Date(to+"T12:00:00");
  while (d <= e){ if (d.getDay()!==0) n++; d.setDate(d.getDate()+1); } return n; }
function phaseDays(e, k){ const p = (e.ph||{})[k] || {};
  if (k==="shoot" && p.plan!==false){ const D = days(); const from = p.from || D[0].date, to = p.to || D[D.length-1].date; return D.filter(d => d.date>=from && d.date<=to).length; }
  return workDays(p.from, p.to); }
function phaseRange(e, k){ const p = (e.ph||{})[k] || {}; if (k==="shoot" && p.plan!==false){ const D = days(); return [p.from || D[0].date, p.to || D[D.length-1].date]; } return [p.from||"", p.to||""]; }
function phaseCost(e, k){ const p = (e.ph||{})[k] || {}; const n = phaseDays(e, k);
  return (+p.flat||0) + (+p.weekly||0) * Math.ceil(n/5) + (+p.daily||0) * n + (+p.refunds||0); }
const engTotal = e => PHASES.reduce((a,[k]) => a + phaseCost(e,k), 0);
const engDays = e => PHASES.reduce((a,[k]) => a + phaseDays(e,k), 0);
const inPhase = (e,k) => phaseDays(e,k) > 0 || phaseCost(e,k) > 0;
const eur = v => (Math.round(v*100)/100).toLocaleString("it-IT",{style:"currency",currency:"EUR"});

/* ---------- Crewlist ---------- */
function vCrew(){
  if (!canCrew()) return `<div class="wrap"><p class="note">La troupe la vedono amministratori e produzione.</p></div>`;
  crewLoad(); if (!CR.ready) return `<div class="wrap"><p class="note">Caricamento della troupe…</p></div>`;
  const list = Object.entries(CR.eng);
  const byDept = DEPTS.map(d => ({d, rows: list.filter(([,e]) => e.dept===d.k)})).filter(x => x.rows.length);
  const other = list.filter(([,e]) => !DEPTS.some(d => d.k===e.dept)); if (other.length) byDept.push({d:{k:"",l:"Senza reparto"}, rows:other});
  const sec = ({d, rows}) => { const cnt = k => rows.filter(([,e]) => inPhase(e,k)).length;
    return `<section class="clsec"><div class="clhead"><h3 class="clt">${esc(d.l)}</h3><span class="clc">${rows.length}</span></div>
      <div class="clgrid"><div class="clrows">${rows.map(([id,e],i) => { const p = CR.people[e.person] || {};
        return `<button class="clrow" data-crew="${id}"><span class="cln">${i+1}</span><span class="clrole">${esc(e.role||"—")}</span><span class="clname">${esc(p.name||"Senza nome")}</span>
          <span class="clph">${PHASES.filter(([k])=>inPhase(e,k)).map(([,l])=>esc(l)).join("<br>")}</span></button>`; }).join("")}</div>
      <div class="clsum">${PHASES.map(([k,l]) => `<div><span>${esc(l)}</span><b>${cnt(k)}</b></div>`).join("")}<div class="tot"><span>Totale giorni</span><b>${rows.reduce((a,[,e])=>a+engDays(e),0)}</b></div></div></div></section>`; };
  return `<div class="wrap"><div class="head"><div><h2>Crewlist</h2><p class="note">${list.length} collaboratori su «${esc(S.script.title)}». Le persone restano nell'archivio di Abisso: al prossimo film le ritrovi senza riscriverle.</p></div>
    <div class="row"><button class="btn" data-crewexp="csv">CSV</button><button class="btn" data-crewexp="pdf">PDF</button><button class="btn primary" data-crewadd="1">+ Aggiungi collaboratore</button></div></div>
    ${byDept.length ? byDept.map(sec).join("") : `<div class="box"><p class="note" style="margin:0">Nessun collaboratore ancora. Aggiungi il primo con «+ Aggiungi collaboratore».</p></div>`}</div>`;
}
function addCrewModal(){
  const ppl = Object.entries(CR.people).sort((a,b) => (a[1].name||"").localeCompare(b[1].name||""));
  modal(`<h3>Aggiungi un collaboratore</h3>
    <label class="flbl">Persona<input id="ncName" list="ncPeople" placeholder="Nome e cognome" autocomplete="off"><datalist id="ncPeople">${ppl.map(([id,p])=>`<option value="${esc(p.name)}">`).join("")}</datalist></label>
    <p class="note" style="margin:0">Se la persona è già nell'archivio di Abisso la ritrovi nell'elenco; altrimenti ne crei una nuova.</p>
    <div class="row"><label class="flbl" style="flex:1">Reparto<select id="ncDept">${DEPTS.map(d=>`<option value="${d.k}">${esc(d.l)}</option>`).join("")}</select></label>
      <label class="flbl" style="flex:1">Ruolo<input id="ncRole" list="ncRoles" placeholder="es. Fonico"><datalist id="ncRoles"></datalist></label></div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-x>Annulla</button><button class="btn primary" id="ncOk">Aggiungi</button></div>`, m => {
    const fillRoles = () => { $("#ncRoles").innerHTML = deptOf($("#ncDept").value).roles.map(r => `<option value="${esc(r)}">`).join(""); };
    fillRoles(); $("#ncDept").onchange = fillRoles;
    $("#ncOk").onclick = () => {
      const name = $("#ncName").value.trim(); if (!name){ toast("Scrivi il nome."); return; }
      let pid = (ppl.find(([,p]) => (p.name||"").toLowerCase()===name.toLowerCase()) || [])[0];
      if (!pid){ if (!Cloud.isAdmin()){ toast("Solo gli amministratori aggiungono persone nuove all'archivio."); return; } pid = uidc("pe"); CR.people[pid] = {name, created: Date.now()}; savePerson(pid); }
      const eid = uidc("en"); CR.eng[eid] = {c:{name}, person: pid, dept: $("#ncDept").value, role: $("#ncRole").value.trim(), contract: CONTRACTS[0], ph:{shoot:{plan:true}}, created: Date.now()};
      saveEng(eid); closeModal(); S.crewSel = eid; S.view = "persona"; save(); render();
    };
  });
}

/* ---------- Scheda del collaboratore (Labor Profile) ---------- */
const F = (lab, html) => `<div class="lf"><span class="ll">${lab}</span><span class="lv">${html}</span></div>`;
const pin = (k, p, type="text", ph="") => `<input type="${type}" data-pf="${k}" value="${esc(p[k]||"")}" placeholder="${esc(ph)}">`;
const sel = (attr, k, val, opts) => `<select ${attr}="${k}">${opts.map(o => { const [v,l] = Array.isArray(o) ? o : [o,o]; return `<option value="${esc(v)}" ${String(val)===String(v)?"selected":""}>${esc(l)}</option>`; }).join("")}</select>`;
function vPerson(){
  if (!canCrew()) return `<div class="wrap"><p class="note">La troupe la vedono amministratori e produzione.</p></div>`;
  crewLoad(); if (!CR.ready) return `<div class="wrap"><p class="note">Caricamento…</p></div>`;
  const id = S.crewSel && CR.eng[S.crewSel] ? S.crewSel : Object.keys(CR.eng)[0];
  if (!id) return `<div class="wrap"><div class="box"><p class="note" style="margin:0">Nessun collaboratore. Aggiungilo dalla Crewlist.</p><button class="btn primary" data-crewadd="1" style="justify-self:start">+ Aggiungi collaboratore</button></div></div>`;
  S.crewSel = id; const e = CR.eng[id]; const p = CR.people[e.person] || (CR.people[e.person] = {name:"?"}); const d = deptOf(e.dept); const ph = e.ph || (e.ph = {});
  const ein = (path, val, type="text", extra="") => `<input type="${type}" data-ef="${path}" value="${esc(val ?? "")}" ${extra}>`;
  const opts = Object.entries(CR.eng).sort((a,b) => (CR.people[a[1].person]||{}).name?.localeCompare((CR.people[b[1].person]||{}).name||"")||0);
  const phaseCol = ([k,l]) => { const x = ph[k] || {}; const [f,t] = phaseRange(e,k); const plan = k==="shoot" && x.plan!==false;
    return `<div class="lcol"><h4>${esc(l)}</h4>${F("Inizio", ein(`ph.${k}.from`, f, "date", plan && !x.from ? 'class="auto"' : ""))}${F("Fine", ein(`ph.${k}.to`, t, "date", plan && !x.to ? 'class="auto"' : ""))}
      ${k==="shoot" ? `<label class="chk"><input type="checkbox" data-ef="ph.shoot.plan" ${plan?"checked":""}> Conta solo le giornate di riprese del piano</label>` : ""}
      <div class="lsum">${phaseDays(e,k)} giorni</div></div>`; };
  const feeCol = ([k,l]) => { const x = ph[k] || {};
    return `<div class="lcol"><h4>${esc(l)}</h4>${F("Forfait", ein(`ph.${k}.flat`, x.flat, "number", 'step="50" min="0"'))}${F("Settimanale", ein(`ph.${k}.weekly`, x.weekly, "number", 'step="50" min="0"'))}${F("Giornaliero", ein(`ph.${k}.daily`, x.daily, "number", 'step="10" min="0"'))}${F("Rimborsi", ein(`ph.${k}.refunds`, x.refunds, "number", 'step="10" min="0"'))}
      <div class="lsum">${eur(phaseCost(e,k))}</div></div>`; };
  const tot = engTotal(e);
  const access = Object.entries(Cloud.members||{}).find(([,m]) => (m.email||"").toLowerCase()===(p.email||"").toLowerCase());
  return `<div class="wrap labor"><div class="head"><div><h2>${esc(p.name||"Senza nome")}</h2><p class="note">${esc(e.role||"Ruolo da definire")} · ${esc(d.l)}</p></div>
    <div class="row"><select id="crewPick" aria-label="Collaboratore">${opts.map(([k,x])=>`<option value="${k}" ${k===id?"selected":""}>${esc((CR.people[x.person]||{}).name||"?")} · ${esc(x.role||"")}</option>`).join("")}</select>
      <button class="btn" data-crewexp="sheet">PDF</button><button class="btn" data-crewdup="${id}">Duplica</button><button class="btn" data-crewdel="${id}" style="color:var(--bad)">Togli dal progetto</button></div></div>
  <section class="lsec"><h3>Profilo</h3><div class="lgrid">
    ${F("Nome completo", pin("name",p))}${F("Reparto", sel("data-ef","dept",e.dept,DEPTS.map(x=>[x.k,x.l])))}
    ${F("Data di nascita", pin("birth",p,"date"))}${F("Ruolo", `<input data-ef="role" value="${esc(e.role||"")}" list="roleList"><datalist id="roleList">${d.roles.map(r=>`<option value="${esc(r)}">`).join("")}</datalist>`)}
    ${F("Luogo di nascita", pin("birthPlace",p))}${F("Livello CCNL", ein("ccnl", e.ccnl, "text", 'placeholder="es. 7° liv."'))}
    ${F("Codice fiscale", pin("cf",p))}${F("Contratto", sel("data-ef","contract",e.contract,CONTRACTS))}
    ${F("Città", pin("city",p))}${F("60/40", sel("data-ef","r6040",e.r6040?"1":"",[["","No"],["1","Sì · 60% prestazione, 40% diritti"]]))}
    ${F("Indirizzo", pin("address",p))}${F("P.IVA", pin("piva",p))}
    ${F("Documento", pin("idDoc",p,"text","tipo e numero"))}${F("Patente", sel("data-pf","driver",p.driver||"",[["","—"],["sì","Sì"],["no","No"]]))}
    ${F("Pronomi", sel("data-pf","pron",p.pron||"",["","lei","lui","loro"]))}${F("Telefono", pin("phone",p,"tel"))}
    ${F("Instagram / sito", pin("web",p))}${F("Email", pin("email",p,"email"))}
  </div></section>
  <section class="lsec"><div class="lsh"><h3>Giorni di lavoro</h3><b>${engDays(e)} giorni</b></div><div class="lcols">${PHASES.map(phaseCol).join("")}</div></section>
  <section class="lsec"><div class="lsh"><h3>Compenso</h3><b>${eur(tot)}</b></div><div class="lcols">${PHASES.map(feeCol).join("")}</div>
    <p class="note">Settimanale × settimane (giorni ÷ 5, per eccesso) + giornaliero × giorni + forfait + rimborsi.${e.r6040 ? ` Con il 60/40: ${eur(tot*0.6)} di prestazione e ${eur(tot*0.4)} di diritti.` : ""}</p></section>
  <div class="lcols two"><section class="lsec"><h3>Pagamento</h3>${F("Banca", pin("bank",p))}${F("IBAN", pin("iban",p))}${F("SWIFT", pin("swift",p))}</section>
    <section class="lsec"><h3>Altre informazioni</h3>${F("Alimentazione", sel("data-pf","diet",p.diet||"",["","Nessuna esigenza","Vegetariana","Vegana","Altro (vedi note)"]))}${F("Note", pin("notes",p))}</section></div>
  <div class="lcols two"><section class="lsec"><h3>Accesso al Film Manager</h3>
      <p class="note">${p.email ? (access ? `Ha accesso come ${esc(ROLE_L[access[1].role]||access[1].role)}.` : "Non ha accesso.") : "Serve l'email per dare l'accesso."}</p>
      <div class="row">${sel("id","accRole",access?access[1].role:"",[["","Nessun accesso"],["dept","Reparto: vede lo spoglio del suo reparto"],["ad","Aiuto regia"],["prod","Produzione"]])}<button class="btn" data-acc="${id}" ${p.email?"":"disabled"}>Applica</button></div>
      <button class="btn" data-senddept="${id}" ${p.email?"":"disabled"} style="justify-self:start">Invia lo spoglio del reparto</button></section>
    <section class="lsec"><h3>Allegati</h3><p class="note">Incolla il link del file su Google Drive.</p>
      ${ATTACH.map((a,i) => F(a, `<span class="row" style="gap:6px;flex-wrap:nowrap"><input data-ef="att.${i}" value="${esc((e.att||{})[i]||"")}" placeholder="https://drive.google.com/…">${(e.att||{})[i] ? `<a class="btn" href="${esc(e.att[i])}" target="_blank" rel="noopener">Apri</a>` : ""}</span>`)).join("")}</section></div>
  </div>`;
}
function setPath(o, path, v){ const ks = path.split("."); let x = o; ks.slice(0,-1).forEach(k => { x[k] = x[k] && typeof x[k]==="object" ? x[k] : {}; x = x[k]; }); x[ks.at(-1)] = v; }
document.addEventListener("change", e => {
  const t = e.target; if (!S || !t.closest || !t.closest(".labor")) return;
  const id = S.crewSel; const en = CR.eng[id]; if (!en) return;
  if (t.dataset.pf){ const f = t.dataset.pf; CR.people[en.person][f] = t.value; savePerson(en.person);
    // nome e contatti copiati anche negli ingaggi, così la produzione li vede senza accedere all'anagrafica completa
    if (["name","email","phone"].includes(f)) Object.entries(CR.eng).filter(([,x]) => x.person===en.person).forEach(([k,x]) => { x.c = {...(x.c||{}), [f]: t.value}; saveEng(k); });
    if (f==="name") render(); return; }
  if (t.dataset.ef){ let v = t.type==="checkbox" ? t.checked : t.type==="number" ? (t.value==="" ? "" : +t.value) : t.value;
    if (t.dataset.ef==="r6040") v = !!t.value;
    setPath(en, t.dataset.ef, v); saveEng(id); render(); return; }
  if (t.id==="crewPick"){ S.crewSel = t.value; save(); render(); }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-crew],[data-crewadd],[data-crewdel],[data-crewdup],[data-acc],[data-senddept],[data-crewexp]"); if (!b || !S) return;
  if (b.dataset.crew){ S.crewSel = b.dataset.crew; S.view = "persona"; save(); render(); return; }
  if (b.dataset.crewadd){ addCrewModal(); return; }
  if (b.dataset.crewdup){ const src = CR.eng[b.dataset.crewdup]; const eid = uidc("en"); CR.eng[eid] = JSON.parse(JSON.stringify({...src, created: Date.now()})); saveEng(eid); S.crewSel = eid; render(); toast("Ingaggio duplicato: cambia ruolo o periodi."); return; }
  if (b.dataset.crewdel){ if (b.dataset.c!=="1"){ b.dataset.c = "1"; b.textContent = "Conferma"; return; }
    const up = {}; up[`f/crew/${Cloud.pid}/${b.dataset.crewdel}`] = null; await Cloud.update(up); delete CR.eng[b.dataset.crewdel]; S.crewSel = null; S.view = "crewlist"; render(); toast("Tolto dal progetto. La persona resta nell'archivio."); return; }
  if (b.dataset.acc){ const en = CR.eng[b.dataset.acc]; const p = CR.people[en.person]; const r = $("#accRole").value; const ek = Cloud.ek(p.email);
    try{ if (!r){ await Cloud.removeMember(ek); toast("Accesso tolto."); } else { await Cloud.invite(p.email, r, r==="dept" ? deptOf(en.dept).cats : [], p.name); toast(`Invito inviato a ${p.email}.`); } }
    catch(err){ toast("Non riuscito: " + (err.code||"riprova")); } return; }
  if (b.dataset.senddept){ const en = CR.eng[b.dataset.senddept]; const p = CR.people[en.person]; const d = deptOf(en.dept);
    pdfDeptFor(d); const subj = encodeURIComponent(`${S.script.title} · spoglio ${d.l}`);
    const body = encodeURIComponent(`Ciao ${p.name||""},\n\nin allegato lo spoglio del reparto ${d.l} per «${S.script.title}».\nSe hai l'accesso lo trovi anche su ${location.origin + location.pathname}\n\n`);
    modal(`<h3>Invia lo spoglio del reparto</h3><p class="note" style="margin:0">Si è aperto il PDF del reparto ${esc(d.l)}: salvalo, poi allegalo all'email.</p><pre class="code" style="white-space:pre-wrap">${esc(p.email)}</pre>
      <div class="row" style="justify-content:flex-end"><a class="btn primary" href="mailto:${encodeURIComponent(p.email)}?subject=${subj}&body=${body}">Apri l'email</a><button class="btn" data-x>Chiudi</button></div>`); return; }
  if (b.dataset.crewexp==="csv") crewCsv(); else if (b.dataset.crewexp==="pdf") crewPdf(); else if (b.dataset.crewexp==="sheet") personPdf(S.crewSel);
});
function pdfDeptFor(d){ const keep = new Set(d.cats); const save = S.cats; S.cats = S.cats.map(c => ({...c, on: c.on && (keep.size ? keep.has(c.k) : true)})); try{ pdfDept(); } finally { S.cats = save; } }
function crewRows(){ return Object.values(CR.eng).flatMap(e => { const p = CR.people[e.person] || {}; const d = deptOf(e.dept);
  return PHASES.filter(([k]) => inPhase(e,k)).map(([k,l,bl]) => { const x = (e.ph||{})[k] || {}; const [f,t] = phaseRange(e,k);
    return {dept:d.l, sec:d.sec||"", role:e.role||"", name:p.name||"", contract:e.contract||"", r6040:e.r6040?"Sì":"No", phase:bl, from:f, to:t, days:phaseDays(e,k), flat:+x.flat||0, weekly:+x.weekly||0, daily:+x.daily||0, refunds:+x.refunds||0, total:phaseCost(e,k)}; }); }); }
const CREW_HEAD = ["Reparto","Ruolo","Nome","Contratto","60/40","Fase","Inizio","Fine","Giorni","Forfait","Settimanale","Giornaliero","Rimborsi","Totale fase"];
const crewRowArr = r => [r.dept, r.role, r.name, r.contract, r.r6040, r.phase, r.from, r.to, r.days, r.flat, r.weekly, r.daily, r.refunds, r.total];
function crewCsv(){ csv("Troupe", CREW_HEAD, crewRows().map(crewRowArr)); }
function crewPdf(){
  const groups = DEPTS.map(d => ({d, rows: Object.values(CR.eng).filter(e => e.dept===d.k)})).filter(g => g.rows.length);
  printDoc(fileBase() + " - Crewlist", docHead("Crewlist") + groups.map(({d, rows}) => `<h2>${esc(d.l)} · ${rows.length}</h2><table><thead><tr><th>#</th><th>Ruolo</th><th>Nome</th><th>Telefono</th><th>Email</th><th>Periodi</th></tr></thead><tbody>${rows.map((e,i) => { const p = CR.people[e.person]||{};
    return `<tr><td>${i+1}</td><td><b>${esc(e.role)}</b></td><td>${esc(p.name)}</td><td>${esc(p.phone||"")}</td><td>${esc(p.email||"")}</td><td>${PHASES.filter(([k])=>inPhase(e,k)).map(([,l])=>esc(l)).join(", ")}</td></tr>`; }).join("")}</tbody></table>`).join(""));
}
function personPdf(id){ const e = CR.eng[id]; if (!e) return; const p = CR.people[e.person]||{}; const d = deptOf(e.dept);
  const kv = rows => `<table>${rows.map(([k,v]) => `<tr><th style="width:30%">${esc(k)}</th><td>${esc(v||"")}</td></tr>`).join("")}</table>`;
  printDoc(fileBase() + " - " + (p.name||"scheda"), docHead("Scheda collaboratore", p.name) +
    `<h2>Profilo</h2>${kv([["Nome",p.name],["Reparto",d.l],["Ruolo",e.role],["Contratto",e.contract],["Livello CCNL",e.ccnl],["60/40",e.r6040?"Sì":"No"],["Nascita",[p.birth,p.birthPlace].filter(Boolean).join(", ")],["Codice fiscale",p.cf],["Indirizzo",[p.address,p.city].filter(Boolean).join(", ")],["Documento",p.idDoc],["Telefono",p.phone],["Email",p.email],["P.IVA",p.piva]])}
    <h2>Giorni e compenso</h2><table><thead><tr><th>Fase</th><th>Inizio</th><th>Fine</th><th>Giorni</th><th>Forfait</th><th>Settimanale</th><th>Giornaliero</th><th>Rimborsi</th><th>Totale</th></tr></thead><tbody>${PHASES.map(([k,l]) => { const x = (e.ph||{})[k]||{}; const [f,t] = phaseRange(e,k);
      return `<tr><td>${l}</td><td>${f}</td><td>${t}</td><td>${phaseDays(e,k)}</td><td>${eur(+x.flat||0)}</td><td>${eur(+x.weekly||0)}</td><td>${eur(+x.daily||0)}</td><td>${eur(+x.refunds||0)}</td><td><b>${eur(phaseCost(e,k))}</b></td></tr>`; }).join("")}
      <tr><td colspan="8"><b>Totale</b></td><td><b>${eur(engTotal(e))}</b></td></tr></tbody></table>
    <h2>Pagamento</h2>${kv([["Banca",p.bank],["IBAN",p.iban],["SWIFT",p.swift]])}`);
}
