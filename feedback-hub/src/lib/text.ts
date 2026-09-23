import type { FeedbackType, Priority } from '../types'

const STOP_WORDS = new Set(
  'a an the is are was were be to of in on at for and or but not no it its this that my me i we our you your with from by as so do does did have has had can cant could will would should just very also bus app print'.split(
    ' ',
  ),
)

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

/** Jaccard overlap of meaningful words, 0..1 */
export function similarity(a: string, b: string): number {
  const A = new Set(tokenize(a))
  const B = new Set(tokenize(b))
  if (!A.size || !B.size) return 0
  let shared = 0
  for (const w of A) if (B.has(w)) shared++
  return shared / (A.size + B.size - shared)
}

// Money and "can't use the service at all" beat everything else.
const URGENT = ['money deducted', 'amount deducted', 'charged twice', 'double charged', 'refund', 'not refunded', 'stuck', 'safety', 'unsafe', 'accident']
const HIGH = ['not working', 'crash', 'crashes', 'wrong location', 'not showing', 'failed', 'error', 'cannot login', "can't login", 'blank', 'jam', 'expired']

export function suggestPriority(type: FeedbackType, text: string): Priority {
  const t = text.toLowerCase()
  if (URGENT.some((k) => t.includes(k))) return 'urgent'
  if (HIGH.some((k) => t.includes(k))) return 'high'
  if (type === 'problem') return 'medium'
  return 'low'
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Hours an open item has been waiting */
export function waitingHours(iso: string, now = Date.now()): number {
  return (now - new Date(iso).getTime()) / 36e5
}
