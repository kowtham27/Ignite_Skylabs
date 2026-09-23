import { ArrowRight, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Empty, ProductChip } from '../../components/bits'
import { TrendChart } from '../../components/charts'
import { FeedbackRow } from '../../components/FeedbackRow'
import { PRODUCTS, RATINGS } from '../../config/products'
import { usePrefs } from '../../lib/prefs'
import { dailyTrend, summarize, trending } from '../../lib/stats'
import { useFeedbackList } from '../../lib/useFeedback'
import type { Feedback } from '../../types'

const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 }

export default function Dashboard() {
  const { scope } = usePrefs()
  const { items, loading } = useFeedbackList({ product: scope })

  const s = useMemo(() => summarize(items), [items])
  const trend = useMemo(() => dailyTrend(items, 14), [items])
  const hot = useMemo(() => trending(items), [items])
  const needsYou = useMemo(
    () =>
      s.open
        .filter((f) => f.priority === 'urgent' || f.priority === 'high')
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt))
        .slice(0, 5),
    [s.open],
  )

  if (loading) return <Skeleton />
  if (!items.length) return <Empty title="No feedback yet">Share the public form link from Settings and it&rsquo;ll start showing up here.</Empty>

  const problems = items.filter((f) => f.type === 'problem').length
  const ideas = items.filter((f) => f.type === 'suggestion').length
  const weekDelta = s.newThisWeek - s.newLastWeek
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-ink-2">{greeting}.</p>
      <h1 className="mt-1 max-w-3xl text-2xl leading-snug font-bold sm:text-3xl">
        <Headline s={s} scopeName={scope === 'all' ? null : PRODUCTS[scope].name} />
      </h1>

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        <Stat label="Total feedback" value={items.length} sub={`${s.newThisWeek} this week${weekDelta ? ` · ${weekDelta > 0 ? '+' : ''}${weekDelta} vs last` : ''}`} />
        <Stat label="Problems" value={problems} sub={`${s.open.filter((f) => f.type === 'problem').length} still open`} />
        <Stat label="Suggestions" value={ideas} sub={`${items.filter((f) => f.type === 'suggestion').reduce((n, f) => n + f.votes, 0)} extra votes`} />
        <Stat
          label="Avg. experience"
          value={s.avgRating ? s.avgRating.toFixed(1) : '–'}
          sub={s.avgRating ? `${RATINGS[Math.round(s.avgRating) - 1].emoji} from ${s.ratedCount} ratings` : 'No ratings yet'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-bold">Feedback over time</h2>
            <span className="text-xs text-muted">last 14 days</span>
          </div>
          <TrendChart data={trend} />
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <TrendingUp size={16} className="text-pop" /> Heating up
          </h2>
          <p className="mb-4 text-xs text-muted">Topics with more reports (and +1s) this week than last</p>
          {hot.length ? (
            <ul className="space-y-3">
              {hot.map((t) => (
                <li key={t.key} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.category}</p>
                    <ProductChip product={t.product} />
                  </div>
                  <span className="tabular shrink-0 text-right text-sm">
                    {t.thisWeek}
                    <span className="block text-xs text-muted">was {t.lastWeek}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-sm text-muted">Nothing unusual this week. Calm seas.</p>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ListCard title="Needs you first" hint="Urgent & high priority, oldest first" items={needsYou} link="/admin/feedback?priority=urgent" emptyText="Nothing urgent. Go get a coffee." />
        <ListCard title="Recent feedback" hint="Latest from your users" items={items.slice(0, 5)} link="/admin/feedback" emptyText="Nothing yet." />
      </div>
    </div>
  )
}

/** A plain-language summary of what matters right now */
function Headline({ s, scopeName }: { s: ReturnType<typeof summarize>; scopeName: string | null }) {
  const where = scopeName ? ` on ${scopeName}` : ''
  if (!s.open.length) return <>Inbox zero{where}. Everyone who wrote in has been looked after.</>
  return (
    <>
      <span className="marker">
        {s.open.length} {s.open.length === 1 ? 'person is' : 'people are'} waiting
      </span>{' '}
      on a response{where}
      {s.urgent.length > 0 && (
        <>
          , and <span className="text-red-700 dark:text-red-400">{s.urgent.length} of them can&rsquo;t wait</span>
        </>
      )}
      .
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-xs text-ink-2">{label}</p>
      <p className="display mt-1 text-3xl font-bold">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>
    </div>
  )
}

function ListCard({ title, hint, items, link, emptyText }: { title: string; hint: string; items: Feedback[]; link: string; emptyText: string }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        <Link to={link} className="inline-flex items-center gap-1 text-xs text-ink-2 hover:text-ink">
          See all <ArrowRight size={12} />
        </Link>
      </div>
      {items.length ? (
        <div className="divide-y divide-line border-t border-line">
          {items.map((f) => (
            <FeedbackRow key={f.id} fb={f} compact />
          ))}
        </div>
      ) : (
        <p className="border-t border-line px-5 py-8 text-center text-sm text-muted">{emptyText}</p>
      )}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="h-8 w-2/3 rounded bg-surface-2" />
      <div className="h-24 rounded-xl bg-surface-2" />
      <div className="h-72 rounded-xl bg-surface-2" />
    </div>
  )
}
