export type ProductId = 'ridemap' | 'printa4'
export type FeedbackType = 'problem' | 'suggestion' | 'query' | 'praise' | 'general'
export type Status = 'new' | 'reviewing' | 'in_progress' | 'resolved'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
/** Where the feedback came from: the standalone page, the embedded widget, or a mobile app */
export type Source = 'website' | 'embed' | 'app'

export interface Activity {
  id: string
  /** reply = from the team to the user/client; message = follow-up from the client */
  kind: 'note' | 'reply' | 'status' | 'created' | 'message'
  author: string
  text: string
  at: string
}

export interface Feedback {
  id: string
  /** Short public reference users can quote, e.g. RM-4K7Q2 */
  refId: string
  product: ProductId
  source: Source
  type: FeedbackType
  category: string
  subject: string
  message: string
  /** 1-5, optional */
  rating?: number
  /** "Anonymous" when the user chose not to share */
  name: string
  /** Email or phone; empty for anonymous feedback */
  contact: string
  /** Campus for Ridemap, kiosk location for PrintA4 */
  location?: string
  /** Bus pass number (Ridemap) or order ID (PrintA4) */
  reference?: string
  status: Status
  priority: Priority
  /** How many other users said "me too" on this report */
  votes: number
  createdAt: string
  updatedAt: string
  activity: Activity[]
}

export type NewFeedback = Pick<
  Feedback,
  'product' | 'source' | 'type' | 'category' | 'subject' | 'message' | 'rating' | 'name' | 'contact' | 'location' | 'reference'
>

/* ---------- Clients: businesses that bought Ridemap / PrintA4 ---------- */

export type OrgType = 'college' | 'school' | 'company' | 'print_shop' | 'other'
export type ClientStatus = 'onboarding' | 'active' | 'inactive'

export interface Client {
  id: string
  /** Public client ID used to log in, e.g. CL-26-0014 */
  clientId: string
  org: string
  orgType: OrgType
  contactName: string
  email: string
  phone: string
  city: string
  products: ProductId[]
  /** Fleet / kiosk size, used for context on requests */
  buses?: number
  kiosks?: number
  status: ClientStatus
  joinedAt: string
}

export type RequestKind = 'issue' | 'complaint' | 'suggestion' | 'opinion' | 'review' | 'order'

export interface OrderDetails {
  item: string
  quantity: number
  location?: string
  neededBy?: string
}

export interface ClientRequest {
  id: string
  /** Public reference, e.g. CR-7KQ2M */
  refId: string
  clientId: string
  product: ProductId
  kind: RequestKind
  subject: string
  message: string
  /** Reviews only, 1-5 */
  rating?: number
  /** Reviews only: OK to quote on the website */
  testimonialOk?: boolean
  order?: OrderDetails
  status: Status
  priority: Priority
  /** How it reached us: the client panel, or typed in by the team from a WhatsApp chat */
  channel?: 'panel' | 'whatsapp'
  createdAt: string
  updatedAt: string
  activity: Activity[]
}

export type NewClientRequest = Pick<ClientRequest, 'clientId' | 'product' | 'kind' | 'subject' | 'message' | 'rating' | 'testimonialOk' | 'order'> &
  Partial<Pick<ClientRequest, 'channel' | 'priority' | 'createdAt'>>
export type NewClient = Omit<Client, 'id' | 'clientId' | 'joinedAt' | 'status'> & { status?: ClientStatus }

export interface FeedbackFilters {
  product?: ProductId | 'all'
  type?: FeedbackType | 'all'
  status?: Status | 'all'
  priority?: Priority | 'all'
  search?: string
}
