const CACHE_NAME = 'stocktrack-v1';
const ASSETS = [
  './',
  './stock-portfolio-app.html',
  './widget.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        if (response.status === 200 && e.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    }).catch(function() {
      if (e.request.destination === 'document') {
        return caches.match('./stock-portfolio-app.html');
      }
    })
  );
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'UPDATE_BADGE') {
    var count = e.data.count || 0;
    if ('setAppBadge' in self) {
      self.setAppBadge(count).catch(function() {});
    }
  }
  if (e.data && e.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in self) {
      self.clearAppBadge().catch(function() {});
    }
  }
});

self.addEventListener('periodicsync', function(e) {
  if (e.tag === 'portfolio-update') {
    e.waitUntil(updatePortfolioBadge());
  }
});

function updatePortfolioBadge() {
  return self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: 'REQUEST_BADGE_UPDATE' });
    });
  });
}

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.includes('stock-portfolio-app') && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      return self.clients.openWindow('./stock-portfolio-app.html');
    })
  );
});
