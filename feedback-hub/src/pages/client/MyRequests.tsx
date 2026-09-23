import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Empty, ProductChip } from '../../components/bits'
import { KindTag, RequestRow, RequestStatus, RequestThread, Stars } from '../../components/RequestBits'
import { KIND_META, KIND_ORDER, statusLabel } from '../../config/clients'
import { STATUS_META, STATUS_ORDER } from '../../config/products'
import { useSession } from '../../lib/clientSession'
import { formatDate } from '../../lib/text'
import { useClient, useClientRequest, useClientRequests } from '../../lib/useClients'
import { clientApi } from '../../services/clientApi'
import type { RequestKind } from '../../types'

export function MyRequests() {
  const session = useSession()
  const { data: requests, loading } = useClientRequests(session ?? undefined)
  const [kind, setKind] = useState<RequestKind | 'all'>('all')
  const [openOnly, setOpenOnly] = useState(false)
  const rows = requests.filter((r) => (kind === 'all' || r.kind === kind) && (!openOnly || r.status !== 'resolved'))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold">My requests</h1>
        <Link to="/client/new" className="btn-primary">
          New request
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(['all', ...KIND_ORDER] as const).map((k) => (
          <button
            key={k}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-full border px-3 py-1 text-sm ${kind === k ? 'border-ink bg-ink text-bg' : 'border-line text-ink-2 hover:text-ink'}`}
          >
            {k === 'all' ? 'All' : KIND_META[k].label}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="accent-[var(--ink)]" /> Open only
        </label>
      </div>
      <div className="card mt-4 overflow-hidden">
        {loading ? (
          <div className="h-40 animate-pulse bg-surface-2/60" />
        ) : rows.length ? (
          <div className="divide-y divide-line">
            {rows.map((r) => (
              <RequestRow key={r.id} r={r} to={`/client/requests/${r.id}`} />
            ))}
          </div>
        ) : (
          <Empty title="Nothing here">No requests match this filter.</Empty>
        )}
      </div>
    </div>
  )
}

export function ClientRequestView() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const session = useSession()
  const { data: client } = useClient(session)
  const { data: r, loading } = useClientRequest(id)

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
  // Clients can only see their own requests
  if (!r || !client || r.clientId !== client.clientId) return <Empty title="Request not found" />

  const current = STATUS_ORDER.indexOf(r.status)
  return (
    <div className="max-w-3xl">
      <Link to="/client/requests" className="text-sm text-ink-2 hover:text-ink">
        &larr; My requests
      </Link>
      {params.get('new') && (
        <p className="mt-4 rounded-lg bg-marker/40 px-4 py-2.5 text-sm">
          Sent! Your reference is <b className="font-mono">{r.refId}</b>. We&rsquo;ll reply here.
        </p>
      )}
      <article className="card mt-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <ProductChip product={r.product} />
          <KindTag kind={r.kind} />
          <span className="font-mono text-xs text-muted">{r.refId}</span>
          <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold">{r.subject}</h1>
        {r.rating && <Stars n={r.rating} size={18} />}
        {r.order && (
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-2 p-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Item</dt>
              <dd>{r.order.item}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Quantity</dt>
              <dd>{r.order.quantity}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Needed by</dt>
              <dd>{r.order.neededBy ? new Date(r.order.neededBy).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '–'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Location</dt>
              <dd>{r.order.location ?? '–'}</dd>
            </div>
          </dl>
        )}
        {r.message && <p className="mt-4 leading-relaxed whitespace-pre-line text-ink-2">{r.message}</p>}

        <ol className="mt-7 grid grid-cols-4 gap-1" aria-label="Progress">
          {STATUS_ORDER.map((s, i) => (
            <li key={s} className="flex flex-col gap-2">
              <span className={`h-1.5 rounded-full ${i <= current ? 'bg-ink' : 'bg-surface-2'}`} />
              <span className={`text-xs ${i === current ? 'font-semibold text-ink' : i < current ? 'text-ink-2' : 'text-muted'}`}>{statusLabel(r.kind, s, STATUS_META[s].label)}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <RequestStatus kind={r.kind} status={r.status} />
        </div>
      </article>
      <div className="mt-6">
        <RequestThread r={r} viewer="client" onSend={(t) => clientApi.message(r.id, t, 'client', client.contactName)} />
      </div>
    </div>
  )
}
