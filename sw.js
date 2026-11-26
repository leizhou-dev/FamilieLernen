// 离线缓存：程序文件先缓存后更新，内容 JSON 优先联网
const VERSION = 'fl-v0.3.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'vendor/ipados27-ui/ipados27.css',
  'js/main.js', 'js/vault.js', 'js/store.js', 'js/i18n.js', 'js/locales.js', 'js/registry.js', 'js/content.js', 'js/ui.js', 'js/icons.js', 'js/nav.js',
  'js/views/common.js', 'js/views/today.js', 'js/views/courses.js', 'js/views/structured.js', 'js/views/play.js', 'js/views/review.js', 'js/views/settings.js',
  'icons/icon-192.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isContent = url.pathname.endsWith('/content.enc.json');
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => { if (r.ok) cache.put(e.request, r.clone()); return r; }).catch(() => cached);
    return isContent ? net.then((r) => r || cached) : cached || net;
  }));
});
