import { LogOut, MessageSquareHeart } from 'lucide-react'
import { Suspense } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '../components/bits'
import { signOut, useSession } from '../lib/clientSession'
import { useClient } from '../lib/useClients'

const PUBLIC = ['/', '/client/login', '/client/join']

export default function ClientLayout() {
  const session = useSession()
  const { pathname } = useLocation()
  const { data: client, loading } = useClient(session)
  const isPublic = PUBLIC.includes(pathname)

  if (!session && !isPublic) return <Navigate to="/client/login" replace />
  // Signed-in session for a client that no longer exists
  if (session && !loading && !client && !isPublic) {
    signOut()
    return <Navigate to="/client/login" replace />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
          <Link to="/client" className="flex items-baseline gap-2">
            <Logo />
            <span className="text-xs text-muted">for clients</span>
          </Link>
          {client && (
            <>
              <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Client">
                {[
                  ['/', 'Home'],
                  ['/client/new', 'New request'],
                  ['/client/requests', 'My requests'],
                ].map(([to, label]) => (
                  <NavLink
                    key={to}
                    to={to}
                    end
                    className={({ isActive }) => `shrink-0 rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-surface-2 font-medium text-ink' : 'text-ink-2 hover:text-ink'}`}
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-3">
                <UsersPanelButton />
                <div className="text-right leading-tight">
                  <p className="max-w-48 truncate text-sm font-medium">{client.org}</p>
                  <p className="font-mono text-xs text-muted">{client.clientId}</p>
                </div>
                <button onClick={signOut} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label="Sign out" title="Sign out">
                  <LogOut size={16} />
                </button>
              </div>
            </>
          )}
          {!client && (
            <div className="ml-auto">
              <UsersPanelButton />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface-2" />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted sm:px-6">Client panel for Ridemap &amp; PrintA4 partners. A real person on our team reads every request.</footer>
    </div>
  )
}

/** Way over to the feedback side for students, staff and customers */
function UsersPanelButton() {
  return (
    <Link
      to="/feedback"
      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-2 transition hover:border-ink-2 hover:text-ink"
      title="Feedback page for students, staff and customers"
    >
      <MessageSquareHeart size={15} /> Users panel
    </Link>
  )
}
