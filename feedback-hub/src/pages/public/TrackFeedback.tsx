import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductChip, TypeTag } from '../../components/bits'
import { STATUS_META, STATUS_ORDER } from '../../config/products'
import { formatDate } from '../../lib/text'
import { feedbackApi } from '../../services/feedbackApi'
import type { Feedback } from '../../types'

export default function TrackFeedback() {
  const [params] = useSearchParams()
  const [ref, setRef] = useState(params.get('ref') ?? '')
  const [contact, setContact] = useState('')
  const [result, setResult] = useState<Feedback | null | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const lookup = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!ref.trim()) return
    setLoading(true)
    setResult((await feedbackApi.track(ref, contact)) ?? null)
    setLoading(false)
  }

  // Coming straight from the thank-you screen: the ID is already filled in
  useEffect(() => {
    if (params.get('ref')) document.getElementById('contact')?.focus()
  }, [params])

  return (
    <div className="max-w-2xl pt-8 sm:pt-14">
      <h1 className="text-3xl font-extrabold sm:text-4xl">
        What happened to <span className="marker">my feedback?</span>
      </h1>
      <p className="mt-2 text-ink-2">Enter the reference ID we gave you and the email or phone you used.</p>

      <form onSubmit={lookup} className="mt-8 grid gap-3 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
        <div>
          <label htmlFor="ref" className="label">
            Reference ID
          </label>
          <input id="ref" className="input display uppercase tracking-wider" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="RM-XXXXX" />
        </div>
        <div>
          <label htmlFor="contact" className="label">
            Email or mobile <span className="text-xs font-normal text-muted">skip if you were anonymous</span>
          </label>
          <input id="contact" className="input" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        <button className="btn-primary" disabled={loading || !ref.trim()}>
          {loading && <Loader2 size={15} className="animate-spin" />} Check
        </button>
      </form>

      {result === null && (
        <p className="mt-8 rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink-2">
          Hmm, couldn&rsquo;t find that one. Double-check the ID (it looks like <span className="font-mono">PA-7KQ2M</span>) and the contact you used.
        </p>
      )}

      {result && <Result fb={result} />}
    </div>
  )
}

function Result({ fb }: { fb: Feedback }) {
  const current = STATUS_ORDER.indexOf(fb.status)
  // Users see status changes and our replies, never internal notes or priority
  const timeline = fb.activity.filter((a) => a.kind === 'reply' || a.kind === 'created' || (a.kind === 'status' && a.text.startsWith('Marked')))

  return (
    <div className="card mt-10 p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <ProductChip product={fb.product} />
        <TypeTag type={fb.type} />
        <span className="text-xs text-muted">{fb.category}</span>
      </div>
      <h2 className="mt-3 text-xl font-bold">{fb.subject}</h2>

      <ol className="mt-7 grid grid-cols-4 gap-1" aria-label="Progress">
        {STATUS_ORDER.map((s, i) => {
          const reached = i <= current
          return (
            <li key={s} className="flex flex-col gap-2">
              <span className={`h-1.5 rounded-full ${reached ? 'bg-ink' : 'bg-surface-2'}`} />
              <span className={`flex items-center gap-1 text-xs ${i === current ? 'font-semibold text-ink' : reached ? 'text-ink-2' : 'text-muted'}`}>
                {reached && i < current && <Check size={12} aria-hidden />}
                {STATUS_META[s].label}
              </span>
            </li>
          )
        })}
      </ol>

      <ul className="mt-8 space-y-5 border-l border-line pl-5">
        {timeline.map((a) => (
          <li key={a.id} className="relative">
            <span className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-surface ${a.kind === 'reply' ? 'bg-pop' : 'bg-muted'}`} />
            <p className="text-xs text-muted">{formatDate(a.at)}</p>
            {a.kind === 'reply' ? (
              <div className="mt-1.5 rounded-lg rounded-tl-none bg-surface-2 px-3.5 py-2.5 text-sm">
                <p className="mb-1 text-xs font-semibold text-ink-2">Reply from the team</p>
                {a.text}
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-ink-2">{a.kind === 'created' ? 'You sent this feedback' : a.text}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
