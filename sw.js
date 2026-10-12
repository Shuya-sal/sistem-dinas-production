const CACHE_NAME = 'sisdin-cache-v11';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Mencegat request jaringan untuk mempercepat loading gambar & CSS (Irit Kuota)
self.addEventListener('fetch', (event) => {
    const req = event.request;
    
    // Jangan pernah men-cache permintaan API (POST/DELETE) agar data selalu segar
    if (req.method !== 'GET') return; 

    // JANGAN pernah cache endpoint dinamis (avatar/media) karena foto bisa berubah
    // Cache tanpa query param bisa menyebabkan foto lama tampil setelah diganti
    if (req.url.match(/\?(.*&)?(media|avatar)=/i)) return;

    // Cache khusus untuk Aset Statis (CSS, dan Gambar statis)
    if (req.url.match(/\.(css|png|jpg|jpeg|webp|gif)(\?|$)/i) && !req.url.match(/\?(.*&)?(media|avatar)=/i)) {
        event.respondWith(
            caches.match(req).then((cachedResponse) => {
                // 1. Jika gambar/css sudah ada di cache HP, gunakan itu! (Instan)
                if (cachedResponse) {
                    return cachedResponse; 
                }
                // 2. Jika belum ada, download dari server lalu simpan ke cache
                return fetch(req).then((networkResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(req, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
});