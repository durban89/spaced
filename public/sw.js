const CACHE_NAME = 'aosibin-v1'
const STATIC_ASSETS = [
  '/spaced/',
  '/spaced/index.html',
  '/spaced/manifest.json',
]

const DB_NAME = 'aosibin-db'
const DB_VERSION = 1
const STORE_NAME = 'cards'
const CHECK_INTERVAL = 5 * 60 * 1000

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
  startDueCheck()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      return cached || fetched
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/spaced/') && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/spaced/')
    })
  )
})

function getDueCards() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onsuccess = (e) => {
      const db = e.target.result
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const getAll = store.getAll()
      getAll.onsuccess = () => {
        const now = Date.now()
        resolve(getAll.result.filter((c) => c.nextReview <= now))
      }
      getAll.onerror = () => reject(getAll.error)
    }
    req.onerror = () => reject(req.error)
  })
}

async function checkDueCards() {
  try {
    const due = await getDueCards()
    if (due.length === 0) return

    const lastCount = parseInt((await self.registration?.storage?.get?.('last-due-count')) || '0')
    if (due.length === lastCount) return

    const preview = due.slice(0, 3).map((c) => c.question.slice(0, 40))

    self.registration.showNotification('Ebbinghaus Memory', {
      body: `${due.length} 张卡片需要复习\n${preview.join('\n')}`,
      icon: '/spaced/icons/icon-192.png',
      tag: 'due-cards',
      renotify: true,
    })
  } catch (e) {
    // silent fail
  }
}

function startDueCheck() {
  checkDueCards()
  setInterval(checkDueCards, CHECK_INTERVAL)
}
