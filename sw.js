const CACHE='po-auto-signals-v17';
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./manifest.json','./scanner.js','./dashboard.css','./dashboard.js','./trade-manager.js?v=20261119-3','./auto-engine.js','./dashboard.js','./approval-gate.js','./scanner.js?v=20261119-3','./auto-engine.js?v=20261119-13','./approval-gate.js?v=20261119-2','./dashboard.css']))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
