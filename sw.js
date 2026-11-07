/* Abisso Typewriter: copia locale del programma per usarlo anche offline */
const VERSION = "abt-v7";
const CORE = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k!==VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const LIBS = /^https:\/\/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com\/firebasejs)\//;
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method!=="GET") return;
  const url = req.url;
  if (LIBS.test(url)){
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })));
    return;
  }
  if (new URL(url).origin === location.origin){
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req, {ignoreSearch:true}).then(hit => hit || caches.match("./index.html"))));
  }
});
