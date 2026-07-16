const CACHE_NAME = "cika-vocab-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./data/beginner.json",
  "./data/intermediate.json",
  "./data/advanced.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

// network-first: app shell + data change over time and must not get stuck stale
const NETWORK_FIRST = /(\/|index\.html|manifest\.json|data\/.*\.json)$/;

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  var isNavigation = event.request.mode === "navigate";
  var useNetworkFirst = isNavigation || NETWORK_FIRST.test(url.pathname);

  if (useNetworkFirst) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || (isNavigation ? caches.match("./index.html") : undefined);
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        if (response.ok && response.type === "basic") {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
        }
        return response;
      });
    })
  );
});
