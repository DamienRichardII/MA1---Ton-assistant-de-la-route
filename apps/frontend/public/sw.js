// MA1 Service Worker v6 — Offline PWA Support
const CACHE_NAME = 'ma1-v6';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for API calls
  if (e.request.url.includes('/chat') || e.request.url.includes('/qcm') ||
      e.request.url.includes('/vision') || e.request.url.includes('/auth') ||
      e.request.url.includes('/stripe') || e.request.url.includes('/exam') ||
      e.request.url.includes('/analytics')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first for static assets
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    if (resp.status === 200) {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
    }
    return resp;
  }).catch(() => caches.match('/index.html'))));
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'MA1', body: 'Continuez vos révisions !', icon: '/ma1-logo-brand.jpeg' };
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon || '/ma1-logo-brand.jpeg',
    badge: '/ma1-logo-brand.jpeg',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [{ action: 'open', title: 'Ouvrir MA1' }]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/'));
});
