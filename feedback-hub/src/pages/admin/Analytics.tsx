import { useMemo, useState, type ReactNode } from 'react'
import { Segmented } from '../../components/bits'
import { BarList, SplitBar, TrendChart } from '../../components/charts'
import { PRODUCT_LIST, PRODUCTS, STATUS_META, STATUS_ORDER, TYPE_META, TYPE_ORDER } from '../../config/products'
import { usePrefs } from '../../lib/prefs'
import { byCategory, dailyTrend } from '../../lib/stats'
import { useFeedbackList } from '../../lib/useFeedback'

type Range = '7' | '30' | '90'

// Diverging: blue (good) <-> red (bad) with a neutral gray middle
const SENTIMENT = { positive: '#2a78d6', neutral: '#b9b7ae', negative: '#e34948' }

export default function Analytics() {
  const { scope } = usePrefs()
  const [range, setRange] = useState<Range>('30')
  const { items: all } = useFeedbackList({ product: scope })

  const items = useMemo(() => {
    const from = Date.now() - Number(range) * 864e5
    return all.filter((f) => +new Date(f.createdAt) >= from)
  }, [all, range])

  const byProduct = PRODUCT_LIST.map((p) => {
    const mine = items.filter((f) => f.product === p.id)
    return { label: p.name, value: mine.length, hint: `${mine.filter((f) => f.type === 'problem').length} problems` }
  })
  const topProblems = byCategory(items.filter((f) => f.type === 'problem')).slice(0, 6)
  // Suggestions ranked by how many people want them, not just how many times they were filed
  const topRequests = items
    .filter((f) => f.type === 'suggestion')
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 6)
    .map((f) => ({ label: f.subject, value: f.votes + 1, hint: scope === 'all' ? PRODUCTS[f.product].name : undefined }))
  const rated = items.filter((f) => f.rating)
  const trend = dailyTrend(items, Number(range))

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-ink-2">
            {scope === 'all' ? 'Both products' : PRODUCTS[scope].name}, last {range} days · {items.length} pieces of feedback
          </p>
        </div>
        <Segmented<Range>
          label="Date range"
          value={range}
          onChange={setRange}
          options={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
          ]}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Total" value={items.length} />
        {TYPE_ORDER.map((t) => (
          <Tile key={t} label={TYPE_META[t].label} value={items.filter((f) => f.type === t).length} swatch={TYPE_META[t].color} />
        ))}
      </div>

      <Card title="Feedback volume" hint="per day, by type" className="mt-6">
        <TrendChart data={trend} height={220} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {scope === 'all' && (
          <Card title="Feedback by product">
            <BarList rows={byProduct} />
          </Card>
        )}
        <Card title="How people feel" hint={`from ${rated.length} ratings`}>
          <SplitBar
            parts={[
              { label: 'Positive', value: rated.filter((f) => (f.rating ?? 0) >= 4).length, color: SENTIMENT.positive },
              { label: 'Neutral', value: rated.filter((f) => f.rating === 3).length, color: SENTIMENT.neutral },
              { label: 'Negative', value: rated.filter((f) => (f.rating ?? 0) <= 2).length, color: SENTIMENT.negative },
            ]}
          />
        </Card>
        <Card title="Where things break" hint="problem reports by area">
          <BarList rows={topProblems.map((c) => ({ label: c.category, value: c.count }))} empty="No problems reported. Enjoy it." />
        </Card>
        <Card title="Most wanted" hint="suggestions by number of people asking">
          <BarList rows={topRequests} suffix="people" empty="No suggestions yet." />
        </Card>
        <Card title="Open vs resolved">
          <SplitBar
            parts={STATUS_ORDER.map((s, i) => ({
              label: STATUS_META[s].label,
              value: items.filter((f) => f.status === s).length,
              // one-hue ordinal ramp: the further along, the darker
              color: ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab'][i],
            }))}
          />
        </Card>
      </div>
    </div>
  )
}

function Tile({ label, value, swatch }: { label: string; value: number; swatch?: string }) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-xs text-ink-2">
        {swatch && <span className="size-2 rounded-sm" style={{ background: swatch }} />}
        {label}
      </p>
      <p className="display mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

function Card({ title, hint, className = '', children }: { title: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold">{title}</h2>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  )
}
