import { Lock, Send, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KIND_META, statusLabel } from '../config/clients'
import { STATUS_META } from '../config/products'
import { formatDate } from '../lib/text'
import type { ClientRequest, RequestKind, Status } from '../types'
import { PriorityLabel, ProductChip } from './bits'
import { Waiting } from './FeedbackRow'

export function KindTag({ kind }: { kind: RequestKind }) {
  const Icon = KIND_META[kind].icon
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-2">
      <Icon size={13} aria-hidden /> {KIND_META[kind].label}
    </span>
  )
}

export function RequestStatus({ kind, status }: { kind: RequestKind; status: Status }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${m.className}`}>
      <span className={`size-1.5 rounded-full ${m.dot}`} aria-hidden />
      {statusLabel(kind, status, m.label)}
    </span>
  )
}

export function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-line'} aria-hidden />
      ))}
    </span>
  )
}

/** One row in a list of client requests. `to` decides whether it opens the client or admin view. */
export function RequestRow({ r, to, org }: { r: ClientRequest; to: string; org?: string }) {
  // Wrap the request so the shared Waiting component can read its createdAt/status
  const waitingFb = { createdAt: r.createdAt, status: r.status } as Parameters<typeof Waiting>[0]['fb']
  return (
    <Link to={to} className="flex gap-3 px-4 py-3 transition hover:bg-surface-2 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <ProductChip product={r.product} />
          <KindTag kind={r.kind} />
          <span className="font-mono text-xs text-muted">{r.refId}</span>
          {r.channel === 'whatsapp' && <WhatsAppBadge />}
        </div>
        <p className={`mt-1 truncate ${r.status === 'new' ? 'font-semibold' : 'font-medium'}`}>{r.subject}</p>
        <p className="mt-0.5 flex items-center gap-3 text-xs text-muted">
          {org && <span className="truncate">{org}</span>}
          {r.rating && <Stars n={r.rating} size={12} />}
          {r.order && (
            <span>
              {r.order.item} × {r.order.quantity}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <RequestStatus kind={r.kind} status={r.status} />
        <PriorityLabel priority={r.priority} />
        <Waiting fb={waitingFb} />
      </div>
    </Link>
  )
}

/** Conversation + composer. Admin sees internal notes; clients never do. */
export function RequestThread({
  r,
  viewer,
  onSend,
  canned,
}: {
  r: ClientRequest
  viewer: 'client' | 'admin'
  onSend: (text: string) => Promise<unknown>
  canned?: Record<string, string>
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const items = r.activity.filter((a) => viewer === 'admin' || a.kind !== 'note')
  const send = async () => {
    if (!text.trim()) return
    setBusy(true)
    await onSend(text.trim())
    setText('')
    setBusy(false)
  }
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-bold">Conversation</h2>
      <ul className="mt-4 space-y-4">
        {items.map((a) => {
          const fromTeam = a.kind === 'reply'
          const bubble = a.kind === 'reply' || a.kind === 'message' || a.kind === 'note'
          return (
            <li key={a.id} className={`flex ${bubble && (viewer === 'client' ? !fromTeam : fromTeam || a.kind === 'note') ? 'justify-end' : ''}`}>
              <div className={bubble ? 'max-w-[85%]' : ''}>
                <p className="text-xs text-muted">
                  <span className="font-medium text-ink-2">{fromTeam ? 'Ridemap & PrintA4 team' : a.author}</span> · {formatDate(a.at)}
                  {a.kind === 'note' && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <Lock size={10} /> internal
                    </span>
                  )}
                </p>
                {bubble ? (
                  <p className={`mt-1 rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-line ${a.kind === 'note' ? 'bg-marker/25' : fromTeam ? 'bg-ink text-bg' : 'bg-surface-2'}`}>{a.text}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-ink-2">{a.text}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-6 border-t border-line pt-5">
        {canned && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {Object.keys(canned).map((k) => (
              <button key={k} onClick={() => setText(canned[k])} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2 hover:border-ink-2 hover:text-ink">
                {k}
              </button>
            ))}
          </div>
        )}
        <textarea
          aria-label={viewer === 'client' ? 'Add a follow-up' : 'Reply to client'}
          className="input min-h-20"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={viewer === 'client' ? 'Add more details or ask for an update…' : 'Reply to the client (they will see this)…'}
        />
        <div className="mt-2 flex justify-end">
          <button onClick={send} className="btn-primary" disabled={!text.trim() || busy}>
            <Send size={15} /> {viewer === 'client' ? 'Send' : 'Send reply'}
          </button>
        </div>
      </div>
    </section>
  )
}

export function WhatsAppBadge() {
  return <span className="rounded bg-green-600/12 px-1.5 py-px text-[10px] font-semibold text-green-800 uppercase dark:text-green-300">via WhatsApp</span>
}
