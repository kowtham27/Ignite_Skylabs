import { ArrowLeft, Check, Loader2, Lock, Send } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Empty, ProductChip, StatusBadge, TYPE_ICON } from '../../components/bits'
import { Waiting } from '../../components/FeedbackRow'
import { PRIORITY_META, PRIORITY_ORDER, PRODUCTS, RATINGS, STATUS_META, STATUS_ORDER, TYPE_META } from '../../config/products'
import { formatDate } from '../../lib/text'
import { feedbackApi, subscribe } from '../../services/feedbackApi'
import type { Feedback, Priority, Status } from '../../types'

// Saved replies for the things we answer every week
const CANNED: Record<string, string> = {
  'Looking into it': "Thanks for flagging this! We're looking into it and will update you here as soon as we know more.",
  'Refund initiated': 'Sorry about that. We have initiated your refund. It should reach your account in 5–7 working days.',
  'Fixed': "Good news: this should be fixed now. Could you check and let us know if it's still happening?",
  'Added to roadmap': "Love this idea. We've added it to our list and will let you know when it ships.",
  'Need more info': 'Thanks for writing in. Could you share a bit more detail (time, route/kiosk, and a screenshot if possible)?',
}

const SOURCE_LABEL = { website: 'Feedback page', embed: 'Embedded widget', app: 'Mobile app' }

