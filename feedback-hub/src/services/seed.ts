import { PRODUCTS, STATUS_META } from '../config/products'
import { suggestPriority } from '../lib/text'
import type { Feedback, FeedbackType, ProductId, Source, Status } from '../types'

// Hand-written sample reports so the dashboard has something real-looking on first run.
type Sample = [ProductId, FeedbackType, string, string, string, number?]

const SAMPLES: Sample[] = [
  ['ridemap', 'problem', 'Live tracking / GPS', 'Bus location stuck near main gate', 'The bus icon has been frozen at the main gate for 15 mins but the bus already left. Happens every morning on route 7.', 2],
  ['ridemap', 'problem', 'Bus arrival time (ETA)', 'ETA shows 2 min but bus is 20 min away', 'ETA keeps saying 2 min and then jumps to 18. Missed my first hour because of this.', 1],
  ['ridemap', 'query', 'Bus pass', 'How do I renew my bus pass?', 'My bus pass expires next week. Where do I renew it in the app? Can I pay online?'],
  ['ridemap', 'problem', 'Bus pass', 'Bus pass shows expired after renewal', 'I paid for renewal yesterday but my bus pass still shows expired. Conductor did not allow me.', 1],
  ['ridemap', 'suggestion', 'Notifications', 'Notify me when bus is 1 stop away', 'Would be great to get a push notification when the bus is one stop before mine. I keep refreshing the app.', 5],
  ['ridemap', 'suggestion', 'Routes & stops', 'Add a stop near Gandhi Nagar signal', 'A lot of students board near Gandhi Nagar signal but it is not an official stop. Please add it to route 4.', 4],
  ['ridemap', 'problem', 'App performance', 'App crashes when I open the map', 'On my Redmi phone the app crashes right after opening the map screen. Reinstalled twice.', 1],
  ['ridemap', 'query', 'Routes & stops', 'Which bus goes to the new hostel block?', 'I shifted to the new hostel block. Which route number covers it in the evening?'],
  ['ridemap', 'suggestion', 'Live tracking / GPS', 'Show how crowded the bus is', 'If drivers could mark bus as full, we could wait for the next one instead of running to the stop.', 5],
  ['ridemap', 'problem', 'Driver / staff', 'Driver skipped our stop', 'Bus 12 did not stop at Anna Street today even though 6 of us were waving. Please check.', 2],
  ['ridemap', 'query', 'Bus pass', 'Can I use one bus pass on two routes?', 'My morning and evening routes are different. Is my bus pass valid on both?'],
  ['ridemap', 'suggestion', 'App performance', 'Dark mode please', 'Early morning the white map is very bright. A dark mode would be really nice.', 4],
  ['ridemap', 'problem', 'Notifications', 'No notification for route change', 'Route 3 was diverted today and nobody was informed. Half the students waited at the old stop.', 2],
  ['ridemap', 'problem', 'Live tracking / GPS', 'Wrong location shown for bus 9', 'Bus 9 is shown on the highway but it is actually inside campus. GPS seems off by 2 km.', 2],
  ['ridemap', 'query', 'Other', 'Is there a Tamil version of the app?', 'My parents also want to track my bus. Is the app available in Tamil?'],
  ['ridemap', 'suggestion', 'Bus pass', 'Digital bus pass in the app', 'Instead of the paper bus pass, show a QR bus pass in the app. Many of us forget the card.', 5],
  ['ridemap', 'problem', 'Bus arrival time (ETA)', 'ETA not updating in evening', 'After 5 PM the ETA stops updating for route 2. Morning it works fine.', 3],
  ['ridemap', 'problem', 'App performance', 'Login OTP not received', 'Trying to log in for the first time, OTP never comes. Tried for 2 days.', 1],
  ['ridemap', 'suggestion', 'Routes & stops', 'Show full route timeline', 'Show all stops of the route with expected time at each stop, like train apps do.', 4],
  ['ridemap', 'query', 'Driver / staff', 'How do I contact the transport office?', 'Lost my bag in bus 5. Who should I contact?'],
  ['printa4', 'problem', 'Payment / refund', 'Money deducted but print not received', 'Paid ₹24 through GPay, amount deducted, but the kiosk said order not found. Need refund.', 1],
  ['printa4', 'problem', 'Kiosk not working', 'Paper jam at library kiosk', 'Library kiosk printed 3 pages and then stopped. Screen shows paper jam.', 2],
  ['printa4', 'query', 'Pricing', 'Is spiral binding available at all kiosks?', 'Need my record spiral bound for tomorrow. Which kiosks support binding?'],
  ['printa4', 'suggestion', 'Kiosk location', 'Please put a kiosk in the hostel', 'Night time printing is the biggest problem. A kiosk in the boys hostel would be vera level.', 5],
  ['printa4', 'problem', 'File upload', 'PPT file not uploading', 'Upload keeps failing for my 40 MB PPT. PDF works fine but converting is a pain.', 2],
  ['printa4', 'problem', 'Print quality', 'Colour prints look faded', 'Colour pages from the canteen kiosk look washed out. Paid ₹7/page for this.', 2],
  ['printa4', 'query', 'QR code / collection', 'QR code expired before I reached kiosk', 'How long is the QR code valid? Mine expired and I had to pay again?'],
  ['printa4', 'suggestion', 'File upload', 'Upload directly from Google Drive', 'Let us pick files from Google Drive instead of downloading them first.', 5],
  ['printa4', 'problem', 'Payment / refund', 'Charged twice for one order', 'UPI shows two debits of ₹56 for the same order. Please refund one.', 1],
  ['printa4', 'problem', 'Kiosk not working', 'Kiosk screen blank since morning', 'Admin block kiosk screen is blank. Nobody could print today.', 1],
  ['printa4', 'suggestion', 'Pricing', 'Student bulk pack', 'A monthly pack for 200 pages at a discount would be awesome for students.', 4],
  ['printa4', 'query', 'Payment / refund', 'How long does a refund take?', 'My print failed yesterday. When will I get the refund to my account?'],
  ['printa4', 'suggestion', 'QR code / collection', 'Print by entering a code, not only QR', 'My phone camera is broken. Let me type a 6 digit code at the kiosk too.', 4],
  ['printa4', 'problem', 'Print quality', 'Double side print came out upside down', 'Back pages of my double-sided print are upside down. Happened twice.', 2],
  ['printa4', 'query', 'Kiosk location', 'Any kiosk in Coimbatore city?', 'Are there kiosks outside colleges? Need one near Gandhipuram.'],
  ['printa4', 'suggestion', 'Other', 'Show paper left in kiosk on the app', 'Before I walk to the kiosk, show if paper is available or not.', 5],
  ['printa4', 'problem', 'File upload', 'Page count wrong for Word file', 'My Word file has 12 pages but it charged for 15. Formatting also changed.', 2],
  ['printa4', 'problem', 'Payment / refund', 'Payment failed, amount deducted', 'Payment failed screen but money deducted from bank. Order ID attached.', 1],
  ['ridemap', 'praise', 'Live tracking / GPS', 'Tracking saved me in the rain', 'Could wait inside the canteen till the bus was 2 mins away instead of standing in the rain. Super useful!', 5],
  ['ridemap', 'praise', 'Bus arrival time (ETA)', 'ETA has been spot on this week', 'Whatever you changed, the ETA is accurate now. Thank you.', 5],
  ['ridemap', 'general', 'Other', 'My parents track my bus too now', 'Just wanted to say my mom checks the app every evening. She is less worried now.', 4],
  ['ridemap', 'praise', 'Bus pass', 'Bus pass renewal was quick', 'Renewed my bus pass in 2 minutes. No queue at the transport office. Nice.', 5],
  ['printa4', 'praise', 'QR code / collection', 'Printing was very easy', 'Uploaded, paid, scanned, done in under a minute. Better than waiting at the xerox shop.', 5],
  ['printa4', 'praise', 'Pricing', '1 rupee per page is a steal', 'Cheapest printing on campus and no waiting. Macha, vera level.', 5],
  ['printa4', 'general', 'Kiosk location', 'Kiosk near library is always busy', 'Not a complaint really, just that the library kiosk has a line during exam time.', 3],
  ['printa4', 'general', 'Other', 'Told my whole class about PrintA4', 'Everyone in my class uses it now for record notebooks.', 4],
]

