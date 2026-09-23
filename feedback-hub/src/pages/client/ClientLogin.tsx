import { ArrowRight, Loader2, MessageSquareHeart } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ProductWordmark, Squiggle } from '../../components/bits'
import { signIn, useSession } from '../../lib/clientSession'
import { clientApi } from '../../services/clientApi'

export default function ClientLogin() {
  const session = useSession()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [clientId, setClientId] = useState(params.get('id') ?? '')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/client" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const c = await clientApi.login(clientId, email)
    setLoading(false)
    if (!c) return setError("That Client ID and email don't match our records.")
    signIn(c.clientId)
    nav('/')
  }

  return (
    <div className="pt-4 sm:pt-10">
      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
        For partners of
        <ProductWordmark product="ridemap" height={20} className="px-2.5! py-1.5!" />
        <ProductWordmark product="printa4" height={20} className="px-2.5! py-1.5!" />
      </div>
      <h1 className="mt-5 max-w-2xl text-4xl leading-[1.05] font-extrabold sm:text-6xl">
        Your buses. Your kiosks. <span className="marker">One line to us.</span>
      </h1>
      <p className="mt-5 max-w-lg text-ink-2">
        Report issues, raise complaints, place new orders and tell us what you think. Everything you send is tracked here until it&rsquo;s done.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-[1.15fr_1fr]">
        <form onSubmit={submit} className="card relative overflow-hidden p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Client sign in</h2>
          <p className="mt-1 text-sm text-ink-2">Use the Client ID we gave you and your registered email.</p>
          <div className="relative mt-6 space-y-4">
            <div>
              <label htmlFor="cid" className="label">
                Client ID
              </label>
              <input id="cid" className="input display tracking-wider uppercase" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="CL-26-0001" required />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Registered email
              </label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
            <button className="btn-primary w-full py-2.5" disabled={loading}>
              {loading && <Loader2 size={15} className="animate-spin" />} Sign in
            </button>
            <p className="text-xs text-muted">
              Demo: <span className="font-mono">CL-25-0003</span> / <span className="font-mono">transport@kit.edu.in</span>
            </p>
          </div>
          <Squiggle className="pointer-events-none absolute -right-4 bottom-6 w-40 rotate-[-8deg] text-lime-500/25" />
        </form>

        <Link to="/client/join" className="group card relative flex flex-col overflow-hidden p-6 transition hover:-translate-y-0.5 hover:border-ink-2 sm:mt-10 sm:p-8">
          <h2 className="text-2xl font-bold">New client?</h2>
          <p className="mt-1 text-sm text-ink-2">Just bought Ridemap or PrintA4? Tell us about your organisation and get your Client ID in a minute.</p>
          <ul className="mt-6 space-y-2 text-sm text-ink-2">
            <li>→ One place for every issue, with live status</li>
            <li>→ Order more buses, trackers, kiosks or refills</li>
            <li>→ Reply history you can always come back to</li>
          </ul>
          <span className="mt-auto inline-flex items-center gap-1 pt-8 text-sm font-medium">
            Get your Client ID <ArrowRight size={15} className="transition group-hover:translate-x-1" />
          </span>
          <Squiggle className="pointer-events-none absolute -right-4 bottom-6 w-40 rotate-[6deg] text-blue-500/20" />
        </Link>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <p className="text-sm text-ink-2">Not a client? Students, staff and customers share feedback here:</p>
        <Link to="/feedback" className="btn-ghost">
          <MessageSquareHeart size={15} /> Open users panel
        </Link>
      </div>
    </div>
  )
}
