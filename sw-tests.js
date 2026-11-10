'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const { URL } = require('url');
class ShimHeaders { constructor(init={}) { this.map = Object.assign({}, init); } }
class ShimResponse {
  constructor(body='', init={}) { this.body = String(body); this.status = init.status || 200; this.statusText = init.statusText || ''; this.headers = new ShimHeaders(init.headers); }
  clone() { return new ShimResponse(this.body, {status:this.status, statusText:this.statusText, headers:this.headers.map}); }
  async text() { return this.body; }
}
class ShimRequest {
  constructor(url, init={}) { this.url = url; this.method = init.method || 'GET'; this.mode = init.mode || 'no-cors'; }
}
const Response = ShimResponse;
const Request = ShimRequest;
const source = fs.readFileSync(__dirname + '/sw.js', 'utf8');
const handlers = {};
const store = new Map();
const deletedCaches = [];
let precache = null;
const cacheNames = ['nocturne-tarot-v4.1.0','nocturne-tarot-v3.2.1','nocturne-v3.2.1','unrelated-app-cache'];
const keyFor = (request) => {
  const raw = typeof request === 'string' ? request : request.url;
  const u = new URL(raw, 'http://127.0.0.1:8000');
  return u.origin + u.pathname;
};
const caches = {
  async open(name) {
    return {
      async put(request, response) { store.set(name + '|' + keyFor(request), response.clone()); },
      async addAll(files) { precache = files.slice(); },
    };
  },
  async keys() { return cacheNames.slice(); },
  async delete(name) { deletedCaches.push(name); return true; },
  async match(request, options = {}) {
    const key = keyFor(request);
    for (const [k, response] of store.entries()) {
      const candidate = k.split('|').slice(1).join('|');
      if (candidate === key) return response.clone();
    }
    return undefined;
  },
};
const self = {
  location: new URL('http://127.0.0.1:8000/sw.js'),
  addEventListener(type, fn) { handlers[type] = fn; },
  skipWaiting: async () => {},
  clients: { claim: async () => {} },
};
const swSandbox = { self, caches, URL, fetch: async () => { throw new Error('offline'); }, Response, Promise };
vm.runInNewContext(source + '\nthis.__files=FILES;', swSandbox);
async function run() {
  // The precache has the canonical key without a version query; request uses a query.
  store.set('nocturne-tarot-v4.1.0|http://127.0.0.1:8000/app.js', new Response('/* cached app.js */', {headers:{'Content-Type':'text/javascript'}}));
  store.set('nocturne-tarot-v4.1.0|http://127.0.0.1:8000/index.html', new Response('<!doctype html><title>cached home</title>', {headers:{'Content-Type':'text/html'}}));
  let captured;
  const req = new Request('http://127.0.0.1:8000/app.js?v=4.1.0', {mode:'same-origin'});
  handlers.fetch({request:req, respondWith(p) { captured = p; }});
  const response = await captured;
  assert.strictEqual(response.status, 200, 'versioned JS should resolve to precached JS while offline');
  assert.ok(/cached app\.js/.test(await response.text()), 'must return JavaScript cache entry, not index.html');

  let missing;
  const missingReq = new Request('http://127.0.0.1:8000/absent.js?v=4.0.0', {mode:'same-origin'});
  handlers.fetch({request:missingReq, respondWith(p) { missing = p; }});
  const missingResponse = await missing;
  assert.strictEqual(missingResponse.status, 503, 'missing offline script should return explicit 503');
  assert.ok(!/<!doctype html/i.test(await missingResponse.text()), 'must not return HTML for missing script');
  console.log('✓ versioned script resolves to cached asset when offline');
  console.log('✓ missing script returns explicit 503, not HTML');
  let nav; const navReq={url:'http://127.0.0.1:8000/?offline=1',method:'GET',mode:'navigate'}; handlers.fetch({request:navReq,respondWith(p){nav=p;}}); const navResponse=await nav; assert.strictEqual(navResponse.status,200,'offline navigation should use cached index.html'); assert.ok(/cached home/.test(await navResponse.text()),'navigation should return cached HTML'); console.log('✓ offline navigation falls back to cached index.html');
  let called=false; handlers.fetch({request:new Request('http://127.0.0.1:8000/app.js',{method:'POST'}),respondWith(){called=true;}}); assert.strictEqual(called,false,'non-GET requests should not be intercepted'); console.log('✓ non-GET requests are not intercepted');
  let install; handlers.install({waitUntil(p){install=p;}}); await install; assert(precache && precache.length===88, 'precache must list 88 files'); const missingFiles=swSandbox.__files.filter(p=>{const clean=p.replace(/^\.\//,'');return clean && !fs.existsSync(__dirname+'/'+clean)}); assert.strictEqual(missingFiles.length,0,'missing precache files: '+missingFiles.join(', ')); console.log('✓ install precaches 88 existing files');
  let activation; handlers.activate({waitUntil(p){activation=p;}}); await activation; assert(deletedCaches.includes('nocturne-tarot-v3.2.1'),'old app cache should be removed'); assert(deletedCaches.includes('nocturne-v3.2.1'),'known legacy cache should be removed'); assert(!deletedCaches.includes('unrelated-app-cache'),'unrelated cache must be preserved'); console.log('✓ activation removes old Nocturne caches but preserves unrelated app caches');
  console.log('Итог: 6 Service Worker regression tests passed.');
}
run().catch(e => { console.error(e); process.exit(1); });
