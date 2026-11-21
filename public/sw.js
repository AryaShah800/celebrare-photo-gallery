// Offline support for the gallery. Three caches:
//  - app shell: index.html and its hashed assets, fetched on install; same-origin GETs are refreshed in the background
//  - images: Picsum photos, cache-first, newest 300 kept (fetched with CORS so entries are not opaque)
//  - data: Picsum's list and info JSON, network-first with the last good copy as fallback
const VERSION = 'v2';
const SHELL = `celebrare-shell-${VERSION}`;
const IMAGES = `celebrare-images-${VERSION}`;
const DATA = `celebrare-data-${VERSION}`;
const MAX_IMAGES = 300;
const scope = self.registration.scope;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    const page = await fetch(scope, { cache: 'reload' });
    const html = await page.clone().text();
    await cache.put(scope, page);
    // Hashed JS and CSS named in the built index.html, so the very first visit is already usable offline.
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|svg|webmanifest))"/g)]
      .map(match => new URL(match[1], scope))
      .filter(url => url.origin === self.location.origin);
    await Promise.all(assets.map(url => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [SHELL, IMAGES, DATA];
    for (const name of await caches.keys()) if (name.startsWith('celebrare-') && !keep.includes(name)) await caches.delete(name);
    await self.clients.claim();
  })());
});

async function trim(cache, max) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

async function cacheFirst(request) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  // Picsum sends Access-Control-Allow-Origin: *, so ask with CORS. That stores a real response instead of an opaque one,
  // which browsers charge several megabytes of quota for each.
  const response = await fetch(request.url, { mode: 'cors', credentials: 'omit' });
  if (response.ok) {
    await cache.put(request.url, response.clone());
    await trim(cache, MAX_IMAGES);
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(DATA);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw error;
  }
}

async function shell(request) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(request.mode === 'navigate' ? scope : request, { ignoreSearch: request.mode === 'navigate' });
  const refresh = fetch(request).then(response => {
    if (response.ok) cache.put(request.mode === 'navigate' ? scope : request, response.clone());
    return response;
  });
  if (hit) {
    refresh.catch(() => {});
    return hit;
  }
  return refresh;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith(new URL(scope).pathname)) event.respondWith(shell(request));
    return;
  }
  if (url.hostname === 'picsum.photos' && (url.pathname.startsWith('/v2/list') || url.pathname.endsWith('/info'))) {
    event.respondWith(networkFirst(request));
  } else if (request.destination === 'image' && url.hostname.endsWith('picsum.photos')) {
    event.respondWith(cacheFirst(request));
  }
});
