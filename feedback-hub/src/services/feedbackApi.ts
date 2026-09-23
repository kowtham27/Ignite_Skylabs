/**
 * The only module that knows where feedback lives.
 *
 * Right now it's backed by localStorage so the frontend works on its own.
 * When the backend is ready, replace the bodies of these functions with
 * fetch() calls to your API — every page goes through here, so nothing else changes.
 */
import { STATUS_META } from '../config/products'
import { similarity, suggestPriority } from '../lib/text'
import type { Activity, Feedback, FeedbackFilters, NewFeedback, Priority, ProductId, Status } from '../types'
import { buildSeed, makeRefId } from './seed'

const KEY = 'feedback-hub:v2'
const LATENCY = 250

const wait = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(value), LATENCY))
const uid = () => Math.random().toString(36).slice(2, 10)

function load(): Feedback[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Feedback[]
  } catch {
    /* fall through to seed */
  }
  const seed = buildSeed()
  save(seed)
  return seed
}

function save(items: Feedback[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* storage full or blocked — the session still works in memory */
  }
  listeners.forEach((fn) => fn())
}

const listeners = new Set<() => void>()
/** Re-render hooks when data changes (in this tab or another one) */
export function subscribe(fn: () => void) {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => e.key === KEY && fn()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

function matches(f: Feedback, q: FeedbackFilters) {
  if (q.product && q.product !== 'all' && f.product !== q.product) return false
  if (q.type && q.type !== 'all' && f.type !== q.type) return false
  if (q.status && q.status !== 'all' && f.status !== q.status) return false
  if (q.priority && q.priority !== 'all' && f.priority !== q.priority) return false
  if (q.search) {
    const s = q.search.toLowerCase()
    const hay = `${f.refId} ${f.subject} ${f.message} ${f.name} ${f.contact} ${f.category} ${f.location ?? ''} ${f.reference ?? ''}`.toLowerCase()
    if (!hay.includes(s)) return false
  }
  return true
}

export const feedbackApi = {
  async list(filters: FeedbackFilters = {}): Promise<Feedback[]> {
    const items = load()
      .filter((f) => matches(f, filters))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return wait(items)
  },

  async get(id: string): Promise<Feedback | undefined> {
    return wait(load().find((f) => f.id === id))
  },

  /** Public lookup: users only need their reference ID and the contact they used */
  async track(refId: string, contact: string): Promise<Feedback | undefined> {
    const r = refId.trim().toUpperCase()
    const c = contact.trim().toLowerCase()
    // Anonymous feedback has no contact, so the reference ID alone is enough
    return wait(load().find((f) => f.refId === r && (f.contact === '' || f.contact.toLowerCase() === c)))
  },

  async create(input: NewFeedback): Promise<Feedback> {
    const items = load()
    const now = new Date().toISOString()
    const fb: Feedback = {
      ...input,
      id: uid(),
      refId: makeRefId(input.product),
      status: 'new',
      priority: suggestPriority(input.type, `${input.subject} ${input.message}`),
      votes: 0,
      createdAt: now,
      updatedAt: now,
      activity: [{ id: uid(), kind: 'created', author: input.name, text: 'Submitted feedback', at: now }],
    }
    save([fb, ...items])
    return wait(fb)
  },

  /** Open reports that look like what the user is typing, so they can "+1" instead of duplicating */
  async findSimilar(product: ProductId, text: string, limit = 3): Promise<Feedback[]> {
    if (text.trim().length < 8) return []
    const hits = load()
      .filter((f) => f.product === product && f.status !== 'resolved' && (f.type === 'problem' || f.type === 'suggestion'))
      .map((f) => ({ f, score: Math.max(similarity(text, f.subject), similarity(text, `${f.subject} ${f.message}`)) }))
      .filter((x) => x.score >= 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.f)
    return wait(hits)
  },

  async vote(id: string): Promise<Feedback | undefined> {
    return mutate(id, (f) => ({ ...f, votes: f.votes + 1 }))
  },

  /** Save status, priority and an optional internal note in one go (the detail page's "Update" button) */
  async update(id: string, changes: { status: Status; priority: Priority; note?: string }, author = 'You') {
    return mutate(id, (f) => {
      const log: Activity[] = []
      if (changes.status !== f.status) log.push(act('status', author, `Marked as ${STATUS_META[changes.status].label.toLowerCase()}`))
      if (changes.priority !== f.priority) log.push(act('status', author, `Priority set to ${changes.priority}`))
      if (changes.note?.trim()) log.push(act('note', author, changes.note.trim()))
      return { ...f, status: changes.status, priority: changes.priority, activity: [...f.activity, ...log] }
    })
  },

  async setStatus(id: string, status: Status, author = 'You') {
    return mutate(id, (f) => ({
      ...f,
      status,
      activity: [...f.activity, act('status', author, `Marked as ${STATUS_META[status].label.toLowerCase()}`)],
    }))
  },

  async setPriority(id: string, priority: Priority, author = 'You') {
    return mutate(id, (f) => ({
      ...f,
      priority,
      activity: [...f.activity, act('status', author, `Priority set to ${priority}`)],
    }))
  },

  async addNote(id: string, text: string, author = 'You') {
    return mutate(id, (f) => ({ ...f, activity: [...f.activity, act('note', author, text)] }))
  },

  /** A reply is visible to the user on the tracking page; a note is internal */
  async reply(id: string, text: string, author = 'Team') {
    return mutate(id, (f) => ({
      ...f,
      status: f.status === 'new' ? 'reviewing' : f.status,
      activity: [...f.activity, act('reply', author, text)],
    }))
  },

  /** Wipe local data and go back to the sample set */
  async reset() {
    save(buildSeed())
    return wait(true)
  },
}

function act(kind: Activity['kind'], author: string, text: string): Activity {
  return { id: uid(), kind, author, text, at: new Date().toISOString() }
}

async function mutate(id: string, fn: (f: Feedback) => Feedback) {
  const items = load()
  const i = items.findIndex((f) => f.id === id)
  if (i < 0) return wait(undefined)
  items[i] = { ...fn(items[i]), updatedAt: new Date().toISOString() }
  save(items)
  return wait(items[i])
}
