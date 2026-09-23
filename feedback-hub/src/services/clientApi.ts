/**
 * Clients and their requests. Same idea as feedbackApi: localStorage for now,
 * swap the function bodies for fetch() calls when the backend exists.
 */
import { STATUS_META } from '../config/products'
import { suggestPriority } from '../lib/text'
import type { Activity, Client, ClientRequest, ClientStatus, NewClient, NewClientRequest, Priority, Status } from '../types'
import { buildClientSeed } from './clientSeed'

const KEY = 'heard:clients:v1'
const LATENCY = 200

interface Store {
  clients: Client[]
  requests: ClientRequest[]
}

const wait = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(value), LATENCY))
const uid = () => Math.random().toString(36).slice(2, 10)

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    /* fall through to seed */
  }
  const seed = buildClientSeed()
  save(seed)
  return seed
}

function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn())
}

const listeners = new Set<() => void>()
export function subscribeClients(fn: () => void) {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => e.key === KEY && fn()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener('storage', onStorage)
  }
}

/** Next sequential ID for this year: CL-26-0011, CL-26-0012, … */
function nextClientId(clients: Client[]) {
  const yy = String(new Date().getFullYear()).slice(-2)
  const prefix = `CL-${yy}-`
  const max = clients.filter((c) => c.clientId.startsWith(prefix)).reduce((m, c) => Math.max(m, Number(c.clientId.slice(prefix.length)) || 0), 0)
  return prefix + String(max + 1).padStart(4, '0')
}

function refId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'CR-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function act(kind: Activity['kind'], author: string, text: string): Activity {
  return { id: uid(), kind, author, text, at: new Date().toISOString() }
}

function mutateRequest(id: string, fn: (r: ClientRequest) => ClientRequest) {
  const s = load()
  const i = s.requests.findIndex((r) => r.id === id)
  if (i < 0) return wait(undefined)
  s.requests[i] = { ...fn(s.requests[i]), updatedAt: new Date().toISOString() }
  save(s)
  return wait(s.requests[i])
}

export const clientApi = {
  /* ----- clients ----- */
  async listClients(): Promise<Client[]> {
    return wait([...load().clients].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt)))
  },

  async getClient(clientId: string): Promise<Client | undefined> {
    return wait(load().clients.find((c) => c.clientId === clientId))
  },

  /** Mock login: Client ID + the email on record */
  async login(clientId: string, email: string): Promise<Client | undefined> {
    const id = clientId.trim().toUpperCase()
    const e = email.trim().toLowerCase()
    return wait(load().clients.find((c) => c.clientId === id && c.email.toLowerCase() === e))
  },

  /** Used by both the admin "Add client" dialog and the public sign-up page */
  async createClient(input: NewClient): Promise<Client> {
    const s = load()
    const client: Client = { ...input, id: uid(), clientId: nextClientId(s.clients), status: input.status ?? 'onboarding', joinedAt: new Date().toISOString() }
    save({ ...s, clients: [client, ...s.clients] })
    return wait(client)
  },

  async setClientStatus(clientId: string, status: ClientStatus) {
    const s = load()
    s.clients = s.clients.map((c) => (c.clientId === clientId ? { ...c, status } : c))
    save(s)
    return wait(true)
  },

  /* ----- requests ----- */
  async listRequests(clientId?: string): Promise<ClientRequest[]> {
    const all = load().requests.filter((r) => !clientId || r.clientId === clientId)
    return wait(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  },

  async getRequest(id: string): Promise<ClientRequest | undefined> {
    return wait(load().requests.find((r) => r.id === id))
  },

  async createRequest(input: NewClientRequest, author: string): Promise<ClientRequest> {
    const s = load()
    const now = input.createdAt ?? new Date().toISOString()
    let priority: Priority = input.kind === 'order' ? 'medium' : 'low'
    if (input.kind === 'issue' || input.kind === 'complaint') {
      const p = suggestPriority('problem', `${input.subject} ${input.message}`)
      priority = p === 'urgent' ? 'urgent' : 'high'
    }
    const r: ClientRequest = {
      ...input,
      id: uid(),
      refId: refId(),
      status: 'new',
      priority: input.priority ?? priority,
      channel: input.channel ?? 'panel',
      createdAt: now,
      updatedAt: now,
      activity: [{ ...act('created', author, input.channel === 'whatsapp' ? 'Sent on WhatsApp' : 'Submitted request'), at: now }],
    }
    save({ ...s, requests: [r, ...s.requests] })
    return wait(r)
  },

  /** Save several at once (WhatsApp import) with a single write */
  async createMany(inputs: { input: NewClientRequest; author: string; note?: string }[]): Promise<ClientRequest[]> {
    const made: ClientRequest[] = []
    for (const { input, author, note } of inputs) {
      const r = await clientApi.createRequest(input, author)
      if (note) await clientApi.updateRequest(r.id, { status: r.status, priority: r.priority, note }, 'You')
      made.push(r)
    }
    return made
  },

  /** Admin: status + priority + internal note in one go */
  async updateRequest(id: string, changes: { status: Status; priority: Priority; note?: string }, author = 'You') {
    return mutateRequest(id, (r) => {
      const log: Activity[] = []
      if (changes.status !== r.status) log.push(act('status', author, `Marked as ${STATUS_META[changes.status].label.toLowerCase()}`))
      if (changes.priority !== r.priority) log.push(act('status', author, `Priority set to ${changes.priority}`))
      if (changes.note?.trim()) log.push(act('note', author, changes.note.trim()))
      return { ...r, status: changes.status, priority: changes.priority, activity: [...r.activity, ...log] }
    })
  },

  /** A message in the conversation. From the team it's a "reply"; from the client it re-opens a resolved request. */
  async message(id: string, text: string, from: 'team' | 'client', author: string) {
    return mutateRequest(id, (r) => ({
      ...r,
      status: from === 'team' ? (r.status === 'new' ? 'reviewing' : r.status) : r.status === 'resolved' ? 'reviewing' : r.status,
      activity: [...r.activity, act(from === 'team' ? 'reply' : 'message', author, text)],
    }))
  },

  async reset() {
    save(buildClientSeed())
    return wait(true)
  },
}
