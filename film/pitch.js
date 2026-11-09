/* ================= Abisso Film Manager · Produzione e Dossier =================
   S.prod (b/p/<pid>/data/prod)   scheda del film: titoli, racconto, dati di produzione, coproduzioni, piano finanziario
   b/p/<pid>/media/<chiave>       immagini del progetto (locandina, still, foto di persone fuori troupe), JPEG ridimensionati
   f/photos/<personId>            foto delle persone dell'archivio Abisso: si ritrovano in ogni film
   Biografia e filmografia stanno nella persona (f/people), così il dossier del prossimo film le ha già. */

/* il Cast diventa un reparto della troupe: l'interprete ha come ruolo il nome del personaggio */
if (!DEPTS.some(d => d.k==="cast")) DEPTS.push(Object.defineProperty({k:"cast", l:"Cast", cats:["cast","cost","mua"], sec:"CAST"}, "roles", {get: () => (A && A.castIds) || [], enumerable:true}));

const PRODX = () => (S.prod = S.prod || {});
const MEDIA = {pid:null, data:{}, ready:false};
const PHOTOS = {};
const KEY_DEPTS = ["scrittura","direzione","foto","mont","scen","cost","suono","cast"];
const LIMITS = {logline:300, synShort:1000, synLong:6000, noteDir:3000, noteProd:3000};

