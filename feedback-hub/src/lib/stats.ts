import { TYPE_ORDER } from '../config/products'
import type { Feedback, FeedbackType } from '../types'

const DAY = 864e5
export const isOpen = (f: Feedback) => f.status !== 'resolved'

function startOfDay(t: number) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function summarize(items: Feedback[], now = Date.now()) {
  const open = items.filter(isOpen)
  const urgent = open.filter((f) => f.priority === 'urgent')
  const rated = items.filter((f) => f.rating)
  const avgRating = rated.length ? rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length : null
  const weekAgo = now - 7 * DAY
  const newThisWeek = items.filter((f) => +new Date(f.createdAt) >= weekAgo).length
  const newLastWeek = items.filter((f) => {
    const t = +new Date(f.createdAt)
    return t >= weekAgo - 7 * DAY && t < weekAgo
  }).length
  const resolvedThisWeek = items.filter(
    (f) => f.status === 'resolved' && +new Date(f.updatedAt) >= weekAgo,
  ).length
  const oldestOpen = open.reduce<Feedback | null>((o, f) => (!o || f.createdAt < o.createdAt ? f : o), null)
  return { open, urgent, avgRating, ratedCount: rated.length, newThisWeek, newLastWeek, resolvedThisWeek, oldestOpen }
}

export type TrendRow = { day: string; label: string } & Record<FeedbackType, number>

/** One row per day for the last `days` days, counts split by feedback type */
export function dailyTrend(items: Feedback[], days = 14, now = Date.now()): TrendRow[] {
  const today = startOfDay(now)
  const rows: TrendRow[] = []
  for (let i = days - 1; i >= 0; i--) {
    const t = today - i * DAY
    const row = {
      day: new Date(t).toISOString().slice(0, 10),
      label: new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    } as TrendRow
    for (const k of TYPE_ORDER) row[k] = 0
    rows.push(row)
  }
  for (const f of items) {
    const idx = Math.round((startOfDay(+new Date(f.createdAt)) - (today - (days - 1) * DAY)) / DAY)
    if (idx >= 0 && idx < days) rows[idx][f.type]++
  }
  return rows
}

export function byCategory(items: Feedback[]) {
  const m = new Map<string, number>()
  for (const f of items) m.set(f.category, (m.get(f.category) ?? 0) + 1)
  return [...m.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count)
}

/**
 * Categories growing fastest: last 7 days vs the 7 before.
 * Weighted by "me too" votes so one loud issue with many +1s surfaces.
 */
export function trending(items: Feedback[], now = Date.now()) {
  const weekAgo = now - 7 * DAY
  const m = new Map<string, { key: string; product: Feedback['product']; category: string; thisWeek: number; lastWeek: number }>()
  for (const f of items) {
    const t = +new Date(f.createdAt)
    if (t < weekAgo - 7 * DAY) continue
    const key = `${f.product}:${f.category}`
    const row = m.get(key) ?? { key, product: f.product, category: f.category, thisWeek: 0, lastWeek: 0 }
    const weight = 1 + f.votes
    if (t >= weekAgo) row.thisWeek += weight
    else row.lastWeek += weight
    m.set(key, row)
  }
  return [...m.values()]
    .filter((r) => r.thisWeek > r.lastWeek && r.thisWeek >= 2)
    .sort((a, b) => b.thisWeek - b.lastWeek - (a.thisWeek - a.lastWeek))
    .slice(0, 4)
}
