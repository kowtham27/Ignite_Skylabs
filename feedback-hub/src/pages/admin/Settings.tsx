import { Check, Copy, Download, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Segmented } from '../../components/bits'
import { PRODUCT_LIST } from '../../config/products'
import { usePrefs, type Theme } from '../../lib/prefs'
import { clientApi } from '../../services/clientApi'
import { feedbackApi } from '../../services/feedbackApi'

export default function Settings() {
  const { theme, setTheme } = usePrefs()
  const origin = window.location.origin
  const [resetDone, setResetDone] = useState(false)

  const exportData = async (format: 'json' | 'csv') => {
    const items = await feedbackApi.list()
    let body: string
    if (format === 'json') body = JSON.stringify(items, null, 2)
    else {
      const cols = ['refId', 'product', 'source', 'type', 'category', 'subject', 'message', 'rating', 'name', 'contact', 'location', 'reference', 'status', 'priority', 'votes', 'createdAt'] as const
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
      body = [cols.join(','), ...items.map((f) => cols.map((c) => esc(f[c])).join(','))].join('\n')
    }
    const url = URL.createObjectURL(new Blob([body], { type: format === 'json' ? 'application/json' : 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `feedback-${new Date().toISOString().slice(0, 10)}.${format}` })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Section title="Appearance">
        <Segmented<Theme>
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'Match system' },
          ]}
        />
      </Section>

      <Section title="Put the feedback form on your sites" hint="Pick whichever fits. Feedback from each shows up tagged with its source.">
        {PRODUCT_LIST.map((p) => {
          const link = `${origin}/feedback/${p.id}`
          const button = `<!-- ${p.name} feedback button -->
<a href="${link}" target="_blank" rel="noopener"
   style="position:fixed;right:20px;bottom:20px;z-index:9999;padding:10px 16px;border-radius:999px;background:#1c1b18;color:#fff;font:500 14px system-ui;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.2)">
  Feedback
</a>`
          const iframe = `<iframe src="${link}?embed=1" title="${p.name} feedback" style="width:100%;max-width:640px;height:900px;border:0"></iframe>`
          return (
            <div key={p.id} className="border-t border-line pt-5 first:border-t-0 first:pt-0">
              <p className="display mb-3 font-bold">{p.name}</p>
              <Snippet label="Direct link (for app menus, WhatsApp, QR codes on kiosks)" code={link} />
              <Snippet label="Floating button (paste before </body>)" code={button} />
              <Snippet label="Embed the form inside a page" code={iframe} />
            </div>
          )
        })}
      </Section>

      <Section title="Your data" hint="Everything is stored in this browser for now. Export it anytime.">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportData('csv')} className="btn-ghost">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={() => exportData('json')} className="btn-ghost">
            <Download size={15} /> Export JSON
          </button>
          <button
            onClick={async () => {
              if (!confirm('Replace all feedback, clients and client requests in this browser with the sample data?')) return
              await Promise.all([feedbackApi.reset(), clientApi.reset()])
              setResetDone(true)
              setTimeout(() => setResetDone(false), 2000)
            }}
            className="btn-ghost text-red-700 dark:text-red-400"
          >
            {resetDone ? <Check size={15} /> : <RotateCcw size={15} />} {resetDone ? 'Reset done' : 'Reset to sample data'}
          </button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-bold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-ink-2">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function Snippet({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs text-ink-2">{label}</p>
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-3 pr-12 font-mono text-xs leading-relaxed text-ink-2">{code}</pre>
        <button
          onClick={() =>
            navigator.clipboard?.writeText(code).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }
          className="absolute top-2 right-2 rounded-md bg-surface p-1.5 text-ink-2 shadow-sm hover:text-ink"
          aria-label="Copy"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}
