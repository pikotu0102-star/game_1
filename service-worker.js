// service-worker.js — 幸運轉盤 PWA 離線快取

const CACHE_NAME = 'lucky-wheel-v4';

// 需要快取的所有靜態資源
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './wheel.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install：預先快取所有資源 ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // 立即啟用，不等待舊 SW 結束
  );
});

// ── Activate：清除舊版本快取 ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // 立即接管所有分頁
  );
});

// ── Fetch：Cache First，找不到再去網路 ───────────────────────────────────
self.addEventListener('fetch', event => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // 快取沒有 → 從網路取得，並存入快取
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // 網路也失敗 → 若是導覽請求，回傳 index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
