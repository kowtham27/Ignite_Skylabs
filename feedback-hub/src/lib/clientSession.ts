import { useSyncExternalStore } from 'react'

// Mock session: just remembers which Client ID is signed in on this browser.
// Replace with real auth (token/cookie) when the backend exists.
const KEY = 'heard:client-session'
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function signIn(clientId: string) {
  try {
    localStorage.setItem(KEY, clientId)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function signOut() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function useSession(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => null,
  )
}
