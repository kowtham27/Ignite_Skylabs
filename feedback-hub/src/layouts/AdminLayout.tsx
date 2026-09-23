import { BarChart3, Bell, Briefcase, Bug, Building2, HelpCircle, Inbox, LayoutDashboard, Lightbulb, MessageCircle, Monitor, Moon, Search, Settings, Star, Sun } from 'lucide-react'
import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo, ProductChip, ProductIcon, Segmented } from '../components/bits'
import { PRODUCT_LIST } from '../config/products'
import { usePrefs, type Scope, type Theme } from '../lib/prefs'
import { isOpen } from '../lib/stats'
import { timeAgo } from '../lib/text'
import { useClientRequests } from '../lib/useClients'
import { useFeedbackList } from '../lib/useFeedback'

type NavItem = { section: string } | { to: string; label: string; icon: typeof Bug; end?: boolean; count?: 'all' | 'problem' | 'suggestion' | 'query' | 'client' }

const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { section: 'Users' },
  { to: '/admin/feedback', label: 'All feedback', icon: Inbox, count: 'all' as const },
  { to: '/admin/problems', label: 'Problems', icon: Bug, count: 'problem' as const },
  { to: '/admin/suggestions', label: 'Suggestions', icon: Lightbulb, count: 'suggestion' as const },
  { to: '/admin/questions', label: 'Questions', icon: HelpCircle, count: 'query' as const },
  { section: 'Clients' },
  { to: '/admin/clients', label: 'Clients', icon: Building2 },
  { to: '/admin/client-requests', label: 'Client requests', icon: Briefcase, count: 'client' as const },
  { to: '/admin/whatsapp', label: 'WhatsApp → Notes', icon: MessageCircle },
  { section: 'More' },
  { to: '/admin/reviews', label: 'Reviews & ideas', icon: Star },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const THEMES: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
]

export default function AdminLayout() {
  const { scope, setScope, theme, setTheme } = usePrefs()
  const { items } = useFeedbackList({ product: scope })
  const open = items.filter(isOpen)
  const { data: clientReqs } = useClientRequests()
  const openClient = clientReqs.filter((r) => r.status !== 'resolved' && (scope === 'all' || r.product === scope)).length
  const countFor = (k: 'all' | 'problem' | 'suggestion' | 'query' | 'client') =>
    k === 'client' ? openClient : (k === 'all' ? open : open.filter((f) => f.type === k)).length

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="border-line lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:px-5 lg:py-5">
          <Link to="/admin" className="flex items-baseline gap-2">
            <Logo />
            <span className="text-xs text-muted">user voice</span>
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-2" aria-label="Admin">
          {NAV.map((item) => {
            if ('section' in item)
              return (
                <p key={item.section} className="hidden px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase lg:block">
                  {item.section}
                </p>
              )
            const { to, label, icon: Icon, end, count } = item
            return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition lg:py-1.5 ${
                  isActive ? 'bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--border)]' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon size={16} aria-hidden />
              {label}
              {count && countFor(count) > 0 && <span className="tabular ml-auto pl-2 text-xs text-muted">{countFor(count)}</span>}
            </NavLink>
            )
          })}
        </nav>
        <div className="hidden space-y-3 border-t border-line px-5 py-4 lg:block">
          <p className="text-xs text-muted">Public form links</p>
          {PRODUCT_LIST.map((p) => (
            <a key={p.id} href={`/feedback/${p.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
              <ProductIcon product={p.id} size={18} />
              {p.name} form <span className="ml-auto" aria-hidden>↗</span>
            </a>
          ))}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur sm:px-6">
          <Segmented<Scope>
            label="Product"
            value={scope}
            onChange={setScope}
            options={[{ value: 'all', label: 'All products' }, ...PRODUCT_LIST.map((p) => ({ value: p.id as Scope, label: p.name }))]}
          />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1">
            <div className="flex rounded-lg border border-line bg-surface p-0.5" role="radiogroup" aria-label="Theme">
              {THEMES.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={theme === value}
                  aria-label={label}
                  title={label}
                  onClick={() => setTheme(value)}
                  className={`rounded-md p-1.5 ${theme === value ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'}`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
            <Notifications />
            <span className="ml-2 grid size-8 place-items-center rounded-full bg-marker text-xs font-bold text-ink" title="Admin">
              AD
            </span>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<div className="mx-auto h-64 max-w-6xl animate-pulse rounded-xl bg-surface-2" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function GlobalSearch() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    nav(`/admin/feedback?q=${encodeURIComponent(q.trim())}`)
  }
  // "/" focuses search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <form onSubmit={submit} className="relative order-last w-full sm:order-none sm:w-64">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input id="global-search" value={q} onChange={(e) => setQ(e.target.value)} className="input py-1.5 pl-8" placeholder="Search feedback, ref ID, user…" />
      <kbd className="absolute top-1/2 right-2 hidden -translate-y-1/2 sm:block">/</kbd>
    </form>
  )
}

/** Bell shows new urgent/high items nobody has picked up yet */
function Notifications() {
  const { scope } = usePrefs()
  const { items } = useFeedbackList({ product: scope, status: 'new' })
  const hot = items.filter((f) => f.priority === 'urgent' || f.priority === 'high')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative rounded-lg p-2 text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={`Notifications, ${hot.length} need attention`} aria-expanded={open}>
        <Bell size={17} />
        {hot.length > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-pop ring-2 ring-bg" />}
      </button>
      {open && (
        <div className="card absolute right-0 z-30 mt-2 w-80 overflow-hidden shadow-lg">
          <p className="border-b border-line px-4 py-2.5 text-sm font-medium">
            {hot.length ? `${hot.length} new ${hot.length === 1 ? 'report needs' : 'reports need'} you` : 'All caught up'}
          </p>
          <ul className="max-h-80 overflow-y-auto">
            {hot.slice(0, 8).map((f) => (
              <li key={f.id}>
                <Link to={`/admin/feedback/${f.id}`} onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-surface-2">
                  <span className="flex items-center gap-2">
                    <ProductChip product={f.product} />
                    <span className="text-xs text-muted">{timeAgo(f.createdAt)}</span>
                  </span>
                  <span className="mt-1 block truncate text-sm">{f.subject}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