async function mediaLoad(){
  if (MEDIA.pid===Cloud.pid) return; MEDIA.pid = Cloud.pid; MEDIA.ready = false;
  try{ MEDIA.data = await Cloud.get(`b/p/${Cloud.pid}/media`) || {}; }catch(e){ MEDIA.data = {}; }
  MEDIA.ready = true; if (["prodpeople","prodmedia","dossier"].includes(S.view)) render();
}
async function photosLoad(ids){
  const need = ids.filter(id => id && !(id in PHOTOS)); if (!need.length) return;
  need.forEach(id => PHOTOS[id] = null);
  await Promise.all(need.map(async id => { try{ PHOTOS[id] = await Cloud.get("f/photos/" + id); }catch(e){ PHOTOS[id] = null; } }));
  if (need.some(id => PHOTOS[id]) && ["prodpeople","dossier"].includes(S.view) && !document.activeElement.closest(".modal")) render();
}
/* ridimensiona una foto nel browser: JPEG leggero, salvato come testo nel database gratuito */
function shrink(file, max, q=.82){
  return new Promise((res, rej) => { const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", q)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("img")); }; img.src = url; });
}
function pickImage(cb){ const i = document.createElement("input"); i.type = "file"; i.accept = "image/*"; i.onchange = () => i.files[0] && cb(i.files[0]); i.click(); }
async function putMedia(key, val){ const up = {}; up[`b/p/${Cloud.pid}/media/${key}`] = val; await Cloud.update(up); if (val==null) delete MEDIA.data[key]; else MEDIA.data[key] = val; }
const bgi = u => u ? `background-image:url('${u}')` : "";
const initials = n => String(n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(w => w[0]).join("").toUpperCase();

/* ---------- le persone del dossier: troupe del progetto + persone aggiunte qui ---------- */
function teamList(){
  const pr = PRODX(); const inMap = pr.crewIn || {};
  const crew = (typeof CR!=="undefined" && CR.ready) ? Object.entries(CR.eng).map(([eid,e]) => { const p = CR.people[e.person] || e.c || {};
    const def = KEY_DEPTS.includes(e.dept) || (e.dept==="prod" && /produttor|organizzat/i.test(e.role||""));
    return {key:"e:"+eid, eid, pid:e.person, name:p.name || (e.c||{}).name || "", role:e.role||"", dept:e.dept, bio:p.bio || (e.c||{}).bio || "", filmo:p.filmo || "", photo: PHOTOS[e.person] || null, on: eid in inMap ? !!inMap[eid] : def, cast: e.dept==="cast"}; }) : [];
  const extra = (pr.people||[]).map(x => ({key:"x:"+x.id, xid:x.id, name:x.name, role:x.role, dept:x.cast?"cast":"", bio:x.bio||"", filmo:x.filmo||"", photo: MEDIA.data["x_"+x.id] || null, on: x.on!==false, cast: !!x.cast}));
  const order = d => { const i = DEPTS.findIndex(x => x.k===d); return i < 0 ? 99 : i; };
  return [...crew, ...extra].sort((a,b) => (a.cast - b.cast) || order(a.dept) - order(b.dept) || (a.name||"").localeCompare(b.name||""));
}

/* ---------- area Produzione · Scheda film ---------- */
const fld = (k, l, o={}) => { const v = PRODX()[k] ?? o.def ?? ""; const ed = canEditPlan(); const lim = LIMITS[k];
  if (o.sel) return `<label class="fld ${o.full?"full":""}">${l}<select data-pr="${k}" ${ed?"":"disabled"}><option value=""></option>${o.sel.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("")}</select></label>`;
  if (o.area) return `<label class="fld full">${l}<textarea data-pr="${k}" rows="${o.rows||4}" ${ed?"":"disabled"} placeholder="${esc(o.ph||"")}">${esc(v)}</textarea>${lim ? `<span class="cnt ${String(v).length>lim?"over":""}" data-cnt="${k}">${String(v).length} / ${lim}</span>` : ""}</label>`;
  return `<label class="fld ${o.full?"full":""}">${l}<input data-pr="${k}" value="${esc(v)}" ${o.type?`type="${o.type}"`:""} placeholder="${esc(o.ph||"")}" ${ed?"":"disabled"}></label>`; };
function listEd(key, cols, add){
  const ed = canEditPlan(); const rows = PRODX()[key] || [];
  const tpl = cols.map(c => c[2] || "minmax(0,1fr)").join(" ") + (ed ? " auto" : "");
  return `<div class="rows">${rows.map((r,i) => `<div class="rowed" style="grid-template-columns:${tpl}">${cols.map(([f,l,,o]) => o && o.sel
      ? `<select data-prl="${key}.${i}.${f}" aria-label="${esc(l)}" ${ed?"":"disabled"}>${o.sel.map(x=>`<option ${x===r[f]?"selected":""}>${esc(x)}</option>`).join("")}</select>`
      : `<input data-prl="${key}.${i}.${f}" value="${esc(r[f]||"")}" placeholder="${esc(l)}" aria-label="${esc(l)}" ${o&&o.type?`type="${o.type}"`:""} ${ed?"":"disabled"}>`).join("")}${ed ? `<button class="x" data-prdel="${key}.${i}" aria-label="Togli">×</button>` : ""}</div>`).join("")}
    ${ed ? `<button class="btn" data-pradd="${key}" style="justify-self:start">+ ${esc(add)}</button>` : ""}</div>`;
}
const toNum = v => parseFloat(String(v||"").replace(/\./g,"").replace(",",".")) || 0;
function finCover(){ const pr = PRODX(); const tot = (pr.fin||[]).reduce((a,r) => a + toNum(r.amount), 0); const cost = toNum(pr.cost);
  return `Coperto ${eur(tot)}${cost ? ` su ${eur(cost)} (${Math.round(tot/cost*100)}%)` : ""}.`; }
function shootFacts(){ const D = days(); const sites = [...new Set(A.scenes.map(s => s.site))];
  return {from: D.length ? D[0].date : "", to: D.length ? D[D.length-1].date : "", n: D.length && D[0].ids.length ? D.length : 0, sites}; }
function vProdInfo(){
  if (!canCrew()) return `<div class="wrap"><p class="note">La scheda del film la vedono amministratori e produzione.</p></div>`;
  const f = shootFacts(); const pr = PRODX();
  return `<div class="wrap"><div class="head"><div><h2>Scheda film</h2><p class="note">I dati che servono a bandi, dossier e pitch. Si salvano mentre scrivi e finiscono da soli nel Dossier. I contatori seguono i limiti più comuni dei bandi.</p></div>
    <div class="row"><button class="btn" data-prtxt="1">Testi per i bandi (.txt)</button><button class="btn primary" data-area="dossier">Vai al dossier</button></div></div>
  <div class="stack">
    <section class="box"><h3>Identità</h3><div class="fgrid">
      <label class="fld">Titolo<input value="${esc(S.script.title)}" disabled title="Il titolo viene dal copione"></label>${fld("titleInt","Titolo internazionale")}
      ${fld("genre","Genere",{ph:"es. Dramma, horror"})}${fld("format","Formato",{sel:["Lungometraggio","Mediometraggio","Cortometraggio","Serie TV","Documentario","Docuserie","Animazione","Ibrido live action e animazione"]})}
      ${fld("duration","Durata",{ph:"es. 90'"})}${fld("language","Lingua",{ph:"es. italiano, ladino"})}
      ${fld("country","Paese",{def:"Italia"})}${fld("year","Anno",{ph:"es. 2027"})}
      ${fld("status","Stato del progetto",{sel:["Sviluppo","Finanziamento","Pre-produzione","Riprese","Post-produzione","Completato","Distribuzione"]})}${fld("target","Pubblico",{ph:"es. adulti, festival, sala"})}
    </div></section>
    <section class="box"><h3>Racconto</h3><div class="fgrid">
      ${fld("logline","Logline",{area:true,rows:2,ph:"Una frase: chi vuole cosa, e cosa glielo impedisce."})}
      ${fld("synShort","Sinossi breve",{area:true,rows:5})}
      ${fld("synLong","Sinossi lunga",{area:true,rows:10})}
      ${fld("noteDir","Nota di regia",{area:true,rows:8})}
      ${fld("noteProd","Nota di produzione",{area:true,rows:6})}
    </div></section>
    <section class="box"><h3>Produzione</h3><div class="fgrid">
      ${fld("cdp","Casa di produzione (CdP)",{def:"Abisso Studio S.r.l."})}${fld("producers","Produttori",{ph:"Nomi dei produttori"})}
      ${fld("cost","Costo di produzione (€)",{ph:"es. 250000"})}${fld("distrib","Distribuzione")}
      ${fld("sales","Vendite internazionali")}${fld("festivals","Festival e mercati",{ph:"es. Berlinale Co-Production Market"})}
      ${fld("links","Link (trailer, moodboard, sito)",{full:true})}
    </div>
    <h3 style="margin-top:6px">Coproduzioni</h3>${listEd("copro", [["name","Società"],["country","Paese","120px"],["share","Quota %","90px"],["role","Ruolo","minmax(0,1fr)",{sel:["Coproduttore","Coproduttore minoritario","Produttore associato","Service","Partner"]}]], "Coproduttore")}
    <h3 style="margin-top:6px">Piano finanziario</h3>${listEd("fin", [["src","Fonte (es. Tax credit MiC, Trentino Film Fund)"],["amount","Importo €","130px"],["status","Stato","150px",{sel:["Ipotizzato","Presentato","Ottenuto"]}]], "Fonte")}
    <p class="note" style="margin:0" id="finCov">${finCover()}</p>
    </section>
    <section class="box"><h3>Tecnica e riprese</h3><div class="fgrid">
      ${fld("shootFmt","Camera e formato di ripresa",{ph:"es. ARRI Alexa 35, ProRes 4444"})}${fld("aspect","Formato immagine",{ph:"es. 1.85:1"})}
      ${fld("color","Colore",{ph:"es. colore, bianco e nero"})}${fld("sound","Suono",{ph:"es. 5.1"})}
      <label class="fld">Riprese<input value="${f.n ? `${esc(fmtDate(f.from,{day:"numeric",month:"short",year:"numeric"}))} – ${esc(fmtDate(f.to,{day:"numeric",month:"short",year:"numeric"}))} · ${f.n} giornate` : "—"}" disabled title="Dal piano di lavorazione"></label>
      <label class="fld">Location<input value="${esc(f.sites.join(", "))}" disabled title="Dallo spoglio"></label>
    </div></section>
    <section class="box"><h3>Collegamento con Abisso Dock</h3>
      <p class="note" style="margin:0">Dock e Film Manager restano strumenti separati. Da qui il progetto manda al Dock una scheda aggiornata (dati del film, date di riprese, troupe con ruoli, costo, piano finanziario e coproduzioni) come file nella cartella «Abisso · Ponte» del tuo Google Drive, che il Dock legge già. Niente codici fiscali, IBAN o compensi personali.</p>
      <div class="fgrid">${fld("dockName","Nome del progetto nel Dock",{def:S.script.title})}<label class="fld">Ultimo invio<input value="${pr.dock && pr.dock.at ? esc(new Date(pr.dock.at).toLocaleString("it-IT",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})) : "mai"}" disabled></label></div>
      <div class="row"><button class="btn primary" data-dockx="1">Aggiorna nel Dock</button>${pr.dock && pr.dock.file ? `<a class="btn" href="https://drive.google.com/file/d/${esc(pr.dock.file)}/view" target="_blank" rel="noopener">Apri il file</a>` : ""}<a class="btn" href="https://claude.ai/artifact/V4RiXv99GNqRKehpf83K7x" target="_blank" rel="noopener">Apri il Dock</a></div></section>
    <section class="box"><h3>Contatti</h3><div class="fgrid">${fld("cName","Referente")}${fld("cEmail","Email",{type:"email"})}${fld("cPhone","Telefono",{type:"tel"})}${fld("cWeb","Sito",{def:"abissostudio.it"})}</div></section>
  </div></div>`;
}

/* ---------- area Produzione · Persone ---------- */
function vProdPeople(){
  if (!canCrew()) return `<div class="wrap"><p class="note">Le persone del progetto le vedono amministratori e produzione.</p></div>`;
  crewLoad(); mediaLoad(); if (!CR.ready) return `<div class="wrap"><p class="note">Caricamento…</p></div>`;
  const list = teamList(); photosLoad(list.filter(x => x.pid).map(x => x.pid));
  const card = x => `<article class="person ${x.on?"":"off"}"><div class="ph" style="${bgi(x.photo)}" data-prph="${esc(x.key)}" role="button" tabindex="0" aria-label="Foto di ${esc(x.name)}">${x.photo?"":esc(initials(x.name))}</div>
      <div class="pb"><small>${esc(x.cast ? "Interpreta " + (x.role||"—") : (x.role||"—"))}</small><b>${esc(x.name||"Senza nome")}</b><p>${esc(x.bio || "Nessuna biografia.")}</p></div>
      <div class="pbar"><button data-prbio="${esc(x.key)}">Biografia</button><button data-prin="${esc(x.key)}">${x.on ? "Nel dossier" : "Escluso"}</button></div></article>`;
  const team = list.filter(x => !x.cast), cast = list.filter(x => x.cast);
  return `<div class="wrap wide"><div class="head"><div><h2>Persone</h2><p class="note">La troupe arriva dalla Crewlist, il cast dal reparto Cast della troupe. Foto e biografie restano nell'archivio di Abisso: al prossimo film le ritrovi. Per chi non è in troupe (coproduttori, consulenti, attori ancora da contrattualizzare) usa «+ Persona».</p></div>
    <div class="row"><button class="btn" data-pradd="person">+ Persona</button><button class="btn" data-pradd="castp">+ Interprete</button><button class="btn primary" data-crewadd="1">+ In troupe</button></div></div>
    <h3 style="margin:4px 0 10px">Squadra · ${team.length}</h3><div class="people">${team.map(card).join("") || `<p class="note">Nessuno ancora.</p>`}</div>
    <h3 style="margin:22px 0 10px">Cast · ${cast.length}</h3><div class="people">${cast.map(card).join("") || `<p class="note">Aggiungi gli interpreti in Troupe con il reparto «Cast» e il nome del personaggio come ruolo, oppure qui con «+ Interprete».</p>`}</div></div>`;
}
function personOf(key){ return teamList().find(x => x.key===key); }
function bioModal(key){
  const x = personOf(key); if (!x) return; const ext = key.startsWith("x:");
  modal(`<h3>${esc(x.name||"Nuova persona")}</h3>
    ${ext ? `<div class="fgrid"><label class="fld">Nome<input id="bmName" value="${esc(x.name)}"></label><label class="fld">${x.cast ? "Personaggio" : "Ruolo"}<input id="bmRole" value="${esc(x.role)}"></label></div>` : `<p class="note" style="margin:0">${esc(x.role)} · ${esc(deptOf(x.dept).l)}. Biografia e filmografia restano nella sua scheda in archivio.</p>`}
    <label class="fld">Biografia<textarea id="bmBio" rows="7" placeholder="Tre o quattro frasi in terza persona.">${esc(x.bio)}</textarea></label>
    <label class="fld">Filmografia essenziale<textarea id="bmFilmo" rows="4" placeholder="Un titolo per riga: anno, titolo, ruolo, festival">${esc(x.filmo)}</textarea></label>
    <div class="row" style="justify-content:space-between">${ext ? `<button class="btn" id="bmDel" style="color:var(--bad)">Elimina</button>` : "<span></span>"}<span class="row"><button class="btn" data-x>Annulla</button><button class="btn primary" id="bmOk">Salva</button></span></div>`, m => {
    $("#bmOk").onclick = () => { const bio = $("#bmBio").value.trim(), filmo = $("#bmFilmo").value.trim();
      if (ext){ const p = (PRODX().people||[]).find(y => y.id===x.xid); Object.assign(p, {bio, filmo, name: $("#bmName").value.trim(), role: $("#bmRole").value.trim()}); save(); }
      else { if (!Cloud.isAdmin()){ toast("Solo gli amministratori modificano l'archivio delle persone."); return; }
        const p = CR.people[x.pid] = CR.people[x.pid] || {}; p.bio = bio; p.filmo = filmo; savePerson(x.pid);
        Object.entries(CR.eng).filter(([,e]) => e.person===x.pid).forEach(([k,e]) => { e.c = {...(e.c||{}), bio}; saveEng(k); }); }
      closeModal(); render(); };
    const del = $("#bmDel"); if (del) del.onclick = async () => { if (del.dataset.c!=="1"){ del.dataset.c = "1"; del.textContent = "Conferma"; return; }
      PRODX().people = (PRODX().people||[]).filter(y => y.id!==x.xid); save(); try{ await putMedia("x_"+x.xid, null); }catch(e){} closeModal(); render(); };
  });
}
async function setPhoto(key){
  const x = personOf(key); if (!x) return;
  if (!key.startsWith("x:") && !Cloud.isAdmin()){ toast("Solo gli amministratori cambiano le foto dell'archivio."); return; }
  pickImage(async file => { try{ const url = await shrink(file, 640, .84);
      if (key.startsWith("x:")) await putMedia("x_"+x.xid, url); else { const up = {}; up["f/photos/"+x.pid] = url; await Cloud.update(up); PHOTOS[x.pid] = url; }
      render(); toast("Foto salvata."); }catch(e){ console.error(e); toast("Foto non salvata: riprova."); } });
}

/* ---------- area Produzione · Immagini ---------- */
function vProdMedia(){
  if (!canCrew()) return `<div class="wrap"><p class="note">Le immagini del progetto le vedono amministratori e produzione.</p></div>`;
  mediaLoad(); if (!MEDIA.ready) return `<div class="wrap"><p class="note">Caricamento delle immagini…</p></div>`;
  const ed = canEditPlan(); const st = [0,1,2,3,4,5,6,7,8].filter(i => MEDIA.data["s"+i]);
  return `<div class="wrap"><div class="head"><div><h2>Immagini</h2><p class="note">La locandina apre il dossier; le still e la moodboard riempiono la pagina Immagini. Le foto vengono ridotte nel browser e salvate nel database gratuito del progetto.</p></div></div>
    <div class="grid2"><section class="box"><h3>Locandina o key visual</h3><div class="imgs" style="grid-template-columns:minmax(0,200px)">${MEDIA.data.poster ? `<div class="im poster" style="${bgi(MEDIA.data.poster)}">${ed?`<button data-prmdel="poster" aria-label="Togli">×</button>`:""}</div>` : `<button class="add" style="aspect-ratio:2/3" data-prmadd="poster" ${ed?"":"disabled"}>+ Locandina</button>`}</div></section>
    <section class="box"><h3>Still e moodboard · ${st.length} di 9</h3><div class="imgs">${st.map(i => `<div class="im" style="${bgi(MEDIA.data["s"+i])}">${ed?`<button data-prmdel="s${i}" aria-label="Togli">×</button>`:""}</div>`).join("")}${st.length < 9 && ed ? `<button class="add" data-prmadd="still">+ Immagine</button>` : ""}</div></section></div></div>`;
}

/* ---------- Dossier: le pagine del pitch deck ---------- */
const DOSSIER = [
  ["cover","Copertina",1],["logline","Logline e sinossi breve",1],["synopsis","Sinossi",1],["dirnote","Nota di regia",1],["prodnote","Nota di produzione",1],
  ["tech","Scheda tecnica",1],["team","Le persone",1],["cast","Cast",1],["chars","Personaggi",0],["locations","Location",1],["schedule","Piano di lavorazione",0],
  ["budget","Budget",1],["finance","Piano finanziario",1],["partners","Coproduzioni e partner",1],["images","Immagini",1],["contacts","Contatti",1],
  ["annexScenes","Allegato · elenco scene",0],["annexCrew","Allegato · crewlist",0]
];
function dsTpl(){ const pr = PRODX(); const t = pr.dossier = pr.dossier || {}; const keys = DOSSIER.map(x => x[0]);
  t.order = (t.order||[]).filter(k => keys.includes(k)); keys.forEach(k => { if (!t.order.includes(k)) t.order.push(k); });
  if (!t.off) t.off = Object.fromEntries(DOSSIER.filter(x => !x[2]).map(x => [x[0], true])); return t; }
const chunk = (a, n) => { const out = []; for (let i=0;i<a.length;i+=n) out.push(a.slice(i,i+n)); return out.length ? out : [[]]; };
const money = v => { const n = parseFloat(String(v||"").replace(/\./g,"").replace(",",".")); return isNaN(n) ? (v||"") : eur(n); };
function slides(){
  const pr = PRODX(); const t = dsTpl(); const title = S.script.title; const f = shootFacts(); const D = days();
  const team = teamList().filter(x => x.on); const brand = `<span class="brandbar"><b>ABISSO</b> STUDIO · ${esc(title.toUpperCase())}</span>`;
  const sl = (kick, h, body, cls="") => ({cls, html:`<div class="sl"><div class="kick">${esc(kick)}</div>${h ? `<h5>${esc(h)}</h5>` : ""}${body}</div>${brand}`});
  const empty = w => `<p class="empty">${esc(w)} da scrivere in Produzione › Scheda film.</p>`;
  const txt = (v, w, cls="txt") => v ? `<div class="${cls}">${esc(v)}</div>` : empty(w);
  const tile = x => `<div class="tile"><div class="ph" style="${bgi(x.photo)}"></div><div><small>${esc(x.cast ? x.role : x.role)}</small><b>${esc(x.name)}</b><p>${esc(x.bio)}</p></div></div>`;
  const facts = arr => `<div class="facts">${arr.filter(a => a[1]).map(([k,v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join("")}</div>`;
  const dir = team.find(x => x.dept==="direzione" || /regist/i.test(x.role));
  const S_ = {
    cover: () => [{cls:"cover", style: bgi(MEDIA.data.poster), html:`<div class="sl"><div class="kick">${esc(pr.cdp || "Abisso Studio S.r.l.")} presenta</div><h5>${esc(title)}</h5>
      ${pr.titleInt ? `<div style="font-size:2.2cqw;font-weight:600">${esc(pr.titleInt)}</div>` : ""}<div style="font-family:var(--f-mono);font-size:1.4cqw;letter-spacing:.1em;text-transform:uppercase">${esc([pr.format, pr.genre, pr.duration, pr.year].filter(Boolean).join(" · "))}</div>
      ${dir ? `<div style="font-size:1.6cqw">Regia di <b>${esc(dir.name)}</b></div>` : ""}</div>`}],
    logline: () => [sl("Logline", "", `${pr.logline ? `<div class="big">${esc(pr.logline)}</div>` : empty("La logline")}<div class="kick" style="margin-top:2cqw">Sinossi breve</div>${txt(pr.synShort, "La sinossi breve")}`)],
    synopsis: () => chunk((pr.synLong||"").split(/\n{2,}/), 4).map((ps, i) => sl("Sinossi" + (i ? " · segue" : ""), i ? "" : title, ps.join("") ? `<div class="txt" style="columns:2;column-gap:3cqw">${ps.map(p => `<p style="margin:0 0 1cqw">${esc(p)}</p>`).join("")}</div>` : empty("La sinossi lunga"))),
    dirnote: () => [sl("Nota di regia", dir ? dir.name : "", `<div class="txt">${dir && dir.photo ? `<div class="portrait" style="${bgi(dir.photo)}"></div>` : ""}${esc(pr.noteDir||"")}</div>${pr.noteDir ? "" : empty("La nota di regia")}`)],
    prodnote: () => [sl("Nota di produzione", pr.cdp || "Abisso Studio", txt(pr.noteProd, "La nota di produzione"))],
    tech: () => [sl("Scheda tecnica", title, facts([["Titolo internazionale", pr.titleInt],["Formato", pr.format],["Genere", pr.genre],["Durata", pr.duration],["Lingua", pr.language],["Paese", pr.country || "Italia"],["Anno", pr.year],["Stato", pr.status],["Produzione", pr.cdp || "Abisso Studio S.r.l."],["Coproduzione", (pr.copro||[]).map(c => c.name).filter(Boolean).join(", ")],["Costo di produzione", pr.cost ? money(pr.cost) : ""],["Riprese", f.n ? `${fmtDate(f.from,{month:"long",year:"numeric"})} · ${f.n} giornate` : ""],["Location", f.sites.slice(0,4).join(", ")],["Camera", pr.shootFmt],["Formato immagine", pr.aspect],["Colore", pr.color],["Suono", pr.sound],["Pubblico", pr.target]]))],
    team: () => chunk(team.filter(x => !x.cast), 6).map((g,i) => sl("Le persone", i ? "" : "La squadra", g.length ? `<div class="tiles">${g.map(tile).join("")}</div>` : `<p class="empty">Aggiungi la troupe e scegli chi entra nel dossier in Produzione › Persone.</p>`)),
    cast: () => { const c = team.filter(x => x.cast); return c.length ? chunk(c, 6).map((g,i) => sl("Cast", i ? "" : "Gli interpreti", `<div class="tiles">${g.map(x => tile({...x, role: "Interpreta " + x.role})).join("")}</div>`)) : [sl("Cast", "Gli interpreti", `<p class="empty">Nessun interprete ancora.</p>`)]; },
    chars: () => chunk(castData(), 14).map((g,i) => sl("Personaggi", i ? "" : "Chi abita la storia", `<table><thead><tr><th>#</th><th>Personaggio</th><th>Interprete</th><th class="num">Scene</th><th class="num">Battute</th><th class="num">Pagine</th></tr></thead><tbody>${g.map(r => `<tr><td>${r.id}</td><td><b>${esc(r.n)}</b></td><td>${esc(actorOf(r.n).name)}</td><td class="num">${r.scenes}</td><td class="num">${r.lines}</td><td class="num">${eighths(r.e8)}</td></tr>`).join("")}</tbody></table>`)),
    locations: () => chunk(locData(), 10).map((g,i) => sl("Location", i ? "" : "Dove giriamo", `<table><thead><tr><th>Location</th><th>Set</th><th>Luce</th><th class="num">Pagine</th><th>Giornate</th></tr></thead><tbody>${g.map(p => `<tr><td><b>${esc(p.site)}</b></td><td>${esc(p.sets)}</td><td>${esc(p.dn)}</td><td class="num">${eighths(p.e8)}</td><td>${esc(p.d)}</td></tr>`).join("")}</tbody></table>`)),
    schedule: () => chunk(D.filter(d => d.ids.length), 14).map((g,i) => sl("Piano di lavorazione", i ? "" : `${f.n} giornate`, `<table><thead><tr><th>Giornata</th><th>Data</th><th>Location</th><th>Scene</th><th class="num">Pagine</th></tr></thead><tbody>${g.map(d => { const sc = d.ids.filter(isScene).map(id => A.by[id]); return `<tr><td>${d.i+1}</td><td>${esc(fmtDate(d.date))}</td><td>${esc([...new Set(sc.map(s=>s.site))].join(" → "))}</td><td>${esc(sc.map(s=>s.n).join(", "))}</td><td class="num">${eighths(d.e8)}</td></tr>`; }).join("")}</tbody></table>`)),
    budget: () => { const rows = (typeof CR!=="undefined" && CR.ready) ? crewRows() : []; const by = {}; rows.forEach(r => by[r.dept] = (by[r.dept]||0) + r.total); const tot = rows.reduce((a,r)=>a+r.total,0);
      return [sl("Budget", pr.cost ? money(pr.cost) : "Costo di produzione", `<div class="cols"><div>${facts([["Costo di produzione", pr.cost ? money(pr.cost) : "da definire"],["Troupe e cast a oggi", tot ? eur(tot) : ""],["Giornate di riprese", f.n ? String(f.n) : ""]])}</div>
        <div>${Object.keys(by).length ? `<table><thead><tr><th>Reparto</th><th class="num">Compensi</th></tr></thead><tbody>${Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `<tr><td>${esc(k)}</td><td class="num">${eur(v)}</td></tr>`).join("")}</tbody></table>` : `<p class="empty">I compensi arrivano dalla Crewlist.</p>`}</div></div>`)]; },
    finance: () => { const rows = pr.fin || []; const cost = parseFloat(String(pr.cost||"").replace(/\./g,"").replace(",",".")) || 0; const num = r => parseFloat(String(r.amount).replace(/\./g,"").replace(",",".")) || 0; const tot = rows.reduce((a,r) => a + num(r), 0);
      return [sl("Piano finanziario", cost ? `${Math.round(tot/cost*100)}% coperto` : "Le fonti", rows.length ? `<table><thead><tr><th>Fonte</th><th>Stato</th><th class="num">Importo</th><th class="num">%</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.src)}</b></td><td>${esc(r.status||"")}</td><td class="num">${money(r.amount)}</td><td class="num">${cost ? Math.round(num(r)/cost*100) + "%" : ""}</td></tr>`).join("")}<tr><td colspan="2"><b>Totale</b></td><td class="num"><b>${eur(tot)}</b></td><td class="num">${cost ? Math.round(tot/cost*100) + "%" : ""}</td></tr></tbody></table>` : `<p class="empty">Nessuna fonte ancora.</p>`)]; },
    partners: () => [sl("Coproduzioni e partner", pr.cdp || "Abisso Studio S.r.l.", `${(pr.copro||[]).length ? `<table><thead><tr><th>Società</th><th>Paese</th><th>Ruolo</th><th class="num">Quota</th></tr></thead><tbody>${pr.copro.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.country)}</td><td>${esc(c.role||"")}</td><td class="num">${esc(c.share ? c.share + "%" : "")}</td></tr>`).join("")}</tbody></table>` : `<p class="empty">Produzione Abisso Studio, senza coproduttori per ora.</p>`}
      ${facts([["Produttori", pr.producers],["Distribuzione", pr.distrib],["Vendite", pr.sales],["Festival e mercati", pr.festivals]])}`)],
    images: () => { const st = [0,1,2,3,4,5,6,7,8].map(i => MEDIA.data["s"+i]).filter(Boolean); return chunk(st, 6).map((g,i) => sl("Immagini", "", g.length ? `<div class="gal">${g.map(u => `<div style="${bgi(u)}"></div>`).join("")}</div>` : `<p class="empty">Carica still e moodboard in Produzione › Immagini.</p>`)); },
    contacts: () => [sl("Contatti", pr.cdp || "Abisso Studio S.r.l.", facts([["Referente", pr.cName],["Email", pr.cEmail],["Telefono", pr.cPhone],["Sito", pr.cWeb || "abissostudio.it"],["Link", pr.links]]) + `<div style="margin-top:auto;font-family:var(--f-mono);font-size:1.2cqw">Abisso Studio S.r.l. · Mori (TN) · Italia</div>`)],
    annexScenes: () => chunk(A.scenes, 18).map((g,i) => sl("Allegato · elenco scene", i ? "" : `${A.scenes.length} scene`, `<table><thead><tr><th>Sc.</th><th>I/E</th><th>G/N</th><th>Set</th><th class="num">Pag.</th><th>Personaggi</th></tr></thead><tbody>${g.map(s => `<tr><td><b>${esc(s.n)}</b></td><td>${esc(s.ie)}</td><td>${s.dn}</td><td>${esc(s.loc)}</td><td class="num">${eighths(s.e8)}</td><td>${esc(s.cast.join(", "))}</td></tr>`).join("")}</tbody></table>`)),
    annexCrew: () => { const rows = (typeof CR!=="undefined" && CR.ready) ? Object.values(CR.eng).map(e => ({d: deptOf(e.dept).l, r: e.role, n: (CR.people[e.person]||e.c||{}).name})) : [];
      return chunk(rows, 18).map((g,i) => sl("Allegato · crewlist", i ? "" : `${rows.length} persone`, g.length ? `<table><thead><tr><th>Reparto</th><th>Ruolo</th><th>Nome</th></tr></thead><tbody>${g.map(r => `<tr><td>${esc(r.d)}</td><td>${esc(r.r)}</td><td><b>${esc(r.n)}</b></td></tr>`).join("")}</tbody></table>` : `<p class="empty">Nessuno in troupe.</p>`)); }
  };
  return t.order.filter(k => !t.off[k]).flatMap(k => (S_[k] ? S_[k]() : []).map(s => ({...s, k})));
}
function deckHtml(){ const all = slides(); return all.map((s,i) => `<section class="slide ${s.cls||""}" style="${s.style||""}" data-ds="${s.k}">${s.html}<span class="pg">${i+1} / ${all.length}</span></section>`).join(""); }
function vDossier(){
  if (!canCrew()) return `<div class="wrap"><p class="note">Il dossier lo vedono amministratori e produzione.</p></div>`;
  crewLoad(); mediaLoad(); if (!CR.ready || !MEDIA.ready) return `<div class="wrap"><p class="note">Preparo il dossier…</p></div>`;
  photosLoad(teamList().filter(x => x.pid && x.on).map(x => x.pid));
  const t = dsTpl(); const ed = canEditPlan(); const lab = k => (DOSSIER.find(x => x[0]===k)||[k,k])[1];
  return `<div class="wrap wide"><div class="head"><div><h2>Dossier</h2><p class="note">Il pitch deck del progetto, montato da Scheda film, Persone, Immagini, spoglio, piano e troupe. Scegli le pagine e l'ordine a destra; il PDF esce in A4 orizzontale.</p></div>
    <div class="row"><button class="btn" data-prtxt="1">Testi (.txt)</button><button class="btn primary" data-dsprint="1">PDF</button></div></div>
    <div class="two-col"><div class="deck">${deckHtml()}</div>
    <aside class="side sticky"><div class="box"><h3>Pagine</h3>
      <div class="row"><button class="btn" data-dspreset="pitch">Pitch deck</button><button class="btn" data-dspreset="full">Dossier completo</button></div>
      <ol class="sortlist" data-sort="ds">${t.order.map(k => `<li data-k="${k}" draggable="${ed}" class="${t.off[k]?"off":""}"><span class="grip" aria-hidden="true">⋮⋮</span><span>${esc(lab(k))}</span>${ed ? `<span class="ctl"><button data-dsmv="${k}:-1" aria-label="Su">↑</button><button data-dsmv="${k}:1" aria-label="Giù">↓</button><button data-dsoff="${k}" class="${t.off[k]?"":"on"}" aria-label="Mostra">✓</button></span>` : ""}</li>`).join("")}</ol>
      <p class="note" style="margin:0">Le pagine lunghe (persone, scene, crewlist) si dividono da sole su più fogli.</p></div></aside></div></div>`;
}
SORT.ds = keys => { dsTpl().order = keys; save(); render(); };
function slideCss(){
  let css = ""; for (const sh of document.styleSheets){ if (!sh.href || !/dock\.css/.test(sh.href)) continue; try{ css = [...sh.cssRules].filter(r => /\.slide|\.deck/.test(r.selectorText||"")).map(r => r.cssText).join("\n"); }catch(e){} }
  return css;
}
function dossierPdf(){
  printDoc(fileBase() + " - Dossier", `<style>:root{--ink:#000;--paper:#fff;--panel:#fff;--panel-2:#f1f1f3;--muted:#5d5d63;--red:#ff0000;--red-ink:#d90000;--bw:1.5px;--f-mono:"Courier Prime",monospace;--line:#ddd}
    body{font-family:"Instrument Sans",Helvetica,Arial,sans-serif;font-size:10px}
    ${slideCss()}
    @page{size:A4 landscape;margin:0}
    .deck{display:block}
    .slide{width:297mm;height:209mm;aspect-ratio:auto;border:0;box-shadow:none;break-after:page;page-break-after:always}
    .slide:last-child{break-after:auto}
    .slide th{background:#fff;border:0;border-bottom:1.5px solid #000;font-family:"Courier Prime",monospace;text-transform:uppercase;letter-spacing:.06em}
    .slide td{border:0;border-bottom:1px solid #ddd}.num{text-align:right}</style><div class="deck">${deckHtml()}</div>`);
}
function prodText(){
  const pr = PRODX(); const f = shootFacts(); const team = teamList().filter(x => x.on);
  const line = (k, v) => v ? `${k}: ${v}\n` : ""; const block = (k, v) => v ? `\n${k.toUpperCase()}\n${v}\n` : "";
  return `${S.script.title.toUpperCase()}\n${"=".repeat(S.script.title.length)}\n` + line("Titolo internazionale", pr.titleInt) + line("Formato", pr.format) + line("Genere", pr.genre) + line("Durata", pr.duration) + line("Lingua", pr.language) + line("Paese", pr.country) + line("Anno", pr.year) + line("Stato", pr.status)
    + line("Casa di produzione", pr.cdp || "Abisso Studio S.r.l.") + line("Produttori", pr.producers) + line("Costo di produzione", pr.cost ? money(pr.cost) : "") + line("Riprese", f.n ? `${f.from} – ${f.to}, ${f.n} giornate` : "") + line("Location", f.sites.join(", "))
    + block("Logline", pr.logline) + block("Sinossi breve", pr.synShort) + block("Sinossi", pr.synLong) + block("Nota di regia", pr.noteDir) + block("Nota di produzione", pr.noteProd)
    + block("Coproduzioni", (pr.copro||[]).map(c => `- ${c.name} (${c.country||""}) ${c.role||""} ${c.share?c.share+"%":""}`).join("\n")) + block("Piano finanziario", (pr.fin||[]).map(r => `- ${r.src}: ${money(r.amount)} · ${r.status||""}`).join("\n"))
    + block("Persone", team.map(x => `${x.name} · ${x.cast ? "interpreta " + x.role : x.role}${x.bio ? "\n" + x.bio : ""}${x.filmo ? "\n" + x.filmo : ""}`).join("\n\n"))
    + block("Contatti", [pr.cName, pr.cEmail, pr.cPhone, pr.cWeb].filter(Boolean).join("\n"));
}

