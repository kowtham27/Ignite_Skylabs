import { Bug, Lightbulb, MessageSquare, ShoppingCart, Star, Megaphone } from 'lucide-react'
import type { ClientStatus, OrgType, ProductId, RequestKind, Status } from '../types'

export const KIND_META: Record<RequestKind, { label: string; action: string; hint: string; icon: typeof Bug }> = {
  issue: { label: 'Issue', action: 'Report an issue', hint: 'Something in the product is broken or not working', icon: Bug },
  complaint: { label: 'Complaint', action: 'Raise a complaint', hint: 'Unhappy with service, support, billing or delivery', icon: Megaphone },
  suggestion: { label: 'Suggestion', action: 'Suggest something', hint: 'A feature or change that would help you', icon: Lightbulb },
  opinion: { label: 'Opinion', action: 'Share an opinion', hint: 'How things are going for you overall', icon: MessageSquare },
  review: { label: 'Review', action: 'Write a review', hint: 'Rate the product and tell others what you think', icon: Star },
  order: { label: 'Order', action: 'Place a new order', hint: 'More units, a new location or an add-on', icon: ShoppingCart },
}
export const KIND_ORDER: RequestKind[] = ['issue', 'complaint', 'order', 'suggestion', 'opinion', 'review']

/** Orders move through the same steps, but "resolved" reads better as "fulfilled" */
export function statusLabel(kind: RequestKind, status: Status, fallback: string) {
  if (kind !== 'order') return fallback
  return { new: 'Received', reviewing: 'Quoted', in_progress: 'Processing', resolved: 'Fulfilled' }[status]
}

export const ORDER_ITEMS: Record<ProductId, string[]> = {
  ridemap: ['Additional GPS trackers', 'Add buses to fleet', 'New route setup', 'Driver app licences', 'Parent tracking add-on', 'Digital bus pass module', 'Staff training session'],
  printa4: ['New kiosk installation', 'Kiosk at a new location', 'Paper refill supply', 'Toner / ink refill', 'Colour printing upgrade', 'Spiral binding module', 'Maintenance visit'],
}

export const ORG_TYPES: Record<OrgType, string> = {
  college: 'College / University',
  school: 'School',
  company: 'Company / Office',
  print_shop: 'Xerox / print shop',
  other: 'Other',
}

export const CLIENT_STATUS_META: Record<ClientStatus, { label: string; className: string }> = {
  onboarding: { label: 'Onboarding', className: 'bg-violet-500/12 text-violet-700 dark:text-violet-300' },
  active: { label: 'Active', className: 'bg-green-600/12 text-green-800 dark:text-green-300' },
  inactive: { label: 'Inactive', className: 'bg-neutral-500/15 text-neutral-700 dark:text-neutral-300' },
}

/** Joined within this many days = shows a "New" badge */
export const NEW_CLIENT_DAYS = 30
