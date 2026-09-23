import { ArrowUp, Check, Copy, Loader2 } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ProductIcon, ProductWordmark, StatusBadge, TYPE_ICON } from '../../components/bits'
import { FORM_ORDER, PRODUCT_LIST, PRODUCTS, RATINGS, TYPE_META } from '../../config/products'
import { feedbackApi } from '../../services/feedbackApi'
import type { Feedback, FeedbackType, ProductId, Source } from '../../types'

// What we ask in the big text box changes with the kind of feedback
const PROMPTS: Record<FeedbackType, { subject: string; message: string }> = {
  query: { subject: 'e.g. How do I renew my bus pass?', message: 'Ask away. The more detail, the faster we can answer.' },
  suggestion: { subject: 'e.g. Notify me when the bus is one stop away', message: 'What would you like, and how would it help you?' },
  problem: { subject: 'e.g. Money deducted but print not received', message: 'What happened? When and where? What did you expect instead?' },
  praise: { subject: 'e.g. Tracking saved me in the rain', message: 'What did you like? We share these with the whole team.' },
  general: { subject: 'e.g. Just wanted to say…', message: 'Anything on your mind.' },
}

export default function SubmitFeedback() {
  const { product: pid } = useParams()
  const [params] = useSearchParams()
  const embed = params.get('embed') === '1'

  const [type, setType] = useState<FeedbackType | null>(null)
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number | undefined>()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [location, setLocation] = useState('')
  const [reference, setReference] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<Feedback | null>(null)
  const [votedFor, setVotedFor] = useState<Feedback | null>(null)
  const [similar, setSimilar] = useState<Feedback[]>([])

  const product = pid && pid in PRODUCTS ? PRODUCTS[pid as ProductId] : null

  // Look for existing reports as the user types (debounced)
  useEffect(() => {
    if (!product || (type !== 'problem' && type !== 'suggestion')) return
    const text = `${subject} ${message}`
    const t = setTimeout(() => feedbackApi.findSimilar(product.id, text).then(setSimilar), 450)
    return () => clearTimeout(t)
  }, [product, type, subject, message])

  if (!product) return <Navigate to="/" replace />

  const validate = () => {
    const e: Record<string, string> = {}
    if (!type) e.type = 'Pick one so we know how to handle it'
    if (!category) e.category = 'Pick the closest match'
    if (subject.trim().length < 5) e.subject = 'A few more words, please'
    if (message.trim().length < 10) e.message = 'Tell us a bit more (at least 10 characters)'
    const c = contact.trim()
    if (!anonymous && !name.trim()) e.name = 'So we know what to call you'
    if (!anonymous && !/^\S+@\S+\.\S+$/.test(c) && !/^[6-9]\d{9}$/.test(c.replace(/[\s+-]/g, '').replace(/^91/, '')))
      e.contact = 'Enter a valid email or 10-digit mobile number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!validate() || !type) {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSending(true)
    const fb = await feedbackApi.create({
      product: product.id,
      source: (embed ? 'embed' : params.get('source') === 'app' ? 'app' : 'website') as Source,
      type,
      category,
      subject: subject.trim(),
      message: message.trim(),
      rating,
      name: anonymous ? 'Anonymous' : name.trim(),
      contact: anonymous ? '' : contact.trim(),
      location: location.trim() || undefined,
      reference: reference.trim() || undefined,
    })
    setSending(false)
    setDone(fb)
  }

  const meToo = async (f: Feedback) => {
    await feedbackApi.vote(f.id)
    setVotedFor(f)
  }

  if (done) return <Thanks fb={done} embed={embed} />
  if (votedFor) return <Voted fb={votedFor} onBack={() => setVotedFor(null)} />

  const prompts = PROMPTS[type ?? 'problem']

  return (
    <div className={embed ? '' : 'pt-6 sm:pt-10'}>
      <div className="inline-flex rounded-full border border-line bg-surface p-0.5 text-sm" role="tablist" aria-label="Product">
        {PRODUCT_LIST.map((p) => (
          <Link
            key={p.id}
            to={`/feedback/${p.id}${embed ? '?embed=1' : ''}`}
            role="tab"
            aria-selected={p.id === product.id}
            className={`inline-flex items-center gap-1.5 rounded-full py-1 pr-3.5 pl-1.5 transition ${p.id === product.id ? 'bg-ink text-bg' : 'text-ink-2 hover:text-ink'}`}
          >
            <ProductIcon product={p.id} size={18} />
            {p.name}
          </Link>
        ))}
      </div>
      <div className="mt-6">
        <ProductWordmark product={product.id} height={embed ? 24 : 32} />
      </div>
      <h1 className={`${embed ? 'mt-3 text-2xl' : 'mt-4 text-3xl sm:text-4xl'} font-extrabold`}>
        Talk to the <span className="marker">{product.name}</span> team
      </h1>
      <p className="mt-2 text-ink-2">Takes about a minute. We read every single one.</p>

      <form onSubmit={submit} noValidate className="mt-10 max-w-2xl space-y-10">
        <Step n={1} title="What's this about?" error={errors.type}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Feedback type" aria-invalid={!!errors.type}>
            {FORM_ORDER.map((t) => {
              const Icon = TYPE_ICON[t]
              const on = type === t
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    on ? 'border-ink bg-surface shadow-[3px_3px_0_0_var(--ink)]' : 'border-line bg-surface hover:border-ink-2'
                  }`}
                >
                  <Icon size={20} style={{ color: TYPE_META[t].color }} aria-hidden />
                  <span>
                    <span className="block font-medium">{TYPE_META[t].label}</span>
                    <span className="block text-xs text-ink-2">{TYPE_META[t].hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Step>

        <Step n={2} title="Which part of the app?" error={errors.category}>
          <div className="flex flex-wrap gap-2" aria-invalid={!!errors.category}>
            {product.categories.map((c) => (
              <button
                type="button"
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  category === c ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink-2 hover:border-ink-2 hover:text-ink'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Step>

        <Step n={3} title="Tell us">
          <div className="space-y-4">
            <Field label="In one line" error={errors.subject} htmlFor="subject">
              <input
                id="subject"
                className="input"
                value={subject}
                maxLength={120}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={prompts.subject}
                aria-invalid={!!errors.subject}
              />
            </Field>
            <Field label="The details" error={errors.message} htmlFor="message" hint={`${message.length}/1500`}>
              <textarea
                id="message"
                className="input min-h-32 resize-y"
                value={message}
                maxLength={1500}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={prompts.message}
                aria-invalid={!!errors.message}
              />
            </Field>

            {similar.length > 0 && (type === 'problem' || type === 'suggestion') && (
              <div className="rounded-xl border border-dashed border-ink-2/40 bg-surface-2/60 p-4">
                <p className="text-sm font-medium">Looks like others ran into this too</p>
                <p className="mb-3 text-xs text-ink-2">If one of these is the same thing, just add your voice. It moves it up our list.</p>
                <ul className="space-y-2">
                  {similar.map((f) => (
                    <li key={f.id} className="flex items-start justify-between gap-3 rounded-lg bg-surface p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{f.subject}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-ink-2">
                          <StatusBadge status={f.status} />
                          {f.votes > 0 && <span>{f.votes + 1} people</span>}
                        </p>
                      </div>
                      <button type="button" onClick={() => meToo(f)} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
                        <ArrowUp size={13} /> Me too
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={product.locationLabel} htmlFor="location" optional>
                <input id="location" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={product.locationPlaceholder} />
              </Field>
              <Field label={product.referenceLabel} htmlFor="reference" optional>
                <input id="reference" className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={product.referencePlaceholder} />
              </Field>
            </div>
          </div>
        </Step>

        <Step n={4} title={`How do you feel about ${product.name} overall?`} optional>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Overall rating">
            {RATINGS.map((r, i) => {
              const v = i + 1
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={rating === v}
                  key={r.label}
                  aria-label={r.label}
                  onClick={() => setRating(rating === v ? undefined : v)}
                  className={`group flex w-16 flex-col items-center gap-1 rounded-xl border py-2 transition ${
                    rating === v ? 'border-ink bg-marker/60' : 'border-line bg-surface hover:border-ink-2'
                  }`}
                >
                  <span className={`text-2xl transition group-hover:scale-110 ${rating && rating !== v ? 'opacity-40 grayscale' : ''}`}>{r.emoji}</span>
                  <span className="text-[11px] text-ink-2">{r.label}</span>
                </button>
              )
            })}
          </div>
        </Step>

        <Step n={5} title="Where do we reach you?">
          <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="size-4 accent-[var(--ink)]" />
            Keep me anonymous
          </label>
          {anonymous ? (
            <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-ink-2">
              No problem. We won&rsquo;t be able to reply to you, but you can still check the status with your reference ID.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" error={errors.name} htmlFor="name">
                  <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} />
                </Field>
                <Field label="Email or mobile" error={errors.contact} htmlFor="contact">
                  <input
                    id="contact"
                    className="input"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    autoComplete="email"
                    placeholder="you@college.edu or 98xxxxxxxx"
                    aria-invalid={!!errors.contact}
                  />
                </Field>
              </div>
              <p className="mt-2 text-xs text-muted">Only used to reply to you about this. No spam, promise.</p>
            </>
          )}
        </Step>

        <div className="flex items-center gap-4 border-t border-line pt-6">
          <button type="submit" className="btn-primary px-6 py-2.5" disabled={sending}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : null}
            {sending ? 'Sending…' : 'Send it'}
          </button>
          {Object.keys(errors).length > 0 && <p className="text-sm text-red-700 dark:text-red-400">A couple of things need a look above.</p>}
        </div>
      </form>
    </div>
  )
}

function Step({ n, title, optional, error, children }: { n: number; title: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="display tabular text-sm font-bold text-muted">{String(n).padStart(2, '0')}</span>
        <h2 className="text-lg font-bold">
          {title} {optional && <span className="font-sans text-xs font-normal text-muted">optional</span>}
        </h2>
      </div>
      {children}
      {error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </section>
  )
}

function Field({ label, htmlFor, error, hint, optional, children }: { label: string; htmlFor: string; error?: string; hint?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={htmlFor} className="label">
          {label} {optional && <span className="text-xs font-normal text-muted">optional</span>}
        </label>
        {hint && <span className="tabular text-xs text-muted">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1.5 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  )
}

function Thanks({ fb, embed }: { fb: Feedback; embed: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(fb.refId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="max-w-xl pt-10 sm:pt-16">
      <p className="text-sm text-ink-2">{fb.contact ? `Got it, ${fb.name.split(' ')[0]}.` : 'Got it.'}</p>
      <h1 className="mt-2 text-4xl font-extrabold">
        Thanks. <span className="marker">We&rsquo;re on it.</span>
      </h1>
      <p className="mt-4 text-ink-2">
        {
          {
            problem: 'Sorry you had to deal with that. Someone from the team will look into it and get back to you.',
            query: "We'll answer your question as soon as we can.",
            suggestion: 'We love ideas like this. We’ll let you know if it makes it into the app.',
            praise: 'This genuinely made our day. We’re passing it on to the whole team.',
            general: 'Thanks for taking the time. Every note helps us understand you better.',
          }[fb.type]
        }
      </p>

      <div className="card mt-8 flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">Your reference ID</p>
          <p className="display mt-1 text-2xl font-bold tracking-wider">{fb.refId}</p>
        </div>
        <button onClick={copy} className="btn-ghost">
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-3 text-sm text-ink-2">
        Save this. Use it{fb.contact && <> with <span className="font-medium text-ink">{fb.contact}</span></>} to{' '}
        <Link to={`/track?ref=${fb.refId}${embed ? '&embed=1' : ''}`} className="font-medium text-ink underline decoration-marker decoration-2 underline-offset-4">
          check the status
        </Link>{' '}
        anytime.
      </p>
    </div>
  )
}

function Voted({ fb, onBack }: { fb: Feedback; onBack: () => void }) {
  return (
    <div className="max-w-xl pt-10 sm:pt-16">
      <h1 className="text-4xl font-extrabold">
        Added your <span className="marker">+1</span>
      </h1>
      <p className="mt-4 text-ink-2">
        &ldquo;{fb.subject}&rdquo; now has {fb.votes + 2} people behind it. Issues with more voices get fixed first.
      </p>
      <button onClick={onBack} className="btn-ghost mt-8">
        Actually, mine is different. Let me write it.
      </button>
    </div>
  )
}
