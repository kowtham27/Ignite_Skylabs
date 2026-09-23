import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Empty } from '../../components/bits'
import { ClientIdCard } from '../../components/ClientIdCard'
import { RequestRow } from '../../components/RequestBits'
import { KIND_META, KIND_ORDER } from '../../config/clients'
import { PRODUCTS } from '../../config/products'
import { useSession } from '../../lib/clientSession'
import { formatDate } from '../../lib/text'
import { useClient, useClientRequests } from '../../lib/useClients'

export default function ClientHome() {
  const session = useSession()
  const { data: client } = useClient(session)
  const { data: requests, loading } = useClientRequests(session ?? undefined)
  if (!client) return null

  const open = requests.filter((r) => r.status !== 'resolved')
  // Latest thing the team said, across all requests
  const lastReply = requests
    .flatMap((r) => r.activity.filter((a) => a.kind === 'reply').map((a) => ({ a, r })))
    .sort((x, y) => y.a.at.localeCompare(x.a.at))[0]

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-sm text-ink-2">Hello, {client.contactName}.</p>
          <h1 className="mt-1 text-3xl leading-tight font-extrabold">
            {open.length ? (
              <>
                You have <span className="marker">{open.length} open {open.length === 1 ? 'request' : 'requests'}</span> with us.
              </>
            ) : (
              <>
                Nothing pending. <span className="marker">All good.</span>
              </>
            )}
          </h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-2">
            {client.products.includes('ridemap') && (
              <span>
                {PRODUCTS.ridemap.name}: <b className="text-ink">{client.buses ?? '–'}</b> buses
              </span>
            )}
            {client.products.includes('printa4') && (
              <span>
                {PRODUCTS.printa4.name}: <b className="text-ink">{client.kiosks ?? '–'}</b> kiosks
              </span>
            )}
          </div>
          {lastReply && (
            <Link to={`/client/requests/${lastReply.r.id}`} className="card mt-6 block p-4 transition hover:border-ink-2">
              <p className="text-xs text-muted">Latest from our team · {formatDate(lastReply.a.at)}</p>
              <p className="mt-1 line-clamp-2 text-sm">{lastReply.a.text}</p>
              <p className="mt-1 truncate text-xs text-ink-2">on &ldquo;{lastReply.r.subject}&rdquo;</p>
            </Link>
          )}
        </div>
        <ClientIdCard client={client} />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">What do you need?</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {KIND_ORDER.map((k) => {
            const Icon = KIND_META[k].icon
            return (
              <Link key={k} to={`/client/new?kind=${k}`} className="group card flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:border-ink-2">
                <Icon size={20} className="mt-0.5 shrink-0 text-ink-2 group-hover:text-ink" aria-hidden />
                <span>
                  <span className="block font-medium">{KIND_META[k].action}</span>
                  <span className="block text-xs text-ink-2">{KIND_META[k].hint}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold">Recent requests</h2>
          <Link to="/client/requests" className="inline-flex items-center gap-1 text-xs text-ink-2 hover:text-ink">
            See all <ArrowRight size={12} />
          </Link>
        </div>
        {!loading && !requests.length ? (
          <Empty title="Nothing sent yet">When you report something or place an order, you&rsquo;ll track it here.</Empty>
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {requests.slice(0, 5).map((r) => (
              <RequestRow key={r.id} r={r} to={`/client/requests/${r.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
