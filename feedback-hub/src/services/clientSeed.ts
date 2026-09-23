import { suggestPriority } from '../lib/text'
import type { Client, ClientRequest, OrderDetails, ProductId, RequestKind, Status } from '../types'

// Fictional sample organisations so the client panel has something to show on first run
const CLIENTS: Omit<Client, 'id' | 'joinedAt'>[] = [
  { clientId: 'CL-25-0003', org: 'Kovai Institute of Technology', orgType: 'college', contactName: 'Dr. R. Senthil', email: 'transport@kit.edu.in', phone: '9843012345', city: 'Coimbatore', products: ['ridemap', 'printa4'], buses: 42, kiosks: 3, status: 'active' },
  { clientId: 'CL-25-0007', org: 'Nilgiri Arts & Science College', orgType: 'college', contactName: 'Priya Natarajan', email: 'admin@nilgiriasc.in', phone: '9894411223', city: 'Ooty', products: ['ridemap'], buses: 18, status: 'active' },
  { clientId: 'CL-25-0011', org: 'Anbu Xerox & Stationery', orgType: 'print_shop', contactName: 'Anbu Selvan', email: 'anbuxerox@gmail.com', phone: '9790055661', city: 'Tiruppur', products: ['printa4'], kiosks: 2, status: 'active' },
  { clientId: 'CL-25-0014', org: 'Velan Engineering College', orgType: 'college', contactName: 'M. Karthikeyan', email: 'office@velanec.ac.in', phone: '9443322110', city: 'Salem', products: ['ridemap', 'printa4'], buses: 30, kiosks: 2, status: 'active' },
  { clientId: 'CL-26-0002', org: 'Sunrise Matriculation School', orgType: 'school', contactName: 'Lakshmi Iyer', email: 'principal@sunrisemat.in', phone: '9500123987', city: 'Erode', products: ['ridemap'], buses: 12, status: 'active' },
  { clientId: 'CL-26-0005', org: 'Greenfield Business School', orgType: 'college', contactName: 'Arvind Menon', email: 'ops@greenfieldbs.in', phone: '9003214567', city: 'Coimbatore', products: ['printa4'], kiosks: 1, status: 'active' },
  { clientId: 'CL-26-0008', org: 'Marudham Polytechnic', orgType: 'college', contactName: 'S. Muthukumar', email: 'marudhampoly@gmail.com', phone: '9677001122', city: 'Madurai', products: ['ridemap'], buses: 9, status: 'onboarding' },
  { clientId: 'CL-26-0009', org: 'Pranav Print Point', orgType: 'print_shop', contactName: 'Pranav K', email: 'pranavprints@gmail.com', phone: '8870123456', city: 'Trichy', products: ['printa4'], kiosks: 1, status: 'onboarding' },
  { clientId: 'CL-26-0010', org: 'TechPark One Offices', orgType: 'company', contactName: 'Nisha Rao', email: 'facilities@techparkone.in', phone: '9884567123', city: 'Chennai', products: ['printa4'], kiosks: 4, status: 'onboarding' },
]
// Days since each client joined (same order as above)
const JOINED_DAYS_AGO = [330, 250, 190, 120, 70, 45, 12, 6, 2]

type Sample = [number, ProductId, RequestKind, string, string, number, Status, { rating?: number; order?: OrderDetails }?]

