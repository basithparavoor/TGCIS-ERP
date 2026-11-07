/**
 * THAIBA COLLEGE OF INTEGRATED STUDIES — Service Worker (v2)
 * Robust Network-First Offline Caching
 */

const CACHE_NAME = 'tgcis-erp-cache-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './dashboard',
  './dashboard.html',
  './login',
  './admission',
  './student',
  './parent',
  './teacher',
  './admin',
  './login.html',
  './admission.html',
  './app.css',
  './manifest.json',
  './icons/icon.svg',
  './tps-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('TMS SW precache partial notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle http/https GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Skip authentication, Supabase API, Google OAuth, and CDN assets
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('google') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.pathname.includes('/auth/v1/')
  ) {
    return;
  }

  // Network-First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid local responses asynchronously
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Network failed (offline or server unreachable) -> check local cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // If requesting an HTML page while offline, fallback to index or login
        if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
          const fallbackHtml = (await caches.match('./')) || (await caches.match('./index.html')) || (await caches.match('./login')) || (await caches.match('./login.html'));
          if (fallbackHtml) return fallbackHtml;
        }

        // Always return a valid Response (never return undefined, which breaks SW)
        return new Response('Network offline or resource temporarily unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});
