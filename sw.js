/* fofcorn — app-shell service worker.
   Implements Stale-While-Revalidate for local files to ensure instant offline boot 
   while keeping the app updated. Never caches external APIs. */

const CACHE = 'fofcorn-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './wire.jsx',
  './data.jsx',
  './shared.jsx',
  './settings.jsx',
  './library.jsx',
  './notebook.jsx',
  './sticky.jsx',
  './scratchpad.jsx',
  './onboarding.jsx',
  './main.jsx',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  /* Never intercept GitHub API or external scripts — must hit network */
  if (url.host === 'api.github.com' || url.host === 'github.com') return;
  if (url.host === 'esm.sh' || url.host === 'unpkg.com') return;

  if (e.request.method !== 'GET') return;

  /* Stale-While-Revalidate for our own local application files */
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(CACHE).then(cache => {
        return cache.match(e.request).then(cachedResponse => {
          const fetchPromise = fetch(e.request).then(networkResponse => {
            // Update the cache silently in the background
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Ignore network errors if offline, the cached response will serve
          });
          
          // Return the instant cached response if we have it, otherwise wait for the network
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});
