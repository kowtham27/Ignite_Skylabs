import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { CLIENT_STATUS_META, ORG_TYPES } from '../config/clients'
import type { Client } from '../types'
import { ProductIcon } from './bits'

/** The Client ID, presented like a membership card */
export function ClientIdCard({ client, className = '' }: { client: Client; className?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    navigator.clipboard?.writeText(client.clientId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  const status = CLIENT_STATUS_META[client.status]
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-ink p-5 text-bg sm:p-6 ${className}`}>
      <div className="absolute -top-10 -right-10 size-40 rounded-full bg-marker/30 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs tracking-wider uppercase opacity-60">Client ID</p>
          <p className="display mt-1 text-3xl font-bold tracking-wider">{client.clientId}</p>
        </div>
        <button onClick={copy} className="rounded-lg bg-bg/10 p-2 hover:bg-bg/20" aria-label="Copy Client ID">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="relative mt-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{client.org}</p>
          <p className="text-xs opacity-60">
            {ORG_TYPES[client.orgType]}
            {client.city && ` · ${client.city}`} · since {new Date(client.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {client.products.map((p) => (
            <span key={p} className="rounded-md bg-white p-0.5">
              <ProductIcon product={p} size={22} />
            </span>
          ))}
          <span className="rounded-full bg-bg/15 px-2 py-0.5 text-xs font-medium text-bg ring-1 ring-bg/30">{status.label}</span>
        </div>
      </div>
    </div>
  )
}
