import { useState } from 'react'
import { Link } from 'react-router-dom'
import ClientForm from '../../components/ClientForm'
import { ClientIdCard } from '../../components/ClientIdCard'
import { signIn } from '../../lib/clientSession'
import { clientApi } from '../../services/clientApi'
import type { Client } from '../../types'

export default function ClientJoin() {
  const [created, setCreated] = useState<Client | null>(null)

  if (created)
    return (
      <div className="mx-auto max-w-xl pt-6">
        <p className="text-sm text-ink-2">Welcome aboard, {created.contactName.split(' ')[0]}.</p>
        <h1 className="mt-1 text-3xl font-extrabold">
          Here&rsquo;s your <span className="marker">Client ID</span>
        </h1>
        <p className="mt-3 text-ink-2">Use it with {created.email} to sign in. Our team will reach out to finish onboarding.</p>
        <ClientIdCard client={created} className="mt-6" />
        <div className="mt-6 flex gap-2">
          <Link to="/" onClick={() => signIn(created.clientId)} className="btn-primary">
            Go to my panel
          </Link>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-2xl pt-4">
      <h1 className="text-3xl font-extrabold">
        Just joined us? <span className="marker">Let&rsquo;s get you set up.</span>
      </h1>
      <p className="mt-2 text-ink-2">Tell us about your organisation and you&rsquo;ll get your Client ID right away.</p>
      <div className="card mt-8 p-6">
        <ClientForm submitLabel="Get my Client ID" onSubmit={async (c) => setCreated(await clientApi.createClient(c))} />
      </div>
      <p className="mt-4 text-sm text-ink-2">
        Already have an ID?{' '}
        <Link to="/client/login" className="font-medium text-ink underline decoration-marker decoration-2 underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  )
}
