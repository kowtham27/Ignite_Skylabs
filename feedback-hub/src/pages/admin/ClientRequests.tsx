import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Empty, ProductChip } from '../../components/bits'
import { KindTag, RequestRow, RequestStatus, RequestThread, Stars, WhatsAppBadge } from '../../components/RequestBits'
import { KIND_META, KIND_ORDER, statusLabel } from '../../config/clients'
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER } from '../../config/products'
import { usePrefs } from '../../lib/prefs'
import { formatDate } from '../../lib/text'
import { useClient, useClientRequest, useClientRequests, useClients } from '../../lib/useClients'
import { clientApi } from '../../services/clientApi'
import type { Priority, RequestKind, Status } from '../../types'

const CANNED = {
  'On it': "Thanks for flagging this. Our team is on it and we'll update you here within 24 hours.",
  'Engineer visit': 'We are scheduling an engineer visit. We will confirm the date and time shortly.',
  'Quote shared': 'We have shared the quote and timeline over email. Please confirm and we will proceed.',
  'Dispatched': 'Good news: your order has been dispatched. Expected delivery in 3–5 working days.',
  'Fixed': 'This has been fixed on our side. Could you confirm everything is working now?',
}

export function ClientRequests() {
  const { scope } = usePrefs()
  const [params, setParams] = useSearchParams()
  const { data: requests, loading } = useClientRequests()
  const { data: clients } = useClients()
  const kind = (params.get('kind') ?? 'all') as RequestKind | 'all'
  const status = params.get('status') ?? 'open'
  const orgOf = (id: string) => clients.find((c) => c.clientId === id)?.org

  const inScope = requests.filter((r) => scope === 'all' || r.product === scope)
  const rows = inScope.filter((r) => (kind === 'all' || r.kind === kind) && (status === 'all' ? true : status === 'open' ? r.status !== 'resolved' : r.status === status))
  const openCount = (k: RequestKind) => inScope.filter((r) => r.kind === k && r.status !== 'resolved').length
  const set = (k: string, v: string, def: string) => {
    const n = new URLSearchParams(params)
    if (v === def) n.delete(k)
    else n.set(k, v)
    setParams(n, { replace: true })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Client requests</h1>
      <p className="mt-1 text-sm text-ink-2">Issues, complaints, orders and ideas from paying clients.</p>

      <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-6">
        {KIND_ORDER.map((k) => (
          <button key={k} onClick={() => set('kind', kind === k ? 'all' : k, 'all')} className={`px-3 py-3 text-left transition ${kind === k ? 'bg-surface-2' : 'bg-surface hover:bg-surface-2'}`}>
            <p className="text-xs text-ink-2">{KIND_META[k].label}</p>
            <p className="display text-2xl font-bold">{openCount(k)}</p>
            <p className="text-[11px] text-muted">open</p>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select aria-label="Type" className="input w-auto py-1.5" value={kind} onChange={(e) => set('kind', e.target.value, 'all')}>
          <option value="all">All types</option>
          {KIND_ORDER.map((k) => (
            <option key={k} value={k}>
              {KIND_META[k].label}
            </option>
          ))}
        </select>
        <select aria-label="Status" className="input w-auto py-1.5" value={status} onChange={(e) => set('status', e.target.value, 'open')}>
          <option value="open">Open</option>
          <option value="all">Any status</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <span className="tabular ml-auto text-xs text-muted">{rows.length} shown</span>
      </div>

      <div className="card mt-3 overflow-hidden">
        {loading ? (
          <div className="h-40 animate-pulse bg-surface-2/60" />
        ) : rows.length ? (
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <RequestRow key={r.id} r={r} to={`/admin/client-requests/${r.id}`} org={orgOf(r.clientId)} />
            ))}
          </div>
        ) : (
          <Empty title="All clear">No client requests match.</Empty>
        )}
      </div>
    </div>
  )
}

