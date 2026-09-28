const CACHE_NAME = 'fruit-2048-v1';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/config.js',
  './js/state.js',
  './js/render.js',
  './js/game.js',
  './js/input.js',
  './js/sdk.js',
  './js/sound.js',
  './js/storage.js',
  './js/locales.js',
  './assets/bg-music.mp3',
  './assets/move.mp3',
  './assets/merge.mp3',
  './assets/spawn.mp3',
  './assets/button.mp3',
  './assets/undo.mp3',
  './assets/hint.mp3',
  './assets/win.mp3',
  './assets/gameover.mp3',
  './assets/record.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});