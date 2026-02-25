const CACHE_NAME = 'ipvp-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/main.js',
    '/js/engine/GameLoop.js',
    '/js/engine/Renderer.js',
    '/js/engine/Camera.js',
    '/js/engine/InputManager.js',
    '/js/engine/Physics.js',
    '/js/network/NetworkManager.js',
    '/js/network/HostState.js',
    '/js/network/ClientState.js',
    '/js/entities/Planet.js',
    '/js/entities/Player.js',
    '/js/entities/Projectile.js',
    '/js/entities/Meteorite.js',
    '/js/entities/Particle.js',
    '/js/systems/GravitySystem.js',
    '/js/systems/CollisionSystem.js',
    '/js/systems/WeaponSystem.js',
    '/js/systems/HazardSystem.js',
    '/js/ui/Menu.js',
    '/js/ui/HUD.js',
    '/js/ui/Ranking.js',
    '/js/assets/SVGAssets.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request))
    );
});