export default function FeedbackDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [fb, setFb] = useState<Feedback | null | undefined>(undefined)
  const [status, setStatus] = useState<Status>('new')
  const [priority, setPriority] = useState<Priority>('medium')
  const [note, setNote] = useState('')
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState<'update' | 'reply' | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () =>
      feedbackApi.get(id).then((f) => {
        if (!alive) return
        setFb(f ?? null)
        if (f) {
          setStatus(f.status)
          setPriority(f.priority)
        }
      })
    load()
    const off = subscribe(load)
    return () => {
      alive = false
      off()
    }
  }, [id])

  // Esc goes back to the list
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName)) nav(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])

  if (fb === undefined) return <div className="mx-auto h-96 max-w-5xl animate-pulse rounded-xl bg-surface-2" />
  if (fb === null)
    return (
      <Empty title="Feedback not found">
        <Link to="/admin/feedback" className="underline">
          Back to all feedback
        </Link>
      </Empty>
    )

  const product = PRODUCTS[fb.product]
  const Icon = TYPE_ICON[fb.type]
  const dirty = status !== fb.status || priority !== fb.priority || note.trim() !== ''

  const update = async () => {
    setSaving('update')
    await feedbackApi.update(fb.id, { status, priority, note })
    setNote('')
    setSaving(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }
  const sendReply = async () => {
    if (!reply.trim()) return
    setSaving('reply')
    await feedbackApi.reply(fb.id, reply.trim())
    setReply('')
    setSaving(null)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft size={15} /> Back to feedback <kbd className="ml-1">Esc</kbd>
      </button>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: what the user said + conversation */}
        <div className="min-w-0 space-y-6">
          <article className="card p-5 sm:p-7">
            <p className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase" style={{ color: TYPE_META[fb.type].color }}>
              <Icon size={14} /> {TYPE_META[fb.type].label}
              <span className="font-normal tracking-normal text-muted normal-case">· {fb.category}</span>
            </p>
            <h1 className="mt-2 text-2xl leading-tight font-bold">{fb.subject}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusBadge status={fb.status} />
              <span className={`text-xs ${PRIORITY_META[fb.priority].className}`}>{PRIORITY_META[fb.priority].label} priority</span>
              <Waiting fb={fb} />
              {fb.votes > 0 && <span className="rounded-full bg-marker/60 px-2 py-0.5 text-xs font-medium text-ink">+{fb.votes} others reported this</span>}
            </div>
            <blockquote className="mt-6 border-l-2 border-line pl-4 leading-relaxed whitespace-pre-line text-ink">{fb.message}</blockquote>
          </article>

          <section className="card p-5 sm:p-7">
            <h2 className="text-base font-bold">Activity</h2>
            <ul className="mt-4 space-y-4">
              {fb.activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${a.kind === 'reply' ? 'bg-pop' : a.kind === 'note' ? 'bg-marker' : 'bg-line'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">
                      <span className="font-medium text-ink-2">{a.author}</span> · {formatDate(a.at)}
                      {a.kind === 'note' && (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <Lock size={10} /> internal
                        </span>
                      )}
                      {a.kind === 'reply' && <span className="ml-2">replied to user</span>}
                    </p>
                    {a.kind === 'note' || a.kind === 'reply' ? (
                      <p className={`mt-1 rounded-lg px-3 py-2 text-sm ${a.kind === 'note' ? 'bg-marker/25' : 'bg-surface-2'}`}>{a.text}</p>
                    ) : (
                      <p className="mt-0.5 text-sm text-ink-2">{a.text}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {fb.contact ? (
              <div className="mt-6 border-t border-line pt-5">
                <label htmlFor="reply" className="label">
                  Reply to {fb.name.split(' ')[0]}
                  <span className="ml-2 text-xs font-normal text-muted">they&rsquo;ll see this on their status page</span>
                </label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {Object.keys(CANNED).map((k) => (
                    <button key={k} onClick={() => setReply(CANNED[k])} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2 hover:border-ink-2 hover:text-ink">
                      {k}
                    </button>
                  ))}
                </div>
                <textarea id="reply" className="input min-h-24" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" />
                <div className="mt-2 flex justify-end">
                  <button onClick={sendReply} className="btn-primary" disabled={!reply.trim() || saving === 'reply'}>
                    {saving === 'reply' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send reply
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-6 border-t border-line pt-5 text-sm text-muted">This user chose to stay anonymous, so there&rsquo;s no one to reply to.</p>
            )}
          </section>
        </div>

        {/* Right: details + triage */}
        <aside className="space-y-6">
          <section className="card p-5">
            <dl className="space-y-3 text-sm">
              <Meta k="Product">
                <ProductChip product={fb.product} />
              </Meta>
              <Meta k="Reference">
                <span className="font-mono">{fb.refId}</span>
              </Meta>
              <Meta k="Submitted">{formatDate(fb.createdAt)}</Meta>
              <Meta k="User">{fb.name}</Meta>
              {fb.contact && (
                <Meta k="Contact">
                  <a href={fb.contact.includes('@') ? `mailto:${fb.contact}` : `tel:${fb.contact}`} className="break-all underline decoration-line underline-offset-2">
                    {fb.contact}
                  </a>
                </Meta>
              )}
              {fb.location && <Meta k={product.locationLabel}>{fb.location}</Meta>}
              {fb.reference && <Meta k={product.referenceLabel}>{fb.reference}</Meta>}
              <Meta k="Experience">{fb.rating ? `${RATINGS[fb.rating - 1].emoji} ${RATINGS[fb.rating - 1].label}` : '–'}</Meta>
              <Meta k="Source">{SOURCE_LABEL[fb.source]}</Meta>
            </dl>
          </section>

          <section className="card p-5">
            <fieldset>
              <legend className="label">Status</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_ORDER.map((s) => (
                  <Radio key={s} name="status" checked={status === s} onChange={() => setStatus(s)}>
                    <span className={`size-2 rounded-full ${STATUS_META[s].dot}`} /> {STATUS_META[s].label}
                  </Radio>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-5">
              <legend className="label">Priority</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {PRIORITY_ORDER.map((p) => (
                  <Radio key={p} name="priority" checked={priority === p} onChange={() => setPriority(p)}>
                    {PRIORITY_META[p].label}
                  </Radio>
                ))}
              </div>
            </fieldset>
            <div className="mt-5">
              <label htmlFor="note" className="label">
                Internal note <span className="text-xs font-normal text-muted">only your team sees this</span>
              </label>
              <textarea id="note" className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Checked with transport office, GPS unit on bus 9 replaced" />
            </div>
            <button onClick={update} disabled={!dirty || saving === 'update'} className="btn-primary mt-4 w-full">
              {saving === 'update' ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
              {saved ? 'Saved' : 'Update feedback'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Meta({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-ink-2">{k}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  )
}

function Radio({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marker ${
        checked ? 'border-ink bg-surface-2 font-medium text-ink' : 'border-line text-ink-2 hover:border-ink-2'
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  )
}
