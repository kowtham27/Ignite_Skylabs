import { AlertTriangle, ArrowUp, Bug, HelpCircle, Lightbulb, MessageCircle, ThumbsUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { PRIORITY_META, PRODUCTS, STATUS_META, TYPE_META } from '../config/products'
import type { FeedbackType, Priority, ProductId, Status } from '../types'

export const TYPE_ICON: Record<FeedbackType, typeof HelpCircle> = {
  query: HelpCircle,
  suggestion: Lightbulb,
  problem: Bug,
  praise: ThumbsUp,
  general: MessageCircle,
}

export function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${m.className}`}>
      <span className={`size-1.5 rounded-full ${m.dot}`} aria-hidden />
      {m.label}
    </span>
  )
}

export function ProductChip({ product }: { product: ProductId }) {
  const p = PRODUCTS[product]
  return (
    <span className={`inline-flex items-center gap-1 rounded-md py-0.5 pr-1.5 pl-0.5 text-[11px] font-semibold tracking-wide uppercase ${p.chip}`}>
      <ProductIcon product={product} size={14} />
      {p.name}
    </span>
  )
}

/** Official square app icon */
export function ProductIcon({ product, size = 20, className = '' }: { product: ProductId; size?: number; className?: string }) {
  const p = PRODUCTS[product]
  return <img src={p.icon} alt="" width={size} height={size} className={`shrink-0 rounded-[22%] object-contain ${className}`} style={{ width: size, height: size }} />
}

/** Official wordmark on the tile it was designed for, so it reads in both light and dark mode */
export function ProductWordmark({ product, height = 28, className = '' }: { product: ProductId; height?: number; className?: string }) {
  const p = PRODUCTS[product]
  return (
    <span className={`inline-flex items-center rounded-lg px-3 py-2 ring-1 ring-line ${p.wordmarkTile} ${className}`}>
      <img src={p.wordmark} alt={p.name} style={{ height }} className="w-auto" />
    </span>
  )
}

export function TypeTag({ type }: { type: FeedbackType }) {
  const Icon = TYPE_ICON[type]
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-2">
      <Icon size={13} style={{ color: TYPE_META[type].color }} aria-hidden />
      {TYPE_META[type].label}
    </span>
  )
}

export function PriorityLabel({ priority }: { priority: Priority }) {
  const m = PRIORITY_META[priority]
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${m.className}`}>
      {priority === 'urgent' && <AlertTriangle size={12} aria-hidden />}
      {m.label}
    </span>
  )
}

export function Votes({ n }: { n: number }) {
  if (!n) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-ink-2 tabular" title={`${n} others reported the same`}>
      <ArrowUp size={12} aria-hidden />
      {n}
    </span>
  )
}

/** The hand-drawn squiggle used as a brand mark and section underline */
export function Squiggle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" className={className} fill="none" aria-hidden>
      <path d="M2 8c10-6 18 4 28-1s16-5 26 0 18 5 28 0 18-5 34 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="display inline-flex items-baseline gap-1 text-lg font-extrabold">
      heard<span className="text-pop">.</span>
    </span>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <Squiggle className="w-16 text-line" />
      <p className="display text-lg font-bold">{title}</p>
      {children && <div className="max-w-sm text-sm text-ink-2">{children}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1 text-sm transition ${value === o.value ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