/* ---------- eventi ---------- */
const parsePath = p => p.split(".").map(k => /^\d+$/.test(k) ? +k : k);
let prT = null;
document.addEventListener("input", e => { const t = e.target; if (!S || !t.dataset) return;
  if (t.dataset.pr){ PRODX()[t.dataset.pr] = t.value; const c = $(`[data-cnt="${t.dataset.pr}"]`); if (c){ const lim = LIMITS[t.dataset.pr]; c.textContent = `${t.value.length} / ${lim}`; c.classList.toggle("over", t.value.length > lim); }
    clearTimeout(prT); prT = setTimeout(save, 500); }
  else if (t.dataset.prl){ const [k,i,f] = parsePath(t.dataset.prl); PRODX()[k][i][f] = t.value; clearTimeout(prT); prT = setTimeout(save, 500); }
  const fc = $("#finCov"); if (fc && (t.dataset.pr==="cost" || /^fin/.test(t.dataset.prl||""))) fc.textContent = finCover();
});
document.addEventListener("change", e => { const t = e.target; if (!S || !t.dataset) return;
  if (t.dataset.pr || t.dataset.prl){ if (t.dataset.pr) PRODX()[t.dataset.pr] = t.value; else { const [k,i,f] = parsePath(t.dataset.prl); PRODX()[k][i][f] = t.value; } clearTimeout(prT); save(); const fc = $("#finCov"); if (fc) fc.textContent = finCover(); }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-pradd],[data-prdel],[data-prbio],[data-prin],[data-prph],[data-prmadd],[data-prmdel],[data-dsmv],[data-dsoff],[data-dspreset],[data-dsprint],[data-prtxt]"); if (!b || !S) return;
  const pr = PRODX(); const ds = b.dataset;
  if (ds.pradd==="copro"){ (pr.copro = pr.copro || []).push({name:"", country:"", share:"", role:"Coproduttore"}); }
  else if (ds.pradd==="fin"){ (pr.fin = pr.fin || []).push({src:"", amount:"", status:"Ipotizzato"}); }
  else if (ds.pradd==="person" || ds.pradd==="castp"){ const id = uidc("x"); (pr.people = pr.people || []).push({id, name:"", role:"", bio:"", cast: ds.pradd==="castp"}); save(); render(); bioModal("x:"+id); return; }
  else if (ds.prdel){ const [k,i] = parsePath(ds.prdel); pr[k].splice(i,1); }
  else if (ds.prbio){ bioModal(ds.prbio); return; }
  else if (ds.prph){ setPhoto(ds.prph); return; }
  else if (ds.prin){ const x = personOf(ds.prin); if (!x) return; if (x.eid){ pr.crewIn = {...(pr.crewIn||{}), [x.eid]: !x.on}; } else { const p = pr.people.find(y => y.id===x.xid); p.on = !x.on; } }
  else if (ds.prmadd){ pickImage(async file => { try{ const big = ds.prmadd==="poster"; const url = await shrink(file, big ? 1400 : 1600, .8);
      const key = big ? "poster" : "s" + [0,1,2,3,4,5,6,7,8].find(i => !MEDIA.data["s"+i]); await putMedia(key, url); render(); toast("Immagine salvata."); }catch(err){ console.error(err); toast("Immagine non salvata: riprova."); } }); return; }
  else if (ds.prmdel){ if (b.dataset.c!=="1"){ b.dataset.c = "1"; b.textContent = "?"; b.title = "Premi di nuovo per togliere"; return; } await putMedia(ds.prmdel, null); render(); return; }
  else if (ds.dsmv){ const [k, dir] = ds.dsmv.split(":"); const t = dsTpl(); t.order = moveIn(t.order, k, +dir); }
  else if (ds.dsoff){ const t = dsTpl(); t.off[ds.dsoff] = !t.off[ds.dsoff]; }
  else if (ds.dspreset){ const t = dsTpl(); t.order = DOSSIER.map(x => x[0]); t.off = ds.dspreset==="full" ? {} : Object.fromEntries(DOSSIER.filter(x => !x[2]).map(x => [x[0], true])); }
  else if (ds.dsprint){ dossierPdf(); return; }
  else if (ds.prtxt){ download(fileBase() + " - testi.txt", prodText(), "text/plain;charset=utf-8"); return; }
  save(); render();
});
document.addEventListener("keydown", e => { if ((e.key==="Enter" || e.key===" ") && e.target.dataset && e.target.dataset.prph){ e.preventDefault(); setPhoto(e.target.dataset.prph); } });

