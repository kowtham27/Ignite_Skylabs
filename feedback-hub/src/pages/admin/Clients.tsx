import { ArrowLeft, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Empty, ProductIcon } from '../../components/bits'
import ClientForm from '../../components/ClientForm'
import { ClientIdCard } from '../../components/ClientIdCard'
import { RequestRow } from '../../components/RequestBits'
import { CLIENT_STATUS_META, NEW_CLIENT_DAYS, ORG_TYPES } from '../../config/clients'
import { usePrefs } from '../../lib/prefs'
import { useClient, useClientRequests, useClients } from '../../lib/useClients'
import { clientApi } from '../../services/clientApi'
import type { Client, ClientStatus } from '../../types'

const isRecent = (c: Client) => Date.now() - +new Date(c.joinedAt) < NEW_CLIENT_DAYS * 864e5

export function Clients() {
  const { scope } = usePrefs()
  const { data: clients, loading } = useClients()
  const { data: requests } = useClientRequests()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [created, setCreated] = useState<Client | null>(null)

  const rows = clients.filter(
    (c) => (scope === 'all' || c.products.includes(scope)) && (!q || `${c.org} ${c.clientId} ${c.contactName} ${c.city} ${c.email}`.toLowerCase().includes(q.toLowerCase())),
  )
  const recent = rows.filter(isRecent)
  const openFor = (id: string) => requests.filter((r) => r.clientId === id && r.status !== 'resolved').length

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="mt-1 text-sm text-ink-2">Organisations using Ridemap or PrintA4. {recent.length > 0 && <>{recent.length} joined in the last {NEW_CLIENT_DAYS} days.</>}</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary">
          <Plus size={15} /> Add client
        </button>
      </div>

      {recent.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-2">Recently joined</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recent.map((c) => (
              <Link key={c.id} to={`/admin/clients/${c.clientId}`} className="card w-60 shrink-0 p-4 transition hover:border-ink-2">
                <p className="font-mono text-xs text-muted">{c.clientId}</p>
                <p className="mt-1 truncate font-medium">{c.org}</p>
                <p className="mt-2 flex items-center justify-between text-xs text-ink-2">
                  <span>{daysAgo(c.joinedAt)}</span>
                  <span className={`rounded-full px-2 py-0.5 ${CLIENT_STATUS_META[c.status].className}`}>{CLIENT_STATUS_META[c.status].label}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="relative mt-6 w-full sm:w-72">
        <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input className="input py-1.5 pl-8" placeholder="Search name, ID, city…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" />
      </div>

      <div className="card mt-3 overflow-x-auto">
        {loading ? (
          <div className="h-40 animate-pulse bg-surface-2/60" />
        ) : rows.length ? (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-ink-2">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Products</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Open requests</th>
                <th className="px-4 py-2.5 text-right font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link to={`/admin/clients/${c.clientId}`} className="block">
                      <span className="font-medium">{c.org}</span>
                      {isRecent(c) && <span className="ml-2 rounded bg-marker px-1.5 py-px text-[10px] font-bold text-ink uppercase">New</span>}
                      <span className="block font-mono text-xs text-muted">
                        {c.clientId} · {c.city}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex gap-1">
                      {c.products.map((p) => (
                        <ProductIcon key={p} product={p} size={20} />
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CLIENT_STATUS_META[c.status].className}`}>{CLIENT_STATUS_META[c.status].label}</span>
                  </td>
                  <td className="tabular px-4 py-3 text-right">{openFor(c.clientId) || <span className="text-muted">0</span>}</td>
                  <td className="px-4 py-3 text-right text-xs text-ink-2">{new Date(c.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty title="No clients found" />
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Add client">
          <div className="card max-h-[90dvh] w-full max-w-2xl overflow-y-auto p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{created ? 'Client added' : 'Add a new client'}</h2>
              <button
                onClick={() => {
                  setAdding(false)
                  setCreated(null)
                }}
                className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-2"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {created ? (
              <>
                <p className="mb-4 text-sm text-ink-2">
                  Share this Client ID with {created.contactName}. They sign in at <span className="font-mono">/client/login</span> with it and {created.email}.
                </p>
                <ClientIdCard client={created} />
              </>
            ) : (
              <ClientForm submitLabel="Create Client ID" onSubmit={async (c) => setCreated(await clientApi.createClient({ ...c, status: 'onboarding' }))} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function ClientDetail() {
  const { clientId = '' } = useParams()
  const { data: client, loading } = useClient(clientId)
  const { data: requests } = useClientRequests(clientId)
  if (loading) return <div className="mx-auto h-64 max-w-5xl animate-pulse rounded-xl bg-surface-2" />
  if (!client) return <Empty title="Client not found" />

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft size={15} /> All clients
      </Link>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <ClientIdCard client={client} />
        <section className="card p-5">
          <dl className="space-y-2.5 text-sm">
            {[
              ['Type', ORG_TYPES[client.orgType]],
              ['Contact', client.contactName],
              ['Email', client.email],
              ['Mobile', client.phone],
              ['City', client.city || '–'],
              ['Buses', client.buses ?? '–'],
              ['Kiosks', client.kiosks ?? '–'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-ink-2">{k}</dt>
                <dd className="truncate text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <label htmlFor="cstatus" className="label mt-5">
            Account status
          </label>
          <select id="cstatus" className="input" value={client.status} onChange={(e) => clientApi.setClientStatus(client.clientId, e.target.value as ClientStatus)}>
            {Object.entries(CLIENT_STATUS_META).map(([v, m]) => (
              <option key={v} value={v}>
                {m.label}
              </option>
            ))}
          </select>
        </section>
      </div>
      <section className="card mt-6 overflow-hidden">
        <h2 className="px-5 pt-5 pb-3 text-base font-bold">Requests from {client.org}</h2>
        {requests.length ? (
          <div className="divide-y divide-line border-t border-line">
            {requests.map((r) => (
              <RequestRow key={r.id} r={r} to={`/admin/client-requests/${r.id}`} />
            ))}
          </div>
        ) : (
          <p className="border-t border-line px-5 py-8 text-center text-sm text-muted">No requests yet.</p>
        )}
      </section>
    </div>
  )
}

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - +new Date(iso)) / 864e5)
  return d === 0 ? 'Joined today' : d === 1 ? 'Joined yesterday' : `Joined ${d} days ago`
}
