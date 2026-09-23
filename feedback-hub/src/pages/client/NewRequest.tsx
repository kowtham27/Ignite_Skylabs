import { Loader2, Star } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ProductIcon } from '../../components/bits'
import { KIND_META, KIND_ORDER, ORDER_ITEMS } from '../../config/clients'
import { PRODUCTS } from '../../config/products'
import { useSession } from '../../lib/clientSession'
import { useClient } from '../../lib/useClients'
import { clientApi } from '../../services/clientApi'
import type { ProductId, RequestKind } from '../../types'

const PLACEHOLDERS: Record<RequestKind, string> = {
  issue: 'What is broken? Which buses / kiosks, since when, and how many people are affected?',
  complaint: 'What went wrong, and what would make it right?',
  suggestion: 'What would you like us to build or change, and why?',
  opinion: 'How is it going for you and your team?',
  review: 'What do you like, and what could be better?',
  order: 'Anything else we should know? (site details, contact on site, timing)',
}

export default function NewRequest() {
  const session = useSession()
  const { data: client } = useClient(session)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const initialKind = params.get('kind') as RequestKind | null
  const [kind, setKind] = useState<RequestKind>(initialKind && initialKind in KIND_META ? initialKind : 'issue')
  const [product, setProduct] = useState<ProductId | null>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [testimonialOk, setTestimonialOk] = useState(false)
  const [item, setItem] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [location, setLocation] = useState('')
  const [neededBy, setNeededBy] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!client) return null
  const chosen = product ?? (client.products.length === 1 ? client.products[0] : null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!chosen) return setError('Pick which product this is about.')
    if (kind === 'order' && !item) return setError('Pick what you want to order.')
    if (kind === 'review' && !rating) return setError('Give a star rating.')
    const subj = subject.trim() || (kind === 'order' ? `${item} × ${quantity}` : '')
    if (subj.length < 4) return setError('Add a short title.')
    if (kind !== 'order' && message.trim().length < 10) return setError('Tell us a bit more (at least 10 characters).')
    setError('')
    setBusy(true)
    const r = await clientApi.createRequest(
      {
        clientId: client.clientId,
        product: chosen,
        kind,
        subject: subj,
        message: message.trim(),
        rating: kind === 'review' ? rating : undefined,
        testimonialOk: kind === 'review' ? testimonialOk : undefined,
        order: kind === 'order' ? { item, quantity: Math.max(1, Number(quantity) || 1), location: location.trim() || undefined, neededBy: neededBy || undefined } : undefined,
      },
      client.contactName,
    )
    nav(`/client/requests/${r.id}?new=1`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-extrabold">New request</h1>
      <form onSubmit={submit} noValidate className="mt-8 space-y-7">
        <div>
          <p className="label">What is it?</p>
          <div className="flex flex-wrap gap-2">
            {KIND_ORDER.map((k) => {
              const Icon = KIND_META[k].icon
              return (
                <button
                  type="button"
                  key={k}
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
                    kind === k ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink-2 hover:border-ink-2 hover:text-ink'
                  }`}
                >
                  <Icon size={14} /> {KIND_META[k].label}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-sm text-ink-2">{KIND_META[kind].hint}</p>
        </div>

        {client.products.length > 1 && (
          <div>
            <p className="label">Which product?</p>
            <div className="flex gap-2">
              {client.products.map((p) => (
                <button
                  type="button"
                  key={p}
                  aria-pressed={chosen === p}
                  onClick={() => {
                    setProduct(p)
                    setItem('')
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border py-2 pr-4 pl-2 text-sm transition ${
                    chosen === p ? 'border-ink bg-surface shadow-[3px_3px_0_0_var(--ink)]' : 'border-line bg-surface text-ink-2 hover:border-ink-2'
                  }`}
                >
                  <ProductIcon product={p} size={24} /> {PRODUCTS[p].name}
                </button>
              ))}
            </div>
          </div>
        )}

        {kind === 'order' && chosen && (
          <div className="grid gap-4 rounded-xl border border-dashed border-line p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="item" className="label">
                What would you like?
              </label>
              <select id="item" className="input" value={item} onChange={(e) => setItem(e.target.value)}>
                <option value="">Choose…</option>
                {ORDER_ITEMS[chosen].map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="qty" className="label">
                Quantity
              </label>
              <input id="qty" type="number" min={1} className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div>
              <label htmlFor="by" className="label">
                Needed by <span className="text-xs font-normal text-muted">optional</span>
              </label>
              <input id="by" type="date" className="input" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="loc" className="label">
                Location / site <span className="text-xs font-normal text-muted">optional</span>
              </label>
              <input id="loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. New library block, ground floor" />
            </div>
          </div>
        )}

        {kind === 'review' && (
          <div>
            <p className="label">Your rating</p>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((i) => (
                <button type="button" key={i} role="radio" aria-checked={rating === i} aria-label={`${i} stars`} onClick={() => setRating(i)} className="p-0.5 transition hover:scale-110">
                  <Star size={30} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-line'} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="subject" className="label">
            Title {kind === 'order' && <span className="text-xs font-normal text-muted">optional</span>}
          </label>
          <input id="subject" className="input" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label htmlFor="message" className="label">
            Details {kind === 'order' && <span className="text-xs font-normal text-muted">optional</span>}
          </label>
          <textarea id="message" className="input min-h-32" value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} placeholder={PLACEHOLDERS[kind]} />
        </div>

        {kind === 'review' && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={testimonialOk} onChange={(e) => setTestimonialOk(e.target.checked)} className="size-4 accent-[var(--ink)]" />
            You can quote this review (with our organisation name) on your website
          </label>
        )}

        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        <button className="btn-primary px-6 py-2.5" disabled={busy}>
          {busy && <Loader2 size={15} className="animate-spin" />} {kind === 'order' ? 'Place order' : 'Send'}
        </button>
      </form>
    </div>
  )
}
