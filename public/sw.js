// Service worker disabled — will be re-enabled when offline support is needed.
// This file auto-unregisters any previously installed service worker.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
  self.registration.unregister();
});
