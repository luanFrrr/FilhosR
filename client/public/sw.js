const CACHE_NAME = "filhos-v11";
const IMAGE_CACHE_NAME = "filhos-images-v1";
const MAX_IMAGE_CACHE_ENTRIES = 200;
const STATIC_ASSETS = ["/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(STATIC_ASSETS);
      try {
        const res = await fetch("/");
        if (res.ok) await cache.put("/__index_fallback__", res.clone());
      } catch (_) {}
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keepCaches = [CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !keepCaches.includes(name))
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

function isSupabaseImageUrl(url) {
  return (
    url.includes(".supabase.co/storage/v1/object/public/") ||
    url.includes(".supabase.co/storage/v1/render/image/public/")
  );
}

async function trimImageCache() {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > MAX_IMAGE_CACHE_ENTRIES) {
    const toDelete = keys.length - MAX_IMAGE_CACHE_ENTRIES;
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#e5e7eb"/></svg>';

async function handleSupabaseImage(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    fetch(request)
      .then(async (response) => {
        if (response.ok) {
          await cache.put(request, response.clone());
          trimImageCache();
        }
      })
      .catch(() => {});
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      trimImageCache();
    }
    return response;
  } catch (_) {
    return new Response(PLACEHOLDER_SVG, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (isSupabaseImageUrl(event.request.url)) {
    event.respondWith(handleSupabaseImage(event.request));
    return;
  }

  if (event.request.url.includes("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }),
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put("/__index_fallback__", clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match("/__index_fallback__").then((cached) => {
            return (
              cached ||
              new Response("Offline", {
                status: 503,
                headers: { "Content-Type": "text/html" },
              })
            );
          });
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
        });
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (response.ok && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }),
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-96x96.png",
    tag: data.tag || "filhos-notification",
    vibrate: [200, 100, 200],
    data: data.data || { url: "/" },
    actions: [
      { action: "open", title: "Abrir" },
      { action: "dismiss", title: "Dispensar" },
    ],
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Filhos", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const urlPath = event.notification.data?.url || "/";
  const urlToOpen = new URL(urlPath, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.postMessage({ type: "NAVIGATE", url: urlPath });
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      }),
  );
});
