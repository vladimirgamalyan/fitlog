import type { ProgramsFile } from './types'

/**
 * IndexedDB persistence for imported programs. localStorage is not used here
 * because a program file carries its photos as data URLs (about 1.5 MB for a
 * two-day split) and would crowd the ~5 MB quota the workout log lives in.
 *
 * The module is shared with the service worker: the share-target handler
 * stashes the received file's text here, and the app picks it up on the next
 * launch. Both run on the same origin, so they see the same database.
 */

const DB_NAME = 'fitlog'
const STORE = 'kv'
const PROGRAMS_KEY = 'programs'
const SHARED_KEY = 'shared-program-text'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

/** The programs the user imported, or null when none were ever imported. */
export async function loadImportedPrograms(): Promise<ProgramsFile | null> {
  const value = await withStore('readonly', (store) => store.get(PROGRAMS_KEY))
  return (value as ProgramsFile | undefined) ?? null
}

export async function saveImportedPrograms(file: ProgramsFile): Promise<void> {
  await withStore('readwrite', (store) => store.put(file, PROGRAMS_KEY))
}

/** Called by the service worker with the raw text of a shared file. */
export async function stashSharedProgram(text: string): Promise<void> {
  await withStore('readwrite', (store) => store.put(text, SHARED_KEY))
}

/** Returns the pending shared file's text and clears it, or null when none. */
export async function takeSharedProgram(): Promise<string | null> {
  const value = await withStore('readonly', (store) => store.get(SHARED_KEY))
  if (typeof value !== 'string') return null
  await withStore('readwrite', (store) => store.delete(SHARED_KEY))
  return value
}
