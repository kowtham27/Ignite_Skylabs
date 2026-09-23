import { Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ORG_TYPES } from '../config/clients'
import { PRODUCT_LIST } from '../config/products'
import type { NewClient, OrgType, ProductId } from '../types'
import { ProductIcon } from './bits'

/** Shared by the public sign-up page and the admin "Add client" dialog */
export default function ClientForm({ onSubmit, submitLabel }: { onSubmit: (c: NewClient) => Promise<void>; submitLabel: string }) {
  const [f, setF] = useState({ org: '', orgType: 'college' as OrgType, contactName: '', email: '', phone: '', city: '', buses: '', kiosks: '' })
  const [products, setProducts] = useState<ProductId[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const toggle = (p: ProductId) => setProducts(products.includes(p) ? products.filter((x) => x !== p) : [...products, p])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!f.org.trim()) err.org = 'Organisation name is required'
    if (!f.contactName.trim()) err.contactName = 'Who should we talk to?'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) err.email = 'Enter a valid email'
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/[\s+-]/g, '').replace(/^91/, ''))) err.phone = 'Enter a 10-digit mobile number'
    if (!products.length) err.products = 'Pick at least one product'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    await onSubmit({
      org: f.org.trim(),
      orgType: f.orgType,
      contactName: f.contactName.trim(),
      email: f.email.trim().toLowerCase(),
      phone: f.phone.trim(),
      city: f.city.trim(),
      products,
      buses: products.includes('ridemap') && f.buses ? Number(f.buses) : undefined,
      kiosks: products.includes('printa4') && f.kiosks ? Number(f.kiosks) : undefined,
    })
    setBusy(false)
  }

  const Err = ({ k }: { k: string }) => (errors[k] ? <p className="mt-1 text-sm text-red-700 dark:text-red-400">{errors[k]}</p> : null)

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <p className="label">Products you use</p>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_LIST.map((p) => (
            <button
              type="button"
              key={p.id}
              aria-pressed={products.includes(p.id)}
              onClick={() => toggle(p.id)}
              className={`inline-flex items-center gap-2 rounded-xl border py-2 pr-4 pl-2 text-sm transition ${
                products.includes(p.id) ? 'border-ink bg-surface shadow-[3px_3px_0_0_var(--ink)]' : 'border-line bg-surface text-ink-2 hover:border-ink-2'
              }`}
            >
              <ProductIcon product={p.id} size={24} /> {p.name}
            </button>
          ))}
        </div>
        <Err k="products" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
        <div>
          <label htmlFor="org" className="label">
            Organisation
          </label>
          <input id="org" className="input" value={f.org} onChange={set('org')} placeholder="e.g. ABC College of Engineering" />
          <Err k="org" />
        </div>
        <div>
          <label htmlFor="orgType" className="label">
            Type
          </label>
          <select id="orgType" className="input" value={f.orgType} onChange={set('orgType')}>
            {Object.entries(ORG_TYPES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contactName" className="label">
            Contact person
          </label>
          <input id="contactName" className="input" value={f.contactName} onChange={set('contactName')} />
          <Err k="contactName" />
        </div>
        <div>
          <label htmlFor="city" className="label">
            City
          </label>
          <input id="city" className="input" value={f.city} onChange={set('city')} />
        </div>
        <div>
          <label htmlFor="cemail" className="label">
            Email
          </label>
          <input id="cemail" type="email" className="input" value={f.email} onChange={set('email')} />
          <Err k="email" />
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Mobile
          </label>
          <input id="phone" className="input" value={f.phone} onChange={set('phone')} placeholder="98xxxxxxxx" />
          <Err k="phone" />
        </div>
        {products.includes('ridemap') && (
          <div>
            <label htmlFor="buses" className="label">
              Number of buses <span className="text-xs font-normal text-muted">optional</span>
            </label>
            <input id="buses" type="number" min={0} className="input" value={f.buses} onChange={set('buses')} />
          </div>
        )}
        {products.includes('printa4') && (
          <div>
            <label htmlFor="kiosks" className="label">
              Number of kiosks <span className="text-xs font-normal text-muted">optional</span>
            </label>
            <input id="kiosks" type="number" min={0} className="input" value={f.kiosks} onChange={set('kiosks')} />
          </div>
        )}
      </div>
      <button className="btn-primary" disabled={busy}>
        {busy && <Loader2 size={15} className="animate-spin" />} {submitLabel}
      </button>
    </form>
  )
}
