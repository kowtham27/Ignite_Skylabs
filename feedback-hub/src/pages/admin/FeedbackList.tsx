import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Empty } from '../../components/bits'
import { FeedbackRow } from '../../components/FeedbackRow'
import { PRIORITY_META, PRIORITY_ORDER, STATUS_META, STATUS_ORDER, TYPE_META, TYPE_ORDER } from '../../config/products'
import { usePrefs } from '../../lib/prefs'
import { useFeedbackList } from '../../lib/useFeedback'
import type { FeedbackType, Priority, Status } from '../../types'

type Sort = 'newest' | 'oldest' | 'votes' | 'priority'
const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

const TITLES: Record<FeedbackType | 'all', { title: string; blurb: string }> = {
  all: { title: 'All feedback', blurb: 'Everything your users have told you.' },
  problem: { title: 'Problems', blurb: 'Things that broke or got in the way.' },
  suggestion: { title: 'Suggestions', blurb: 'Ideas from users. Sorted by votes, they make a pretty good roadmap.' },
  query: { title: 'Questions', blurb: 'Users asking for help. Quick replies here go a long way.' },
  praise: { title: 'Praise', blurb: 'The good stuff.' },
  general: { title: 'General', blurb: 'Everything else.' },
}

export default function FeedbackList({ type: fixedType }: { type?: FeedbackType }) {
  const { scope } = usePrefs()
  const [params, setParams] = useSearchParams()
  const nav = useNavigate()

  const search = params.get('q') ?? ''
  const status = (params.get('status') ?? 'open') as Status | 'all' | 'open'
  const priority = (params.get('priority') ?? 'all') as Priority | 'all'
  const type = fixedType ?? ((params.get('type') ?? 'all') as FeedbackType | 'all')
  const sort = (params.get('sort') ?? (fixedType === 'suggestion' ? 'votes' : 'newest')) as Sort

  const set = (k: string, v: string, fallback: string) => {
    const n = new URLSearchParams(params)
    if (v === fallback) n.delete(k)
    else n.set(k, v)
    setParams(n, { replace: true })
  }

  const { items, loading } = useFeedbackList({
    product: scope,
    type,
    priority,
    status: status === 'open' ? 'all' : status,
    search,
  })

  const rows = useMemo(() => {
    const list = status === 'open' ? items.filter((f) => f.status !== 'resolved') : [...items]
    if (sort === 'oldest') list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    if (sort === 'votes') list.sort((a, b) => b.votes - a.votes)
    if (sort === 'priority') list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt))
    return list
  }, [items, status, sort])

  // j/k to move, Enter to open. Feels good when you're triaging 40 of these.
  const [rawCursor, setCursor] = useState(0)
  const cursor = Math.min(rawCursor, Math.max(0, rows.length - 1))
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return
      if (e.key === 'j') setCursor((c) => Math.min(rows.length - 1, c + 1))
      if (e.key === 'k') setCursor((c) => Math.max(0, c - 1))
      if (e.key === 'Enter' && rows[cursor]) nav(`/admin/feedback/${rows[cursor].id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, cursor, nav])
  useEffect(() => {
    document.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const meta = TITLES[fixedType ?? 'all']
  const filtered = search || priority !== 'all' || (!fixedType && type !== 'all') || status !== 'open'

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{meta.title}</h1>
          <p className="mt-1 text-sm text-ink-2">{meta.blurb}</p>
        </div>
        <p className="hidden text-xs text-muted sm:block">
          <kbd>j</kbd> <kbd>k</kbd> to move · <kbd>Enter</kbd> to open · <kbd>/</kbd> to search
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input className="input py-1.5 pl-8" placeholder="Filter…" value={search} onChange={(e) => set('q', e.target.value, '')} aria-label="Filter feedback" />
        </div>
        {!fixedType && (
          <Select label="Type" value={type} onChange={(v) => set('type', v, 'all')} options={[['all', 'All types'], ...TYPE_ORDER.map((t) => [t, TYPE_META[t].label] as [string, string])]} />
        )}
        <Select
          label="Status"
          value={status}
          onChange={(v) => set('status', v, 'open')}
          options={[['open', 'Open'], ['all', 'Any status'], ...STATUS_ORDER.map((s) => [s, STATUS_META[s].label] as [string, string])]}
        />
        <Select label="Priority" value={priority} onChange={(v) => set('priority', v, 'all')} options={[['all', 'Any priority'], ...PRIORITY_ORDER.map((p) => [p, PRIORITY_META[p].label] as [string, string])]} />
        <Select
          label="Sort"
          value={sort}
          onChange={(v) => set('sort', v, fixedType === 'suggestion' ? 'votes' : 'newest')}
          options={[
            ['newest', 'Newest first'],
            ['oldest', 'Oldest first'],
            ['priority', 'Most urgent'],
            ['votes', 'Most +1s'],
          ]}
        />
        {filtered && (
          <button onClick={() => setParams({}, { replace: true })} className="inline-flex items-center gap-1 px-2 text-xs text-ink-2 hover:text-ink">
            <X size={13} /> Clear
          </button>
        )}
        <span className="tabular ml-auto text-xs text-muted">{rows.length} shown</span>
      </div>

      <div className="card mt-4 overflow-hidden">
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-20 animate-pulse bg-surface-2/60" />
            ))}
          </div>
        ) : rows.length ? (
          <div className="divide-y divide-line">
            {rows.map((f, i) => (
              <FeedbackRow key={f.id} fb={f} active={i === cursor} />
            ))}
          </div>
        ) : (
          <Empty title={filtered ? 'Nothing matches' : 'All clear'}>{filtered ? 'Try loosening the filters.' : 'No open items here. Nice work.'}</Empty>
        )}
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="input w-auto cursor-pointer py-1.5 pr-8">
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  )
}