export function ClientRequestAdmin() {
  const { id = '' } = useParams()
  const { data: r, loading } = useClientRequest(id)
  const { data: client } = useClient(r?.clientId ?? null)
  const [status, setStatus] = useState<Status>('new')
  const [priority, setPriority] = useState<Priority>('medium')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (r) {
      setStatus(r.status)
      setPriority(r.priority)
    }
  }, [r])

  if (loading) return <div className="mx-auto h-64 max-w-5xl animate-pulse rounded-xl bg-surface-2" />
  if (!r) return <Empty title="Request not found" />

  const dirty = status !== r.status || priority !== r.priority || note.trim() !== ''
  const save = async () => {
    setBusy(true)
    await clientApi.updateRequest(r.id, { status, priority, note })
    setNote('')
    setBusy(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/admin/client-requests" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft size={15} /> Client requests
      </Link>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <article className="card p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <ProductChip product={r.product} />
              <KindTag kind={r.kind} />
              <span className="font-mono text-xs text-muted">{r.refId}</span>
              {r.channel === 'whatsapp' && <WhatsAppBadge />}
            </div>
            <h1 className="mt-2 text-2xl font-bold">{r.subject}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <RequestStatus kind={r.kind} status={r.status} />
              <span className={`text-xs ${PRIORITY_META[r.priority].className}`}>{PRIORITY_META[r.priority].label} priority</span>
              <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
            </div>
            {r.rating && (
              <p className="mt-4 flex items-center gap-2">
                <Stars n={r.rating} size={18} />
                {r.testimonialOk && <span className="rounded-full bg-marker/60 px-2 py-0.5 text-xs">OK to quote publicly</span>}
              </p>
            )}
            {r.order && (
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-4 text-sm sm:grid-cols-4">
                <Info k="Item">{r.order.item}</Info>
                <Info k="Quantity">{r.order.quantity}</Info>
                <Info k="Needed by">{r.order.neededBy ?? '–'}</Info>
                <Info k="Location">{r.order.location ?? '–'}</Info>
              </dl>
            )}
            {r.message && <blockquote className="mt-5 border-l-2 border-line pl-4 leading-relaxed whitespace-pre-line">{r.message}</blockquote>}
          </article>
          <RequestThread r={r} viewer="admin" canned={CANNED} onSend={(t) => clientApi.message(r.id, t, 'team', 'Team')} />
        </div>

        <aside className="space-y-6">
          {client && (
            <Link to={`/admin/clients/${client.clientId}`} className="card block p-5 transition hover:border-ink-2">
              <p className="font-mono text-xs text-muted">{client.clientId}</p>
              <p className="mt-1 font-medium">{client.org}</p>
              <p className="mt-2 text-sm text-ink-2">
                {client.contactName} · {client.phone}
              </p>
              <p className="truncate text-sm text-ink-2">{client.email}</p>
            </Link>
          )}
          <section className="card p-5">
            <p className="label">Status</p>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_ORDER.map((s) => (
                <Choice key={s} on={status === s} onClick={() => setStatus(s)}>
                  <span className={`size-2 rounded-full ${STATUS_META[s].dot}`} /> {statusLabel(r.kind, s, STATUS_META[s].label)}
                </Choice>
              ))}
            </div>
            <p className="label mt-5">Priority</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITY_ORDER.map((p) => (
                <Choice key={p} on={priority === p} onClick={() => setPriority(p)}>
                  {PRIORITY_META[p].label}
                </Choice>
              ))}
            </div>
            <label htmlFor="cnote" className="label mt-5">
              Internal note <span className="text-xs font-normal text-muted">client won&rsquo;t see this</span>
            </label>
            <textarea id="cnote" className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
            <button onClick={save} disabled={!dirty || busy} className="btn-primary mt-4 w-full">
              {busy ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null} {saved ? 'Saved' : 'Update request'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Info({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition ${on ? 'border-ink bg-surface-2 font-medium text-ink' : 'border-line text-ink-2 hover:border-ink-2'}`}
    >
      {children}
    </button>
  )
}
