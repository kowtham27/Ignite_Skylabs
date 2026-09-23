import { ArrowUp } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Empty, ProductChip, StatusBadge } from '../../components/bits'
import { RequestStatus, Stars } from '../../components/RequestBits'
import { RATINGS } from '../../config/products'
import { usePrefs } from '../../lib/prefs'
import { timeAgo } from '../../lib/text'
import { useClientRequests, useClients } from '../../lib/useClients'
import { useFeedbackList } from '../../lib/useFeedback'

type Tab = 'user-reviews' | 'user-suggestions' | 'client-suggestions' | 'client-reviews'
const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: 'user-reviews', label: 'User reviews', blurb: 'What end users (students, staff, customers) rated and said.' },
  { id: 'user-suggestions', label: 'User suggestions', blurb: 'Ideas from end users, most-wanted first.' },
  { id: 'client-suggestions', label: 'Client suggestions', blurb: 'Ideas and opinions from organisations that bought your products.' },
  { id: 'client-reviews', label: 'Client reviews', blurb: 'Star reviews from clients. Marked ones are OK to use as testimonials.' },
]

export default function ReviewsBoard() {
  const { scope } = usePrefs()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'user-reviews'
  const { items: feedback } = useFeedbackList({ product: scope })
  const { data: requests } = useClientRequests()
  const { data: clients } = useClients()
  const orgOf = (id: string) => clients.find((c) => c.clientId === id)?.org ?? id

  const userReviews = feedback.filter((f) => f.rating)
  const userSuggestions = feedback.filter((f) => f.type === 'suggestion').sort((a, b) => b.votes - a.votes)
  const scoped = requests.filter((r) => scope === 'all' || r.product === scope)
  const clientSuggestions = scoped.filter((r) => r.kind === 'suggestion' || r.kind === 'opinion')
  const clientReviews = scoped.filter((r) => r.kind === 'review')
  const counts: Record<Tab, number> = {
    'user-reviews': userReviews.length,
    'user-suggestions': userSuggestions.length,
    'client-suggestions': clientSuggestions.length,
    'client-reviews': clientReviews.length,
  }
  const avg = (ns: number[]) => (ns.length ? (ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(1) : '–')

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">Reviews &amp; ideas</h1>
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm transition ${tab === t.id ? 'border-ink font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink'}`}
          >
            {t.label} <span className="tabular ml-1 text-xs text-muted">{counts[t.id]}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-2">{TABS.find((t) => t.id === tab)?.blurb}</p>

      {tab === 'user-reviews' && (
        <>
          <Summary label="Average experience" value={avg(userReviews.map((f) => f.rating!))} extra="out of 5" />
          <Grid empty={!userReviews.length}>
            {userReviews.map((f) => (
              <Card key={f.id} to={`/admin/feedback/${f.id}`}>
                <div className="flex items-center justify-between">
                  <span className="text-2xl" title={RATINGS[f.rating! - 1].label}>
                    {RATINGS[f.rating! - 1].emoji}
                  </span>
                  <ProductChip product={f.product} />
                </div>
                <p className="mt-3 font-medium">{f.subject}</p>
                <p className="mt-1 line-clamp-3 text-sm text-ink-2">{f.message}</p>
                <p className="mt-3 text-xs text-muted">
                  {f.name} · {timeAgo(f.createdAt)}
                </p>
              </Card>
            ))}
          </Grid>
        </>
      )}

      {tab === 'user-suggestions' && (
        <Grid empty={!userSuggestions.length}>
          {userSuggestions.map((f) => (
            <Card key={f.id} to={`/admin/feedback/${f.id}`}>
              <div className="flex items-start justify-between gap-3">
                <ProductChip product={f.product} />
                <span className="inline-flex items-center gap-1 rounded-full bg-marker/60 px-2 py-0.5 text-xs font-semibold text-ink" title="People asking for this">
                  <ArrowUp size={12} /> {f.votes + 1}
                </span>
              </div>
              <p className="mt-3 font-medium">{f.subject}</p>
              <p className="mt-1 line-clamp-3 text-sm text-ink-2">{f.message}</p>
              <p className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{f.category}</span>
                <StatusBadge status={f.status} />
              </p>
            </Card>
          ))}
        </Grid>
      )}

      {tab === 'client-suggestions' && (
        <Grid empty={!clientSuggestions.length}>
          {clientSuggestions.map((r) => (
            <Card key={r.id} to={`/admin/client-requests/${r.id}`}>
              <div className="flex items-center justify-between gap-3">
                <ProductChip product={r.product} />
                <span className="text-xs text-muted">{r.kind === 'opinion' ? 'Opinion' : 'Suggestion'}</span>
              </div>
              <p className="mt-3 font-medium">{r.subject}</p>
              <p className="mt-1 line-clamp-3 text-sm text-ink-2">{r.message}</p>
              <p className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
                <span className="truncate">{orgOf(r.clientId)}</span>
                <RequestStatus kind={r.kind} status={r.status} />
              </p>
            </Card>
          ))}
        </Grid>
      )}

      {tab === 'client-reviews' && (
        <>
          <Summary label="Average client rating" value={avg(clientReviews.map((r) => r.rating ?? 0))} extra="stars" />
          <Grid empty={!clientReviews.length}>
            {clientReviews.map((r) => (
              <Card key={r.id} to={`/admin/client-requests/${r.id}`}>
                <div className="flex items-center justify-between">
                  <Stars n={r.rating ?? 0} />
                  <ProductChip product={r.product} />
                </div>
                <p className="mt-3 font-medium">{r.subject}</p>
                <p className="mt-1 line-clamp-3 text-sm text-ink-2">&ldquo;{r.message}&rdquo;</p>
                <p className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{orgOf(r.clientId)}</span>
                  {r.testimonialOk && <span className="shrink-0 rounded-full bg-green-600/12 px-2 py-0.5 text-green-800 dark:text-green-300">Testimonial OK</span>}
                </p>
              </Card>
            ))}
          </Grid>
        </>
      )}
    </div>
  )
}

function Summary({ label, value, extra }: { label: string; value: string; extra: string }) {
  return (
    <p className="mt-4 text-sm text-ink-2">
      {label}: <span className="display text-xl font-bold text-ink">{value}</span> {extra}
    </p>
  )
}

function Grid({ empty, children }: { empty: boolean; children: React.ReactNode }) {
  if (empty) return <Empty title="Nothing here yet" />
  return <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

function Card({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="card flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-ink-2">
      {children}
    </Link>
  )
}