/* foto e biografia anche nella scheda del collaboratore in Troupe */
const vPersonBase = vPerson;
vPerson = function(){
  const html = vPersonBase(); const id = S.crewSel; const e = id && CR.eng[id]; if (!e) return html;
  const p = CR.people[e.person] || {}; photosLoad([e.person]); const ph = PHOTOS[e.person];
  const extra = `<section class="lsec"><div class="lsh"><h3>Foto e biografia</h3><span class="note">Per dossier e pitch: restano in archivio per i prossimi film.</span></div>
    <div class="person" style="max-width:640px"><div class="ph" style="${bgi(ph)}" data-prph="e:${id}" role="button" tabindex="0" aria-label="Foto">${ph?"":esc(initials(p.name))}</div>
    <div class="pb"><small>${esc(e.role||"")}</small><b>${esc(p.name||"")}</b><p>${esc(p.bio || "Nessuna biografia.")}</p></div>
    <div class="pbar"><button data-prbio="e:${id}">Biografia e filmografia</button></div></div></section>`;
  return html.replace(/<\/div>\s*$/, extra + "</div>");
};

/* ---------- ponte verso Abisso Dock: un file JSON per progetto nel Drive dello studio ----------
   Il Dock vive su claude.ai e legge Google Drive; il Film Manager scrive solo i file che crea (permesso drive.file). */
