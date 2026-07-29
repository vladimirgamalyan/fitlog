/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { stashSharedProgram } from './programStore'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

/**
 * Web Share Target endpoint. Android submits the shared file as a POST
 * navigation to this path; only a service worker can answer it. The file's
 * text is stashed in IndexedDB and the request is redirected to the app,
 * which validates and imports the pending text on launch. Validation stays
 * in the app so a broken file produces a visible error there, not a silently
 * failed navigation here.
 */
const SHARE_PATH = `${import.meta.env.BASE_URL}share-program`

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.origin !== self.location.origin) return
  if (url.pathname !== SHARE_PATH) return
  event.respondWith(handleShare(event.request))
})

async function handleShare(request: Request): Promise<Response> {
  try {
    const file = (await request.formData()).get('program')
    if (file instanceof File) await stashSharedProgram(await file.text())
  } catch {
    // Fall through: the app opens normally and simply has nothing pending.
  }
  return Response.redirect(import.meta.env.BASE_URL, 303)
}
