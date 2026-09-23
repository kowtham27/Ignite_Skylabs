/**
 * Turns a WhatsApp chat (exported .txt or copied messages) into draft client requests.
 * Everything runs locally with keyword rules — no chat text leaves the browser.
 */
import { ORDER_ITEMS } from '../config/clients'
import type { Client, Priority, ProductId, RequestKind } from '../types'
import { suggestPriority } from './text'

export interface ChatMessage {
  at: Date
  sender: string
  text: string
}

export interface NoteDraft {
  key: string
  include: boolean
  kind: RequestKind
  product: ProductId
  subject: string
  message: string
  priority: Priority
  at: Date
  order?: { item: string; quantity: number }
  /** How many chat messages were merged into this note */
  count: number
}

// Android:  22/09/26, 10:42 am - Name: text
// iPhone:   [22/09/26, 10:42:15 AM] Name: text
// Web copy: [10:42 am, 22/09/2026] Name: text
const ANDROID = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s?m\.?)?\s+[-–]\s+([^:]+?):\s?(.*)$/i
const IOS = /^‎?\[(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?\s?m\.?)?\]\s+([^:]+?):\s?(.*)$/i
const WEB = /^\[(\d{1,2}):(\d{2})\s*([ap]\.?\s?m\.?)?,\s*(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\]\s+([^:]+?):\s?(.*)$/i

// Lines that carry no content
const NOISE = /(<media omitted>|image omitted|video omitted|audio omitted|sticker omitted|document omitted|this message was deleted|you deleted this message|messages and calls are end-to-end encrypted|missed voice call|missed video call|<attached:)/i

function toDate(d: string, m: string, y: string, h: string, min: string, ampm?: string) {
  let hour = Number(h)
  const pm = ampm && /p/i.test(ampm)
  const am = ampm && /a/i.test(ampm)
  if (pm && hour < 12) hour += 12
  if (am && hour === 12) hour = 0
  const year = y.length === 2 ? 2000 + Number(y) : Number(y)
  // WhatsApp in India uses day/month order
  return new Date(year, Number(m) - 1, Number(d), hour, Number(min))
}

export function parseChat(raw: string): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const line of raw.replace(/\r/g, '').split('\n')) {
    const clean = line.replace(/[‎‏‪-‮]/g, '')
    let m = clean.match(ANDROID) ?? clean.match(IOS)
    let msg: ChatMessage | null = null
    if (m) msg = { at: toDate(m[1], m[2], m[3], m[4], m[5], m[6]), sender: m[7].trim(), text: m[8] }
    else if ((m = clean.match(WEB))) msg = { at: toDate(m[4], m[5], m[6], m[1], m[2], m[3]), sender: m[7].trim(), text: m[8] }

    if (msg) {
      if (!NOISE.test(msg.text) && msg.text.trim()) out.push(msg)
    } else if (out.length && clean.trim() && !NOISE.test(clean)) {
      // A line without a timestamp continues the previous message
      out[out.length - 1].text += '\n' + clean
    }
  }
  return out
}

const digits = (s: string) => s.replace(/\D/g, '').slice(-10)

/** Best guess at which client a chat belongs to, by phone number or name */
export function matchClient(senders: string[], clients: Client[]): { client: Client; sender: string } | null {
  for (const s of senders) {
    const d = digits(s)
    const byPhone = d.length === 10 && clients.find((c) => digits(c.phone) === d)
    if (byPhone) return { client: byPhone, sender: s }
    const low = s.toLowerCase()
    const byName = clients.find((c) => {
      const name = c.contactName.toLowerCase().replace(/^(dr|mr|mrs|ms)\.?\s+/, '')
      return low.includes(name) || name.includes(low) || low.includes(c.org.toLowerCase())
    })
    if (byName) return { client: byName, sender: s }
  }
  return null
}

const KIND_RULES: [RequestKind, RegExp][] = [
  ['order', /\b(order|need \d+|send \d+|\d+\s*(reams?|units?|trackers?|kiosks?|buses|licen[cs]es)|install(ation)?|quotation|quote|refill|supply|want (one|another|more)|add (one|more|another))\b/i],
  ['complaint', /\b(invoice|bill(ing|ed)?|overcharged|charged (more|extra)|no (one|body) (responded|replied|called)|not responded|no response|delay(ed)?|poor service|unhappy|disappointed|worst|escalate|3 days|waiting since)\b/i],
  ['issue', /\b(not working|doesn'?t work|isn'?t working|stopped|stuck|offline|down|error|fail(ed|ing|s)?|crash(es|ed)?|blank|jam(med)?|not showing|wrong|broken|issue|problem|logs? out|not (printing|updating|loading|connecting)|deducted)\b/i],
  ['suggestion', /\b(suggest(ion)?|would be (great|nice|good)|can you (add|make|build)|please add|feature|it would help|idea|option (to|for))\b/i],
]

const PRODUCT_RULES: [ProductId, RegExp][] = [
  ['ridemap', /\b(bus(es)?|gps|tracker|tracking|route|driver|stop|eta|pass|parent|fleet|ridemap|map)\b/i],
  ['printa4', /\b(kiosk|print(s|ing|er)?|paper|reams?|toner|ink|qr|colou?r|binding|xerox|page|printa4|refund|upi|phonepe|gpay)\b/i],
]

