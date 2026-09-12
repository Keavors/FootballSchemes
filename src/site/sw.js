/* «Установка» — сервис-воркер: быстрый запуск и работа без интернета.
   Страница — сначала из сети, чтобы всегда была свежая версия; при плохой связи или без сети — из кэша.
   Шрифты — из кэша. Иконки и манифест — из кэша с обновлением в фоне. */
const CACHE = 'ustanovka-v1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const PAGE_TIMEOUT = 3500;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.indexOf('ustanovka-') === 0 && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (FONT_HOSTS.indexOf(url.hostname) >= 0) {
    event.respondWith(cacheFirst(req));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate' || /\/$|\.html$/.test(url.pathname)) {
    const net = fetch(req);
    event.waitUntil(net.then(res => savePage(url, res.clone()), () => { /* нет сети */ }));
    event.respondWith(pageResponse(url, net));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, req));
});

/* Корень сайта и index.html — одна и та же страница, храним под обоими адресами */
function pageKeys(url) {
  const root = self.registration.scope;
  const clean = url.origin + url.pathname;
  return clean === root || clean === root + 'index.html' ? [root, root + 'index.html'] : [clean];
}

async function savePage(url, res) {
  if (!res || res.status !== 200 || res.redirected) return;
  const cache = await caches.open(CACHE);
  await Promise.all(pageKeys(url).map(key => cache.put(key, res.clone())));
}

async function cachedPage(url) {
  const cache = await caches.open(CACHE);
  const root = self.registration.scope;
  const keys = pageKeys(url).concat([root, root + 'index.html']);
  for (const key of keys) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  return null;
}

async function pageResponse(url, net) {
  const slow = new Promise(resolve => setTimeout(resolve, PAGE_TIMEOUT, 'slow'));
  try {
    const first = await Promise.race([net, slow]);
    if (first !== 'slow') return first;
    return (await cachedPage(url)) || await net;
  } catch (err) {
    const hit = await cachedPage(url);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => { /* место кончилось */ });
  return res;
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then(res => {
    if (res && res.status === 200) cache.put(req, res.clone()).catch(() => { /* ignore */ });
    return res;
  });
  if (!hit) return net;
  try { event.waitUntil(net.catch(() => { /* нет сети */ })); } catch (e) { /* событие уже завершено */ }
  return hit;
}
