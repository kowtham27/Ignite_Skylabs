import { Link } from 'react-router-dom'
import { RATINGS } from '../config/products'
import { waitingHours, timeAgo } from '../lib/text'
import type { Feedback } from '../types'
import { PriorityLabel, ProductChip, StatusBadge, TypeTag, Votes } from './bits'

/** How long an open item has been waiting, colored once it's getting old */
export function Waiting({ fb }: { fb: Feedback }) {
  if (fb.status === 'resolved') return <span className="text-xs text-muted">{timeAgo(fb.createdAt)}</span>
  const h = waitingHours(fb.createdAt)
  const tone = h > 72 ? 'text-red-700 dark:text-red-400' : h > 24 ? 'text-amber-700 dark:text-amber-400' : 'text-muted'
  return (
    <span className={`text-xs whitespace-nowrap ${tone}`} title="Waiting for a response">
      {h > 24 && '⏳ '}
      {timeAgo(fb.createdAt)}
    </span>
  )
}

export function FeedbackRow({ fb, active, compact }: { fb: Feedback; active?: boolean; compact?: boolean }) {
  return (
    <Link
      to={`/admin/feedback/${fb.id}`}
      data-active={active || undefined}
      className="group flex gap-3 px-4 py-3 transition hover:bg-surface-2 data-[active]:bg-surface-2 data-[active]:shadow-[inset_3px_0_0_var(--ink)] sm:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <ProductChip product={fb.product} />
          <TypeTag type={fb.type} />
          {!compact && <span className="text-xs text-muted">{fb.category}</span>}
        </div>
        <p className={`mt-1 truncate ${fb.status === 'new' ? 'font-semibold' : 'font-medium'}`}>{fb.subject}</p>
        {!compact && <p className="mt-0.5 line-clamp-1 text-sm text-ink-2">{fb.message}</p>}
        <p className="mt-1 flex items-center gap-3 text-xs text-muted">
          <span>{fb.name}</span>
          {fb.rating && <span title={RATINGS[fb.rating - 1].label}>{RATINGS[fb.rating - 1].emoji}</span>}
          <Votes n={fb.votes} />
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={fb.status} />
        <PriorityLabel priority={fb.priority} />
        <Waiting fb={fb} />
      </div>
    </Link>
  )
}
