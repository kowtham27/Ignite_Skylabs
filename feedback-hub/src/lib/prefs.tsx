import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { ProductId } from '../types'

export type Theme = 'system' | 'light' | 'dark'
export type Scope = ProductId | 'all'

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export function applyTheme(theme: Theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}
// Apply before first paint so there's no flash
applyTheme(read<Theme>('heard:theme', 'system'))

interface Prefs {
  theme: Theme
  setTheme: (t: Theme) => void
  /** Which product the admin is looking at, shared across all admin pages */
  scope: Scope
  setScope: (s: Scope) => void
}

const Ctx = createContext<Prefs | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => read('heard:theme', 'system'))
  const [scope, setScope] = useState<Scope>(() => read('heard:scope', 'all'))

  useEffect(() => {
    applyTheme(theme)
    write('heard:theme', theme)
  }, [theme])
  useEffect(() => write('heard:scope', scope), [scope])

  return <Ctx.Provider value={{ theme, setTheme, scope, setScope }}>{children}</Ctx.Provider>
}

export function usePrefs() {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePrefs must be used inside PrefsProvider')
  return v
}