function dockPayload(){
  const pr = PRODX(); const f = shootFacts(); const D = days();
  const crew = (typeof CR!=="undefined" && CR.ready) ? Object.values(CR.eng).map(e => { const p = CR.people[e.person] || e.c || {};
    return {nome: p.name || (e.c||{}).name || "", reparto: deptOf(e.dept).l, ruolo: e.role || "", email: p.email || (e.c||{}).email || "", telefono: p.phone || (e.c||{}).phone || "",
      periodi: PHASES.filter(([k]) => inPhase(e,k)).map(([k,l]) => { const [a,b] = phaseRange(e,k); return {fase:l, dal:a, al:b, giorni:phaseDays(e,k)}; })}; }) : [];
  const num = v => toNum(v) || null;
  return {schema:"abisso-film-manager/1", aggiornato: new Date().toISOString(), progettoDock: pr.dockName || S.script.title, filmManager: {id: Cloud.pid, link: location.origin + location.pathname},
    titolo: S.script.title, titoloInternazionale: pr.titleInt||"", formato: pr.format||"", genere: pr.genre||"", durata: pr.duration||"", lingua: pr.language||"", paese: pr.country||"Italia", anno: pr.year||"", stato: pr.status||"",
    casaDiProduzione: pr.cdp || "Abisso Studio S.r.l.", produttori: pr.producers||"", costoDiProduzione: num(pr.cost), logline: pr.logline||"", sinossiBreve: pr.synShort||"",
    riprese: {dal: f.from, al: f.to, giornate: f.n, location: f.sites, calendario: D.filter(d => d.ids.length).map(d => ({giornata: d.i+1, data: d.date, scene: d.ids.filter(isScene).map(id => A.by[id].n)}))},
    coproduzioni: (pr.copro||[]).map(c => ({societa:c.name, paese:c.country, ruolo:c.role, quota: num(c.share)})),
    pianoFinanziario: (pr.fin||[]).map(r => ({fonte:r.src, importo: num(r.amount), stato:r.status})),
    troupe: crew, cast: crew.filter(x => x.reparto==="Cast").map(x => ({interprete:x.nome, personaggio:x.ruolo})),
    personaggi: (A && A.castIds) || []};
}
async function dockExport(btn){
  if (!Cloud.isAdmin()){ toast("Il collegamento con il Dock lo fanno gli amministratori."); return; }
  const pr = PRODX(); pr.dock = pr.dock || {};
  btn.disabled = true; btn.textContent = "Invio…";
  try{
    crewLoad(); await googleTokenFor(DRIVE_SCOPE);
    const D = "https://www.googleapis.com/drive/v3/files";
    pr.dock.folder = await dockDir();
    const name = `Abisso Film Manager · ${S.script.title}.json`; const body = JSON.stringify(dockPayload(), null, 2);
    const bd = "abisso" + Date.now(); const multi = (meta) => `--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${bd}--`;
    const U = "https://www.googleapis.com/upload/drive/v3/files";
    let ok = false;
    if (pr.dock.file){ try{ await gfetch(`${U}/${pr.dock.file}?uploadType=multipart`, {method:"PATCH", headers:{"Content-Type":`multipart/related; boundary=${bd}`}, body: multi({name})}); ok = true; }catch(e){ if (e.status!==404) throw e; } }
    if (!ok){ const f = await gfetch(`${U}?uploadType=multipart&fields=id`, {method:"POST", headers:{"Content-Type":`multipart/related; boundary=${bd}`}, body: multi({name, parents:[pr.dock.folder], description:"Scheda progetto per Abisso Dock, scritta da Abisso Film Manager"})}); pr.dock.file = f.id; }
    pr.dock.at = Date.now(); save(); render(); toast("Scheda aggiornata nel Drive: il Dock la trova nella cartella «Abisso · Ponte».", 4500);
  }catch(e){ gErr(e); }
  finally{ btn.disabled = false; btn.textContent = "Aggiorna nel Dock"; }
}
document.addEventListener("click", e => { const b = e.target.closest("[data-dockx]"); if (b && S) dockExport(b); });
