const CACHE_NAME = 'richco-survey-v2'
const urlsToCache = [
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/richco-logo.png'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.log('Cache addAll error:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (event.request.url.startsWith('http') && !event.request.url.startsWith(self.location.origin)) {
    return
  }

  const url = new URL(event.request.url)
  const isNavigationRequest = event.request.mode === 'navigate'

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response
      }

      return fetch(event.request).then(response => {
        // For navigation requests, return index.html on any error (404, 500, etc.)
        if (isNavigationRequest && (!response || response.status >= 400)) {
          return caches.match('/index.html')
        }

        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response
        }

        // Clone the response
        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache)
        })

        return response
      }).catch(() => {
        // For navigation requests (app shell), return index.html from cache
        if (isNavigationRequest) {
          return caches.match('/index.html')
        }
        // For other requests, return offline message
        return new Response('Offline - please check your connection', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        })
      })
    })
  )
})
