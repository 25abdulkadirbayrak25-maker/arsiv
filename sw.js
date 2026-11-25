/* İş Fotoğraf Arşivi: internetsiz açılış için uygulama dosyalarını saklar.
   İnternet varsa yeni sürüm alınır ve saklanır; yoksa ya da bağlantı çok zayıfsa saklanan kopya açılır.
   Arşivin verileri ve fotoğrafları burada değil, uygulamanın kendi deposunda durur. */
var CACHE = "arsiv-v1";
var FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(FILES.map(function(f){ return fetch(f, {cache: "no-store"}).then(function(r){ if(r && r.ok) return c.put(f, r); }).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.indexOf("arsiv-") === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
function fromCache(req){
  return caches.open(CACHE).then(function(c){
    return c.match(req, {ignoreSearch: true}).then(function(m){ return m || c.match("./index.html"); }).then(function(m){ return m || c.match("./"); });
  });
}
self.addEventListener("fetch", function(e){
  var req = e.request, u = new URL(req.url);
  if(req.method !== "GET" || u.origin !== self.location.origin) return;   // Google ve Drive istekleri dokunulmadan geçer
  if(u.pathname.indexOf(new URL(self.registration.scope).pathname) !== 0) return;
  var isPage = req.mode === "navigate";
  e.respondWith(new Promise(function(resolve){
    var done = false;
    function give(r){ if(!done && r){ done = true; resolve(r); } }
    var timer = isPage ? setTimeout(function(){ fromCache(req).then(give); }, 4000) : null;   // zayıf çekimde bekletmez
    fetch(u.href, {cache: "no-store", credentials: "same-origin"}).then(function(r){
      if(r && r.ok){ var cp = r.clone(), cp2 = isPage ? r.clone() : null; caches.open(CACHE).then(function(c){ c.put(isPage ? "./index.html" : req, cp2 || cp); if(isPage) c.put("./", cp); }); }
      clearTimeout(timer);
      if(r && r.ok) give(r); else fromCache(req).then(function(m){ give(m || r); });
    }, function(){
      clearTimeout(timer);
      fromCache(req).then(function(m){ give(m || Response.error()); });
    });
  }));
});
