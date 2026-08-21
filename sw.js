
// A simple, robust, offline-first service worker.
// v4: Added PNG icons to cache list.

const CACHE_NAME = 'al-mohaseb-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// 1. Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching basic assets');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 2. Activation
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetching
self.addEventListener('fetch', (event) => {
  // Let Supabase API requests and other external requests go directly to the network.
  if (event.request.url.includes('supabase.co') || event.request.url.includes('aistudiocdn.com') || event.request.url.includes('googleapis.com')) {
    return; // Pass through to the browser's default fetch handler.
  }

  // Network-first for navigation to get the latest HTML.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If fetch is successful, cache the new version.
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, serve from cache. Fallback to the root index.html.
          return caches.match('/');
        })
    );
    return;
  }

  // Cache-first for all other static assets (JS, CSS, fonts, etc.).
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return from cache if found.
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise, fetch from network, cache, and return.
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || !['basic', 'cors'].includes(networkResponse.type)) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});

// 4. Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          const clientUrl = new URL(client.url, self.location.origin);
          if (clientUrl.origin === self.location.origin) {
            if ('navigate' in client) {
              client.navigate('/');
            }
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