const NAMES = ['Arun K', 'Priya S', 'Karthik R', 'Divya M', 'Harish V', 'Sneha P', 'Vignesh T', 'Keerthana B', 'Rahul J', 'Meena L', 'Sanjay D', 'Aishwarya N']
const CAMPUSES = ['PSG Tech', 'Kumaraguru College', 'SRM Campus', 'Anna University', 'KCT Main Block']
const KIOSKS = ['Library, ground floor', 'Canteen block', 'Admin block', 'Boys hostel gate', 'Main block, 2nd floor']

// Tiny deterministic PRNG so the sample data is stable between reloads
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function makeRefId(product: ProductId, rand: () => number = Math.random): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 5; i++) s += chars[Math.floor(rand() * chars.length)]
  return `${PRODUCTS[product].refPrefix}-${s}`
}

export function buildSeed(now = Date.now()): Feedback[] {
  const rand = rng(42)
  return SAMPLES.map(([product, type, category, subject, message, rating], i) => {
    // Skew toward recent days so the trend has a shape
    const daysAgo = Math.floor(Math.pow(rand(), 1.6) * 28)
    const created = new Date(now - daysAgo * 864e5 - Math.floor(rand() * 864e5))
    const age = (now - created.getTime()) / 864e5
    const status: Status =
      age > 10 ? 'resolved' : age > 5 ? (rand() > 0.5 ? 'in_progress' : 'resolved') : age > 2 ? (rand() > 0.5 ? 'reviewing' : 'in_progress') : rand() > 0.3 ? 'new' : 'reviewing'
    const source: Source = rand() > 0.6 ? 'embed' : rand() > 0.5 ? 'app' : 'website'
    const anonymous = type === 'general' && rand() > 0.5
    const name = anonymous ? 'Anonymous' : NAMES[i % NAMES.length]
    const createdAt = created.toISOString()
    const fb: Feedback = {
      id: `seed-${i}`,
      refId: makeRefId(product, rand),
      product,
      source,
      type,
      category,
      subject,
      message,
      rating,
      name,
      contact: anonymous ? '' : `${name.split(' ')[0].toLowerCase()}${10 + i}@gmail.com`,
      location: product === 'ridemap' ? CAMPUSES[i % CAMPUSES.length] : KIOSKS[i % KIOSKS.length],
      reference: product === 'printa4' && category === 'Payment / refund' ? `ORD${48210 + i * 7}` : undefined,
      status,
      priority: suggestPriority(type, `${subject} ${message}`),
      votes: type !== 'problem' && type !== 'suggestion' ? 0 : Math.floor(Math.pow(rand(), 2) * 14),
      createdAt,
      updatedAt: createdAt,
      activity: [{ id: `a-${i}-0`, kind: 'created', author: name, text: 'Submitted feedback', at: createdAt }],
    }
    if (status !== 'new') {
      const at = new Date(Math.min(now, created.getTime() + 6 * 36e5)).toISOString()
      fb.activity.push({ id: `a-${i}-1`, kind: 'status', author: 'Team', text: `Marked as ${STATUS_META[status].label.toLowerCase()}`, at })
      fb.updatedAt = at
    }
    return fb
  })
}