// [client index, product, kind, subject, message, days ago, status, extras]
const REQUESTS: Sample[] = [
  [0, 'ridemap', 'issue', 'GPS offline on 4 buses since Monday', 'Buses TN-38-AB-1122, 1123, 1140 and 1152 are not showing on the map since Monday morning. Students are calling the transport office.', 2, 'in_progress'],
  [0, 'printa4', 'order', 'Third kiosk for the new library block', 'We are opening a new library block and want one more kiosk there, colour enabled.', 5, 'reviewing', { order: { item: 'Kiosk at a new location', quantity: 1, location: 'New library block, ground floor', neededBy: '2026-10-15' } }],
  [0, 'ridemap', 'review', 'Parents love the tracking', 'Complaints to the transport office dropped a lot after Ridemap. Parents especially like seeing the bus live.', 40, 'resolved', { rating: 5 }],
  [1, 'ridemap', 'complaint', 'Support took 3 days to respond', 'We raised a route change request and nobody responded for 3 days. We need a faster turnaround during semester start.', 4, 'reviewing'],
  [1, 'ridemap', 'suggestion', 'Monthly usage report for management', 'A PDF report every month with on-time %, delays per route and app usage would help us report to management.', 18, 'in_progress'],
  [2, 'printa4', 'issue', 'Kiosk 2 payment failing with PhonePe', 'Customers paying with PhonePe get money deducted but the print does not start. GPay works fine.', 1, 'new'],
  [2, 'printa4', 'order', 'Paper refill: 20 reams', 'Running low before exam season. Please send 20 reams of A4.', 3, 'in_progress', { order: { item: 'Paper refill supply', quantity: 20, neededBy: '2026-09-28' } }],
  [2, 'printa4', 'opinion', 'Business is up since the kiosk', 'Night-time printing has brought new customers. Happy with the decision so far.', 25, 'resolved'],
  [3, 'ridemap', 'issue', 'Driver app logs out every few hours', 'Drivers have to log in again multiple times a day. They are not tech-savvy and some stop logging in.', 6, 'reviewing'],
  [3, 'printa4', 'complaint', 'Invoice amount does not match agreement', 'The September invoice charges ₹2,400 more than what was agreed for maintenance. Please check.', 8, 'in_progress'],
  [3, 'ridemap', 'order', '5 more GPS trackers for new buses', 'We bought 5 new buses. Need trackers installed before the 1st.', 10, 'resolved', { order: { item: 'Additional GPS trackers', quantity: 5, neededBy: '2026-09-01' } }],
  [4, 'ridemap', 'suggestion', 'Tamil language option for parents', 'Many parents are not comfortable with English. A Tamil option in the parent app would help a lot.', 9, 'new'],
  [4, 'ridemap', 'review', 'Simple and reliable', 'Setup was quick and the team was helpful. Would like more reports, but overall very good.', 30, 'resolved', { rating: 4 }],
  [5, 'printa4', 'issue', 'Colour prints have streaks', 'Colour prints from our kiosk have horizontal streaks since last week. Students are asking for refunds.', 3, 'new'],
  [5, 'printa4', 'suggestion', 'Let us set our own prices for binding', 'We want to charge a little more for spiral binding. Can we control that from a dashboard?', 20, 'reviewing'],
  [6, 'ridemap', 'order', 'Onboarding: route setup for 9 buses', 'Please set up our 9 routes. Route sheet will be shared over email.', 11, 'in_progress', { order: { item: 'New route setup', quantity: 9, neededBy: '2026-10-01' } }],
  [7, 'printa4', 'order', 'Installation date for first kiosk', 'We have signed up. When can the kiosk be installed? Space is ready near the bus stand shop.', 5, 'reviewing', { order: { item: 'New kiosk installation', quantity: 1, location: 'Shop front, near central bus stand' } }],
  [8, 'printa4', 'opinion', 'Excited to get started', 'Our employees print a lot of forms. Looking forward to getting the kiosks live.', 1, 'new'],
]

export function buildClientSeed(now = Date.now()) {
  const clients: Client[] = CLIENTS.map((c, i) => ({ ...c, id: `c${i}`, joinedAt: new Date(now - JOINED_DAYS_AGO[i] * 864e5).toISOString() }))
  const requests: ClientRequest[] = REQUESTS.map(([ci, product, kind, subject, message, daysAgo, status, extra], i) => {
    const createdAt = new Date(now - daysAgo * 864e5 - ((i * 37) % 20) * 36e5).toISOString()
    const client = clients[ci]
    const r: ClientRequest = {
      id: `r${i}`,
      refId: `CR-${(48213 + i * 7919).toString(36).toUpperCase().slice(-5)}`,
      clientId: client.clientId,
      product,
      kind,
      subject,
      message,
      rating: extra?.rating,
      testimonialOk: extra?.rating ? true : undefined,
      order: extra?.order,
      status,
      priority: kind === 'issue' || kind === 'complaint' ? bump(suggestPriority('problem', `${subject} ${message}`)) : kind === 'order' ? 'medium' : 'low',
      createdAt,
      updatedAt: createdAt,
      activity: [{ id: `ra${i}`, kind: 'created', author: client.contactName, text: 'Submitted request', at: createdAt }],
    }
    if (status !== 'new') {
      const at = new Date(Math.min(now, +new Date(createdAt) + 5 * 36e5)).toISOString()
      r.activity.push({ id: `rb${i}`, kind: 'reply', author: 'Team', text: kind === 'order' ? 'Thanks! We have received your order and will share the quote and timeline shortly.' : 'Thanks for letting us know. We are on it and will keep you posted here.', at })
      r.updatedAt = at
    }
    return r
  })
  return { clients, requests }
}

// A paying client's broken product is at least high priority
function bump(p: ReturnType<typeof suggestPriority>) {
  return p === 'low' || p === 'medium' ? 'high' : p
}
