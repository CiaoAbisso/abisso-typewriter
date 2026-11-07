/* ================= Abisso Board · collegamento a Firebase =================
   Stesso progetto Firebase di Abisso Typewriter. Percorsi:
   b/index/<pid>            elenco dei progetti (solo admin)
   b/my/<emailKey>/<pid>    progetti a cui una persona è invitata
   b/p/<pid>/meta           titolo e date
   b/p/<pid>/members/<ek>   persone invitate: email, ruolo, categorie del reparto
   b/p/<pid>/script         copia del copione (JSON), aggiornata dagli admin
   b/p/<pid>/data           spoglio e piano: cats, order, extra, set, unavail (JSON) e tags/<scena> (JSON)   */
const FB_VER = "10.12.2";
const Cloud = {
  app:null, auth:null, db:null, a:null, m:null, pid:null, offs:[], last:{}, writeT:null, members:{},
  email(){ const u = this.auth && this.auth.currentUser; return u && u.emailVerified ? (u.email||"").toLowerCase() : ""; },
  uid(){ const u = this.auth && this.auth.currentUser; return u ? u.uid : ""; },
  isAdmin(){ return (window.ABISSO_ADMINS||[]).map(x=>x.toLowerCase()).includes(this.email()); },
  ek(e){ return String(e||"").toLowerCase().replace(/\./g, ","); },
  r(p){ return this.m.ref(this.db, p); },
  async get(p){ const s = await this.m.get(this.r(p)); return s.exists() ? s.val() : null; },
  update(o){ return this.m.update(this.m.ref(this.db), o); },
  async init(){
    if (window.__CLOUD_MOCK) { Object.assign(this, window.__CLOUD_MOCK); return; }
    const app = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`);
    this.a = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth.js`);
    this.m = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-database.js`);
    this.app = app.initializeApp(window.ABISSO_FIREBASE);
    this.auth = this.a.getAuth(this.app); this.db = this.m.getDatabase(this.app);
    try{ await this.a.setPersistence(this.auth, this.a.browserLocalPersistence); }catch(e){}
  },
  ready(){ return new Promise(res => { const off = this.a.onAuthStateChanged(this.auth, () => { try{ off(); }catch(e){} res(); }); }); },
  async google(){ await this.a.signInWithPopup(this.auth, new this.a.GoogleAuthProvider()); },
  async sendLink(email){
    await this.a.sendSignInLinkToEmail(this.auth, email, {url: location.origin + location.pathname, handleCodeInApp: true});
    try{ localStorage.setItem("abb:mail", email); }catch(e){}
  },
  isLink(){ return this.a.isSignInWithEmailLink(this.auth, location.href); },
  async finishLink(email){ await this.a.signInWithEmailLink(this.auth, email, location.href); try{ localStorage.removeItem("abb:mail"); }catch(e){} history.replaceState(null, "", location.pathname); },
  async logout(){ await this.a.signOut(this.auth); },

  /* ---------- progetti ---------- */
  async projects(){
    if (this.isAdmin()){ const ix = await this.get("b/index") || {}; return Object.entries(ix).map(([id,x]) => ({id, ...x})).sort((a,b)=>(b.updated||0)-(a.updated||0)); }
    const my = await this.get("b/my/" + this.ek(this.email())) || {};
    return Object.entries(my).map(([id,x]) => ({id, ...x}));
  },
  async createProject(title, script){
    const pid = "pj" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    const now = Date.now(); const up = {};
    up[`b/index/${pid}`] = {title, updated: now};
    up[`b/p/${pid}/meta`] = {title, created: now, updated: now, by: this.email()};
    up[`b/p/${pid}/script`] = JSON.stringify(script);
    up[`b/p/${pid}/data/cats`] = JSON.stringify(DEFAULT_CATS);
    await this.update(up); return pid;
  },
  async deleteProject(pid){
    const mem = await this.get(`b/p/${pid}/members`) || {}; const up = {};
    Object.keys(mem).forEach(ek => up[`b/my/${ek}/${pid}`] = null);
    up[`b/index/${pid}`] = null; up[`b/p/${pid}`] = null; await this.update(up);
  },

  /* ---------- apertura e sincronizzazione ---------- */
  async open(pid, onChange){
    this.close(); this.pid = pid;
    const [meta, scriptRaw, data, members] = await Promise.all([this.get(`b/p/${pid}/meta`), this.get(`b/p/${pid}/script`), this.get(`b/p/${pid}/data`), this.get(`b/p/${pid}/members`)]);
    if (!meta) throw {code:"not_found"};
    this.members = members || {};
    this.last = flatData(data || {});
    const st = stateFrom(meta, JSON.parse(scriptRaw || "null"), data || {});
    this.offs.push(this.m.onValue(this.r(`b/p/${pid}/data`), s => {
      const flat = flatData(s.val() || {}); const changed = Object.keys({...flat, ...this.last}).filter(k => flat[k] !== this.last[k]);
      if (!changed.length) return; this.last = flat; onChange("data", s.val() || {});
    }));
    this.offs.push(this.m.onValue(this.r(`b/p/${pid}/script`), s => { const v = s.val(); if (v && v !== this.lastScript){ this.lastScript = v; onChange("script", JSON.parse(v)); } }));
    this.offs.push(this.m.onValue(this.r(`b/p/${pid}/members`), s => { this.members = s.val() || {}; onChange("members"); }));
    this.lastScript = scriptRaw;
    return st;
  },
  close(){ this.offs.forEach(f => { try{ f(); }catch(e){} }); this.offs = []; this.pid = null; },
  /* scrive solo le parti cambiate, mezzo secondo dopo l'ultima modifica */
  save(S){
    clearTimeout(this.writeT);
    this.writeT = setTimeout(() => this.flush(S), 450);
  },
  async flush(S){
    if (!this.pid || !canEditPlan()) return;
    const now = flatFromState(S); const up = {};
    Object.keys({...now, ...this.last}).forEach(k => { if (now[k] !== this.last[k]) up[`b/p/${this.pid}/data/${k}`] = now[k] ?? null; });
    if (!Object.keys(up).length) return;
    this.last = now;
    if (this.isAdmin()) up[`b/index/${this.pid}/updated`] = Date.now();
    try{ await this.update(up); setSync("ok"); }catch(e){ setSync("err"); console.error(e); }
  },
  async saveScript(script){ this.lastScript = JSON.stringify(script); const up = {}; up[`b/p/${this.pid}/script`] = this.lastScript; up[`b/p/${this.pid}/meta/updated`] = Date.now(); await this.update(up); },

  /* ---------- squadra ---------- */
  async invite(email, role, cats, name){
    email = email.trim().toLowerCase(); const ek = this.ek(email); const up = {};
    up[`b/p/${this.pid}/members/${ek}`] = {email, role, cats: cats||[], name: name||"", invited: Date.now(), by: this.email()};
    up[`b/my/${ek}/${this.pid}`] = {title: S.script.title};
    await this.update(up);
    await this.sendLink(email);
  },
  async removeMember(ek){ const up = {}; up[`b/p/${this.pid}/members/${ek}`] = null; up[`b/my/${ek}/${this.pid}`] = null; await this.update(up); },
  async setRole(ek, role, cats){ const up = {}; up[`b/p/${this.pid}/members/${ek}/role`] = role; up[`b/p/${this.pid}/members/${ek}/cats`] = cats||[]; await this.update(up); },
  myRole(){ if (this.isAdmin()) return "admin"; const m = this.members[this.ek(this.email())]; return m ? m.role : "guest"; },
  myCats(){ const m = this.members[this.ek(this.email())]; return (m && m.cats) || []; },

  /* ---------- copioni dal Typewriter ---------- */
  async typewriterList(){ const ix = await this.get(`u/${this.uid()}/i`) || {}; return Object.entries(ix).map(([id,x]) => ({id, ...x})).sort((a,b)=>(b.updated||0)-(a.updated||0)); },
  async typewriterScript(sid){
    const [m, d] = await Promise.all([this.get(`u/${this.uid()}/i/${sid}`), this.get(`u/${this.uid()}/d/${sid}`)]);
    if (!m || !d) throw {code:"not_found"};
    return {title: m.title, updated: m.updated, rows: JSON.parse(d.body||"[]"), bd: JSON.parse(d.bd||"{}"), source:{kind:"cloud", sid}};
  },
  async sharedScript(link, pw){
    const mt = String(link).match(/#c-([a-z0-9]+)/i); if (!mt) throw {code:"bad_link"};
    const sid = mt[1]; const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sid + ":" + (pw||"")));
    const pid = [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,32);
    const [m, b, bd] = await Promise.all([this.get(`p/${pid}/m`), this.get(`p/${pid}/b`), this.get(`p/${pid}/bd`)]);
    if (!m || !b) throw {code:"not_found"};
    const rows = Object.entries(b).map(([id,x]) => [x.t, x.x, id, x.k]).sort((a,c)=>a[3]-c[3]).map(r => [r[0], r[1], r[2]]);
    return {title: m.title, updated: m.updated, rows, bd: JSON.parse(bd||"{}"), source:{kind:"shared", sid, pw: pw||""}};
  },
  async refreshSource(src){
    if (!src) return null;
    if (src.kind==="cloud") return this.typewriterScript(src.sid);
    if (src.kind==="shared") return this.sharedScript("#c-"+src.sid, src.pw);
    return null;
  }
};

/* dati del progetto ⇄ nodi piatti in Firebase (stringhe JSON, così il confronto è semplice) */
function flatData(d){
  const f = {}; ["cats","order","extra","set","unavail"].forEach(k => { if (d[k]!=null) f[k] = d[k]; });
  Object.entries(d.tags||{}).forEach(([id,v]) => f["tags/"+id] = v); return f;
}
function flatFromState(S){
  const f = {cats: JSON.stringify(S.cats), order: JSON.stringify(S.order), extra: JSON.stringify(S.extra||{}),
    set: JSON.stringify({start:S.start, target:S.target, off:S.off, call:S.call}), unavail: JSON.stringify(S.unavail||{})};
  Object.entries(S.tags||{}).forEach(([id,v]) => { const s = JSON.stringify(v); if (s!=="{}" || Cloud.last["tags/"+id]) f["tags/"+id] = s; });
  return f;
}
function dataInto(st, d){
  const J = (v, def) => { try{ return v==null ? def : JSON.parse(v); }catch(e){ return def; } };
  const set = J(d.set, {});
  st.cats = J(d.cats, clone(DEFAULT_CATS)); st.order = J(d.order, []); st.extra = J(d.extra, {}); st.unavail = J(d.unavail, {});
  st.start = set.start || nextMonday(); st.target = set.target || 16; st.off = set.off || [0,6]; st.call = set.call || "07:00";
  st.tags = {}; Object.entries(d.tags||{}).forEach(([id,v]) => st.tags[id] = J(v, {}));
  return st;
}
function stateFrom(meta, script, d){
  const ui = (() => { try{ return JSON.parse(localStorage.getItem("abb:ui:"+Cloud.pid) || "{}"); }catch(e){ return {}; } })();
  const st = {script: script || {title: meta.title, scenes: []}, view: ui.view || "spoglio", sel: ui.sel || null, rtab: ui.rtab || "rep", csDay: ui.csDay || 0};
  return dataInto(st, d);
}
function nextMonday(){ const d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d.toISOString().slice(0,10); }

/* ---------- dal copione del Typewriter alle scene di Abisso Board ---------- */
function hashStr(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36); }
function rowsToScenes(rows){
  const out = []; let cur = null;
  rows.forEach(([t,x,id], i) => {
    x = String(x||"");
    if (t==="s"){ if (!x.trim()) return; cur = {id: id || ("s"+i), h: x.trim().toUpperCase(), b: []}; out.push(cur); return; }
    if (!cur || !x.trim()) return;
    const ty = t==="c" ? "c" : t==="p" ? "p" : t==="d" ? "d" : "a";
    cur.b.push([ty, t==="t" ? x.trim().toUpperCase() : x.trim()]);
  });
  out.forEach(s => s.sig = hashStr(s.h + "|" + s.b.map(b=>b.join(":")).join("\n")));
  return out;
}
/* numeri di scena bloccati: le scene già numerate tengono il numero, le nuove prendono A, B… */
function lockNumbers(scenes, prevNumbers){
  const nums = {...(prevNumbers||{})}; const first = !Object.keys(nums).length; let n = 0, lastNum = null;
  const used = new Set(Object.values(nums));
  scenes.forEach(s => {
    if (first){ nums[s.id] = String(++n); }
    else if (!nums[s.id]){
      const base = lastNum ? lastNum.replace(/[A-Z]+$/, "") : "0";
      let L = 65; while (used.has(base + String.fromCharCode(L))) L++;
      nums[s.id] = base + String.fromCharCode(L);
    }
    used.add(nums[s.id]); s.n = nums[s.id]; lastNum = nums[s.id];
  });
  return nums;
}
/* nuova importazione o aggiornamento: confronta con la versione precedente */
function buildScript(src, prev){
  const scenes = rowsToScenes(src.rows);
  const numbers = lockNumbers(scenes, prev && prev.numbers);
  if (prev && prev.scenes && prev.scenes.length){
    const old = Object.fromEntries(prev.scenes.map(s => [s.id, s]));
    scenes.forEach(s => { const o = old[s.id]; if (!o) s.rev = "new"; else if (o.sig !== s.sig){ s.rev = "mod"; s.prev = o.b; } });
    // nessuna novità: restano i segni della revisione precedente
    if (!scenes.some(s => s.rev)) scenes.forEach(s => { const o = old[s.id]; if (o && o.rev){ s.rev = o.rev; if (o.prev) s.prev = o.prev; } });
  }
  const tw = src.bd && src.bd._rev;
  const changed = prev && prev.scenes && scenes.some(s => s.rev && !(prev.scenes.find(o=>o.id===s.id)||{}).rev);
  const revision = tw ? {name: tw.name, color: tw.color, date: new Date(tw.date||Date.now()).toISOString().slice(0,10), prev: prev && prev.revision ? prev.revision.name : "precedente"}
    : (prev && changed ? {name: `Aggiornamento del ${new Date().toLocaleDateString("it-IT")}`, color: "#3b6fd8", date: new Date().toISOString().slice(0,10), prev: prev.revision ? prev.revision.name : "prima versione"} : (prev && prev.revision) || null);
  return {title: src.title, source: src.source, updated: src.updated || Date.now(), imported: Date.now(), revision, numbers, scenes, tbd: src.bd || {}};
}
/* spoglio AI fatto nel Typewriter → categorie di Abisso Board */
const TW_MAP = {oggetti:"props", costumi:"cost", trucco:"mua", veicoli:"veic", comparse:"extra", animali:"anim", effetti:"sfx", suono:"sound"};
