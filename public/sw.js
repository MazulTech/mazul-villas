// Service worker de Mazul: deja que la app abra aunque no haya señal.
//
// Estrategia: red primero (para no mostrar algo viejo cuando sí hay señal),
// y si la red falla se usa la última copia que quedó guardada en cache.
// Para abrir la app en sí (navegación) siempre hay un plan B: servir el
// último "/" que se guardó, aunque la URL exacta que se pidió no se haya
// visitado antes.
//
// Los datos (villas, mejoras, inventario) NO se cachean aquí — eso lo
// maneja src/lib/offlineDb.ts con IndexedDB, junto con la cola de tareas
// pendientes por subir (src/lib/sync.ts).

const CACHE_NOMBRE = "mazul-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NOMBRE)
      .then((cache) => cache.addAll(["/", "/index.html"]))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Las llamadas a Supabase (datos y fotos) no se guardan aquí.
  if (url.hostname.includes("supabase.co")) return;

  event.respondWith(
    fetch(request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NOMBRE).then((cache) => cache.put(request, copia));
        return respuesta;
      })
      .catch(async () => {
        const enCache = await caches.match(request);
        if (enCache) return enCache;
        if (request.mode === "navigate") {
          const shell = (await caches.match("/")) || (await caches.match("/index.html"));
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});
