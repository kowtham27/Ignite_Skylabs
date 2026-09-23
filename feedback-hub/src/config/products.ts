import type { FeedbackType, Priority, ProductId, Status } from '../types'

export interface ProductConfig {
  id: ProductId
  name: string
  tagline: string
  url: string
  refPrefix: string
  categories: string[]
  locationLabel: string
  locationPlaceholder: string
  referenceLabel: string
  referencePlaceholder: string
  /** Chip colors for this product in the UI (not used in charts) */
  chip: string
  /** Official square app icon (works on any background) */
  icon: string
  /** Official wordmark, plus the tile it needs to stay legible (Ridemap has white text, PrintA4 dark text) */
  wordmark: string
  wordmarkTile: string
}

export const PRODUCTS: Record<ProductId, ProductConfig> = {
  ridemap: {
    id: 'ridemap',
    name: 'Ridemap',
    tagline: 'Live campus bus tracking',
    url: 'https://ridemap.in/',
    refPrefix: 'RM',
    categories: [
      'Live tracking / GPS',
      'Bus arrival time (ETA)',
      'Bus pass',
      'Routes & stops',
      'Notifications',
      'App performance',
      'Driver / staff',
      'Other',
    ],
    locationLabel: 'College / campus',
    locationPlaceholder: 'e.g. ABC Engineering College',
    referenceLabel: 'Bus pass number',
    referencePlaceholder: 'Optional',
    chip: 'bg-lime-500/15 text-lime-800 dark:text-lime-300',
    icon: '/logos/ridemap-icon.png',
    wordmark: '/logos/ridemap-wordmark.png',
    wordmarkTile: 'bg-[#141414]',
  },
  printa4: {
    id: 'printa4',
    name: 'PrintA4',
    tagline: 'Self-service print kiosks',
    url: 'https://printa4.in/home',
    refPrefix: 'PA',
    categories: [
      'Payment / refund',
      'Print quality',
      'Kiosk not working',
      'File upload',
      'QR code / collection',
      'Kiosk location',
      'Pricing',
      'Other',
    ],
    locationLabel: 'Kiosk location',
    locationPlaceholder: 'e.g. Main block, near library',
    referenceLabel: 'Order ID',
    referencePlaceholder: 'Optional',
    chip: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
    icon: '/logos/printa4-icon.png',
    wordmark: '/logos/printa4-wordmark.png',
    wordmarkTile: 'bg-white',
  },
}

export const PRODUCT_LIST = Object.values(PRODUCTS)

/**
 * Chart colors follow the validated categorical order (slot 1..5), and each type keeps its
 * color everywhere. ORDER is the legend/series order; the form lists types in FORM_ORDER.
 */
export const TYPE_META: Record<FeedbackType, { label: string; hint: string; color: string; emoji: string }> = {
  query: { label: 'Question', hint: 'I want to know something', color: 'var(--series-1)', emoji: '❓' },
  problem: { label: 'Problem', hint: 'Something is broken', color: 'var(--series-2)', emoji: '🔴' },
  praise: { label: 'Praise', hint: 'Something made my day', color: 'var(--series-3)', emoji: '👍' },
  suggestion: { label: 'Suggestion', hint: 'I have an idea', color: 'var(--series-4)', emoji: '💡' },
  general: { label: 'General', hint: 'Just saying', color: 'var(--series-5)', emoji: '💬' },
}
export const TYPE_ORDER: FeedbackType[] = ['query', 'problem', 'praise', 'suggestion', 'general']
export const FORM_ORDER: FeedbackType[] = ['problem', 'suggestion', 'query', 'praise', 'general']

export const STATUS_META: Record<Status, { label: string; className: string; dot: string }> = {
  new: { label: 'New', className: 'bg-blue-500/12 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  reviewing: { label: 'Reviewing', className: 'bg-violet-500/12 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  in_progress: { label: 'In progress', className: 'bg-amber-500/15 text-amber-800 dark:text-amber-300', dot: 'bg-amber-500' },
  resolved: { label: 'Resolved', className: 'bg-green-600/12 text-green-800 dark:text-green-300', dot: 'bg-green-600' },
}
export const STATUS_ORDER: Status[] = ['new', 'reviewing', 'in_progress', 'resolved']

export const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'text-ink-2' },
  medium: { label: 'Medium', className: 'text-ink' },
  high: { label: 'High', className: 'text-orange-700 dark:text-orange-300' },
  urgent: { label: 'Urgent', className: 'text-red-700 dark:text-red-400 font-semibold' },
}
export const PRIORITY_ORDER: Priority[] = ['low', 'medium', 'high', 'urgent']

export const RATINGS = [
  { emoji: '😡', label: 'Awful' },
  { emoji: '😕', label: 'Meh' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '🤩', label: 'Love it' },
]
