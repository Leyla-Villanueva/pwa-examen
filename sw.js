const CACHE_NAME = 'examen1-cache-v1';

const ASSETS = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './image/icons/192.png',
    './image/icons/512.png',
    './sw.js'
];

//EVENTO INSTALL
self.addEventListener('install', event => {
    console.log('Service Worker: instalando');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .catch(err => {
                console.warn('Service Worker: cache.addAll falló', err);
            })
    );
    self.skipWaiting();
});


// Activar Service Worker
self.addEventListener('activate', function(event) {
    event.waitUntil(
        // 1. Obtener todos los nombres de caché existentes
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                // 2. Mapear y filtrar los cachés que no coinciden con el nombre actual
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        // 3. Eliminar los cachés obsoletos
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});


// Interceptar peticiones
self.addEventListener('fetch', function(event) {
    event.respondWith(
        // 1. Intentar encontrar la solicitud en el caché
        caches.match(event.request)
            .then(function(response) {
                // 2. Si se encuentra una respuesta en caché (es decir, el archivo existe)
                if (response) {
                    return response; // Devolver la versión en caché
                }
                // 3. Si no está en caché, ir a la red
                return fetch(event.request);
            })
    );
});