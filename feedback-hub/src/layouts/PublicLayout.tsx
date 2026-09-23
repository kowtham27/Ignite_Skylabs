import { Building2 } from 'lucide-react'
import { Link, Outlet, useSearchParams } from 'react-router-dom'
import { Logo } from '../components/bits'

export default function PublicLayout() {
  // ?embed=1 strips the chrome so the form can sit inside an iframe on ridemap.in / printa4.in
  const [params] = useSearchParams()
  const embed = params.get('embed') === '1'

  if (embed) {
    return (
      <main className="mx-auto max-w-xl px-4 py-5">
        <Outlet />
      </main>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/feedback" aria-label="Home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-5 text-sm text-ink-2">
          <Link to="/track" className="hover:text-ink">
            Check my feedback
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 hover:border-ink-2 hover:text-ink">
            <Building2 size={15} /> Client panel
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted sm:px-6">
        Every message here is read by the people who build Ridemap and PrintA4. Not a bot.
      </footer>
    </div>
  )
}