function classify(text: string, fallbackProduct: ProductId): Pick<NoteDraft, 'kind' | 'product' | 'order'> {
  const kind = KIND_RULES.find(([, re]) => re.test(text))?.[0] ?? 'opinion'
  const scores = PRODUCT_RULES.map(([p, re]) => [p, (text.match(new RegExp(re, 'gi')) ?? []).length] as const)
  const best = scores.sort((a, b) => b[1] - a[1])[0]
  const product = best[1] > 0 ? best[0] : fallbackProduct

  let order: NoteDraft['order']
  if (kind === 'order') {
    const qty = Number(text.match(/\b(\d{1,4})\b\s*(reams?|units?|trackers?|kiosks?|buses|licen[cs]es|nos?|pcs)?/i)?.[1] ?? 1)
    // Pick the catalogue item sharing the most words with the message
    const words = new Set(text.toLowerCase().split(/\W+/))
    const item =
      ORDER_ITEMS[product]
        .map((i) => ({ i, score: i.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && [...words].some((x) => x.startsWith(w.slice(0, 5)))).length }))
        .sort((a, b) => b.score - a.score)[0]?.i ?? ORDER_ITEMS[product][0]
    order = { item, quantity: Math.max(1, qty) }
  }
  return { kind, product, order }
}

function titleFrom(text: string) {
  const first = text
    .replace(/\s+/g, ' ')
    .replace(/^(hi|hello|hey|good (morning|afternoon|evening)|sir|madam|mam|team)[,!.\s]+/gi, '')
    .split(/(?<=[.!?])\s/)[0]
    .trim()
  const t = first.length > 70 ? first.slice(0, 67).replace(/\s+\S*$/, '') + '…' : first
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const GAP_MS = 45 * 60 * 1000

// Messages that are only a greeting or acknowledgement ("Good morning sir", "ok thanks 👍")
const FILLER =
  /^(hi+|hello|hey|good\s*(morning|afternoon|evening|night)|gm|ok+(ay)?|k|thanks?( you)?|thank u|tq|ty|noted|sure|fine|done|yes|no|sir|madam|mam|bro|👍|🙏|😊|\s|[,.!?])+$/iu

/**
 * Group the client's messages into notes. A new note starts after a 45-minute gap
 * or when the topic (kind) changes between consecutive messages.
 */
export function buildDrafts(messages: ChatMessage[], clientSender: string, client: Client | null): NoteDraft[] {
  const fallback: ProductId = client?.products[0] ?? 'ridemap'
  const fromClient = messages.filter((m) => m.sender === clientSender && !FILLER.test(m.text.trim()))
  const groups: ChatMessage[][] = []
  for (const m of fromClient) {
    const last = groups[groups.length - 1]
    const prev = last?.[last.length - 1]
    const sameTopic = prev && (classify(m.text, fallback).kind === classify(prev.text, fallback).kind || classify(m.text, fallback).kind === 'opinion')
    if (prev && +m.at - +prev.at < GAP_MS && sameTopic) last.push(m)
    else groups.push([m])
  }

  return groups.map((g, i) => {
    const text = g.map((m) => m.text).join('\n')
    const c = classify(text, fallback)
    // A client that only has one product can't be talking about the other
    const product = client && client.products.length === 1 ? client.products[0] : c.product
    const isProblem = c.kind === 'issue' || c.kind === 'complaint'
    const p = suggestPriority('problem', text)
    return {
      key: `${i}-${+g[0].at}`,
      // Short "ok thanks" style messages are probably not worth a note
      include: c.kind !== 'opinion' || text.length > 60,
      kind: c.kind,
      product,
      subject: titleFrom(g[0].text),
      message: g.map((m) => `[${m.at.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}] ${m.text}`).join('\n'),
      priority: isProblem ? (p === 'urgent' ? 'urgent' : 'high') : c.kind === 'order' ? 'medium' : 'low',
      at: g[0].at,
      order: product === c.product ? c.order : c.kind === 'order' ? { item: ORDER_ITEMS[product][0], quantity: c.order?.quantity ?? 1 } : undefined,
      count: g.length,
    }
  })
}

export const SAMPLE_CHAT = `22/09/26, 9:14 am - Anbu Selvan: Good morning sir
22/09/26, 9:15 am - Anbu Selvan: Kiosk 2 is not printing since morning. Screen shows paper jam but there is no paper stuck inside
22/09/26, 9:15 am - Anbu Selvan: Customers are waiting, please check urgently
22/09/26, 9:40 am - PrintA4 Support: Sorry Anbu, sending an engineer today
22/09/26, 9:41 am - Anbu Selvan: <Media omitted>
22/09/26, 11:02 am - Anbu Selvan: Also one customer paid 36 rs by PhonePe, money deducted but print did not come. Need refund for him
22/09/26, 1:30 pm - Anbu Selvan: Sir we need 25 reams paper before Friday, exam season starting
22/09/26, 1:31 pm - PrintA4 Support: Noted 👍
22/09/26, 6:05 pm - Anbu Selvan: Last month invoice is 1800 more than what we agreed. Please check and send corrected bill
22/09/26, 6:20 pm - Anbu Selvan: One suggestion, it would be great if we can see daily earnings in the app itself
22/09/26, 6:21 pm - Anbu Selvan: Ok thanks`
