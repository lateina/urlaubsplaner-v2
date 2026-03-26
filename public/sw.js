const CACHE_NAME = 'planer-v2-cache-v1';

// Basic service worker to enable PWA recognition on iOS
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now
  event.respondWith(fetch(event.request));
});
