import { Check, FileUp, Loader2, MessageCircle, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { ProductIcon } from '../../components/bits'
import { KIND_META, KIND_ORDER, ORDER_ITEMS } from '../../config/clients'
import { PRIORITY_META, PRIORITY_ORDER, PRODUCTS } from '../../config/products'
import { useClients } from '../../lib/useClients'
import { buildDrafts, matchClient, parseChat, SAMPLE_CHAT, type NoteDraft } from '../../lib/whatsapp'
import { clientApi } from '../../services/clientApi'
import type { ClientRequest, RequestKind } from '../../types'

export default function WhatsAppImport() {
  const { data: clients } = useClients()
  const [raw, setRaw] = useState('')
  const [clientId, setClientId] = useState('')
  const [sender, setSender] = useState('')
  const [drafts, setDrafts] = useState<NoteDraft[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<ClientRequest[] | null>(null)

  const messages = useMemo(() => parseChat(raw), [raw])
  const senders = useMemo(() => {
    const count = new Map<string, number>()
    messages.forEach((m) => count.set(m.sender, (count.get(m.sender) ?? 0) + 1))
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
  }, [messages])
  const client = clients.find((c) => c.clientId === clientId) ?? null

  // Guess the client + which sender is them as soon as a chat is pasted
  const onText = (text: string) => {
    setRaw(text)
    setDrafts(null)
    setCreated(null)
    const msgs = parseChat(text)
    const ss = [...new Set(msgs.map((m) => m.sender))]
    const hit = matchClient(ss, clients)
    setClientId(hit?.client.clientId ?? '')
    setSender(hit?.sender ?? ss.find((s) => !/support|team|admin|you/i.test(s)) ?? ss[0] ?? '')
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onText(await f.text())
    e.target.value = ''
  }

  const convert = () => setDrafts(buildDrafts(messages, sender, client))
  const patch = (key: string, p: Partial<NoteDraft>) => setDrafts((ds) => ds && ds.map((d) => (d.key === key ? { ...d, ...p } : d)))
  const chosen = drafts?.filter((d) => d.include) ?? []

  const save = async () => {
    if (!client || !chosen.length) return
    setSaving(true)
    const made = await clientApi.createMany(
      chosen.map((d) => ({
        author: sender,
        note: `Imported from WhatsApp (${d.count} message${d.count > 1 ? 's' : ''} from ${sender}).`,
        input: {
          clientId: client.clientId,
          product: d.product,
          kind: d.kind,
          subject: d.subject,
          message: d.message,
          priority: d.priority,
          order: d.kind === 'order' ? d.order ?? { item: ORDER_ITEMS[d.product][0], quantity: 1 } : undefined,
          channel: 'whatsapp',
          createdAt: d.at.toISOString(),
        },
      })),
    )
    setSaving(false)
    setCreated(made)
    setDrafts(null)
    setRaw('')
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <MessageCircle size={22} className="text-green-600" /> WhatsApp → Notes
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">
        Paste a client&rsquo;s WhatsApp messages (or upload the exported chat). We&rsquo;ll pull out each problem, order or idea as a tracked note. Nothing leaves your
        browser.
      </p>

      {created && (
        <div className="card mt-6 border-green-600/40 p-5">
          <p className="flex items-center gap-2 font-medium">
            <Check size={18} className="text-green-600" /> Created {created.length} {created.length === 1 ? 'note' : 'notes'} for {client?.org}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {created.map((r) => (
              <li key={r.id}>
                <Link to={`/admin/client-requests/${r.id}`} className="underline decoration-line underline-offset-2 hover:decoration-ink">
                  <span className="font-mono text-xs text-muted">{r.refId}</span> {r.subject}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 1: input */}
      <section className="card mt-6 p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="chat" className="label mb-0">
            1. Paste the chat
          </label>
          <div className="flex gap-2">
            <button onClick={() => onText(SAMPLE_CHAT)} className="btn-ghost px-3 py-1.5 text-xs">
              <Sparkles size={13} /> Try a sample
            </button>
            <label className="btn-ghost cursor-pointer px-3 py-1.5 text-xs">
              <FileUp size={13} /> Upload .txt
              <input type="file" accept=".txt,text/plain" onChange={onFile} className="sr-only" />
            </label>
            {raw && (
              <button onClick={() => onText('')} className="btn-ghost px-3 py-1.5 text-xs" aria-label="Clear">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <textarea
          id="chat"
          className="input min-h-44 font-mono text-xs leading-relaxed"
          value={raw}
          onChange={(e) => onText(e.target.value)}
          placeholder={'22/09/26, 9:15 am - Anbu Selvan: Kiosk 2 is not printing since morning…\n\nWhatsApp → open the chat → ⋮ → More → Export chat → Without media'}
        />
        {raw && (
          <p className="mt-2 text-xs text-ink-2">
            {messages.length ? `Found ${messages.length} messages from ${senders.length} ${senders.length === 1 ? 'person' : 'people'}.` : "Couldn't read any messages. Make sure each line starts with the date and time."}
          </p>
        )}
      </section>

      {/* Step 2: who is it */}
      {messages.length > 0 && (
        <section className="card mt-4 grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label htmlFor="wa-client" className="label">
              2. Which client is this?
            </label>
            <select id="wa-client" className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Choose a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.clientId}>
                  {c.org} ({c.clientId})
                </option>
              ))}
            </select>
            {!clientId && <p className="mt-1 text-xs text-muted">We couldn&rsquo;t match this chat automatically. Pick the client.</p>}
          </div>
          <div>
            <label htmlFor="wa-sender" className="label">
              Who in the chat is the client?
            </label>
            <select id="wa-sender" className="input" value={sender} onChange={(e) => setSender(e.target.value)}>
              {senders.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">Messages from everyone else (your team) are skipped.</p>
          </div>
          <div className="sm:col-span-2">
            <button onClick={convert} className="btn-primary" disabled={!client || !sender}>
              <Sparkles size={15} /> Convert to notes
            </button>
          </div>
        </section>
      )}

      {/* Step 3: review */}
      {drafts && (
        <section className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">3. Check the notes</h2>
            <p className="text-xs text-muted">Untick anything that isn&rsquo;t worth tracking. Everything is editable.</p>
          </div>
          {drafts.length === 0 ? (
            <p className="card mt-3 p-6 text-center text-sm text-muted">No messages from {sender} in this chat.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {drafts.map((d) => (
                <DraftCard key={d.key} d={d} patch={(p) => patch(d.key, p)} products={client?.products ?? ['ridemap', 'printa4']} />
              ))}
            </div>
          )}
          <div className="sticky bottom-4 mt-5 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur">
            <p className="text-sm text-ink-2">
              {chosen.length} of {drafts.length} selected for <b className="text-ink">{client?.org}</b>
            </p>
            <button onClick={save} className="btn-primary" disabled={!chosen.length || saving}>
              {saving && <Loader2 size={15} className="animate-spin" />} Create {chosen.length} {chosen.length === 1 ? 'note' : 'notes'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function DraftCard({ d, patch, products }: { d: NoteDraft; patch: (p: Partial<NoteDraft>) => void; products: ('ridemap' | 'printa4')[] }) {
  const Icon = KIND_META[d.kind].icon
  return (
    <div className={`card p-4 transition ${d.include ? '' : 'opacity-50'}`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={d.include} onChange={(e) => patch({ include: e.target.checked })} className="mt-2.5 size-4 accent-[var(--ink)]" aria-label="Include this note" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold">
              <Icon size={14} /> {KIND_META[d.kind].label}
            </span>
            <span className="text-xs text-muted">
              {d.at.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {d.count} message{d.count > 1 ? 's' : ''}
            </span>
          </div>
          <input className="input font-medium" value={d.subject} onChange={(e) => patch({ subject: e.target.value })} aria-label="Title" />
          <div className="flex flex-wrap gap-2">
            <select aria-label="Type" className="input w-auto py-1.5" value={d.kind} onChange={(e) => patch({ kind: e.target.value as RequestKind })}>
              {KIND_ORDER.filter((k) => k !== 'review').map((k) => (
                <option key={k} value={k}>
                  {KIND_META[k].label}
                </option>
              ))}
            </select>
            {products.length > 1 ? (
              <select aria-label="Product" className="input w-auto py-1.5" value={d.product} onChange={(e) => patch({ product: e.target.value as 'ridemap' | 'printa4', order: undefined })}>
                {products.map((p) => (
                  <option key={p} value={p}>
                    {PRODUCTS[p].name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-1 text-sm text-ink-2">
                <ProductIcon product={d.product} size={18} /> {PRODUCTS[d.product].name}
              </span>
            )}
            <select aria-label="Priority" className="input w-auto py-1.5" value={d.priority} onChange={(e) => patch({ priority: e.target.value as NoteDraft['priority'] })}>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label} priority
                </option>
              ))}
            </select>
            {d.kind === 'order' && (
              <>
                <select
                  aria-label="Order item"
                  className="input w-auto py-1.5"
                  value={d.order?.item ?? ORDER_ITEMS[d.product][0]}
                  onChange={(e) => patch({ order: { item: e.target.value, quantity: d.order?.quantity ?? 1 } })}
                >
                  {ORDER_ITEMS[d.product].map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
                <input
                  aria-label="Quantity"
                  type="number"
                  min={1}
                  className="input w-20 py-1.5"
                  value={d.order?.quantity ?? 1}
                  onChange={(e) => patch({ order: { item: d.order?.item ?? ORDER_ITEMS[d.product][0], quantity: Math.max(1, Number(e.target.value) || 1) } })}
                />
              </>
            )}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-ink-2 hover:text-ink">Original messages</summary>
            <pre className="mt-2 rounded-lg bg-surface-2 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap text-ink-2">{d.message}</pre>
          </details>
        </div>
      </div>
    </div>
  )
}
