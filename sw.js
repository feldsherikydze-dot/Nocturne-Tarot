const CACHE='nocturne-tarot-v4.1.0-r2';
const LEGACY_CACHES=['nocturne-v3.2.1','nocturne-v3.2.0','nocturne-v3.1.2','nocturne-v3.1.1','nocturne-v3.1.0','nocturne-v3.0.0','nocturne-v2.0.0','nocturne-v1.2.3','nocturne-v1.2.2','nocturne-v1.2.1'];
const CARD_FILES=["./assets/cards/major-00.svg", "./assets/cards/major-01.svg", "./assets/cards/major-02.svg", "./assets/cards/major-03.svg", "./assets/cards/major-04.svg", "./assets/cards/major-05.svg", "./assets/cards/major-06.svg", "./assets/cards/major-07.svg", "./assets/cards/major-08.svg", "./assets/cards/major-09.svg", "./assets/cards/major-10.svg", "./assets/cards/major-11.svg", "./assets/cards/major-12.svg", "./assets/cards/major-13.svg", "./assets/cards/major-14.svg", "./assets/cards/major-15.svg", "./assets/cards/major-16.svg", "./assets/cards/major-17.svg", "./assets/cards/major-18.svg", "./assets/cards/major-19.svg", "./assets/cards/major-20.svg", "./assets/cards/major-21.svg", "./assets/cards/жезлы-1.svg", "./assets/cards/жезлы-2.svg", "./assets/cards/жезлы-3.svg", "./assets/cards/жезлы-4.svg", "./assets/cards/жезлы-5.svg", "./assets/cards/жезлы-6.svg", "./assets/cards/жезлы-7.svg", "./assets/cards/жезлы-8.svg", "./assets/cards/жезлы-9.svg", "./assets/cards/жезлы-10.svg", "./assets/cards/жезлы-court-1.svg", "./assets/cards/жезлы-court-2.svg", "./assets/cards/жезлы-court-3.svg", "./assets/cards/жезлы-court-4.svg", "./assets/cards/кубки-1.svg", "./assets/cards/кубки-2.svg", "./assets/cards/кубки-3.svg", "./assets/cards/кубки-4.svg", "./assets/cards/кубки-5.svg", "./assets/cards/кубки-6.svg", "./assets/cards/кубки-7.svg", "./assets/cards/кубки-8.svg", "./assets/cards/кубки-9.svg", "./assets/cards/кубки-10.svg", "./assets/cards/кубки-court-1.svg", "./assets/cards/кубки-court-2.svg", "./assets/cards/кубки-court-3.svg", "./assets/cards/кубки-court-4.svg", "./assets/cards/мечи-1.svg", "./assets/cards/мечи-2.svg", "./assets/cards/мечи-3.svg", "./assets/cards/мечи-4.svg", "./assets/cards/мечи-5.svg", "./assets/cards/мечи-6.svg", "./assets/cards/мечи-7.svg", "./assets/cards/мечи-8.svg", "./assets/cards/мечи-9.svg", "./assets/cards/мечи-10.svg", "./assets/cards/мечи-court-1.svg", "./assets/cards/мечи-court-2.svg", "./assets/cards/мечи-court-3.svg", "./assets/cards/мечи-court-4.svg", "./assets/cards/пентакли-1.svg", "./assets/cards/пентакли-2.svg", "./assets/cards/пентакли-3.svg", "./assets/cards/пентакли-4.svg", "./assets/cards/пентакли-5.svg", "./assets/cards/пентакли-6.svg", "./assets/cards/пентакли-7.svg", "./assets/cards/пентакли-8.svg", "./assets/cards/пентакли-9.svg", "./assets/cards/пентакли-10.svg", "./assets/cards/пентакли-court-1.svg", "./assets/cards/пентакли-court-2.svg", "./assets/cards/пентакли-court-3.svg", "./assets/cards/пентакли-court-4.svg"];
const FILES=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png',...CARD_FILES];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('nocturne-tarot-')&&k!==CACHE)||LEGACY_CACHES.includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const sameOrigin=url.origin===self.location.origin;
  const path=url.pathname;
  const isScriptOrStyle=sameOrigin&&(/\.(?:js|css|json|webmanifest)$/i.test(path));
  const isCore=sameOrigin&&(/(?:^|\/)(?:index\.html|app\.js|styles\.css|sw\.js|manifest\.webmanifest|cards\.json|spreads\.json)$/.test(path)||e.request.mode==='navigate');
  const offlineFallback=async()=>{
    // Ignore version query parameters when looking up precached files such as app.js?v=4.1.0.
    const cached=await caches.match(e.request,{ignoreSearch:true});
    if(cached)return cached;
    if(e.request.mode==='navigate'){
      const page=await caches.match('./index.html',{ignoreSearch:true});
      if(page)return page;
    }
    // Never answer a JS/CSS/JSON request with index.html: that creates a misleading
    // successful response containing the wrong MIME type and breaks offline startup.
    return new Response('No cached offline copy is available for this resource.',{
      status:503,
      statusText:'Offline resource unavailable',
      headers:{'Content-Type':isScriptOrStyle?'text/plain; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-store'}
    });
  };
  if(isCore){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
      if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}
      // A proxy or a broken upstream can answer 5xx. Prefer the precached copy
      // over an error page, but keep real 4xx responses (e.g. a missing file) intact.
      if(r.status>=500)return offlineFallback();
      return r;
    }).catch(offlineFallback));
    return;
  }
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(cached=>cached||fetch(e.request).then(r=>{
    if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
    return r;
  }).catch(offlineFallback)));
});
