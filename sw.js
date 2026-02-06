const CACHE_NAME = 'css-exam-v1';
const ASSETS = [
    'index.html',
    'style.css',
    'app.js',
    'questions.json',
    'bg.png',
    'favicon.png',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
