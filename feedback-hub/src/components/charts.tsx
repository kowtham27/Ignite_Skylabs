import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { TYPE_META, TYPE_ORDER } from '../config/products'
import type { TrendRow } from '../lib/stats'
import type { FeedbackType } from '../types'

const axisTick = { fill: 'var(--muted)', fontSize: 11 }

/** Feedback per day, one line per type. Has a table view because 3 of the light-mode hues are under 3:1 contrast. */
export function TrendChart({ data, types = TYPE_ORDER, height = 240 }: { data: TrendRow[]; types?: FeedbackType[]; height?: number }) {
  const [asTable, setAsTable] = useState(false)
  const [hidden, setHidden] = useState<Set<FeedbackType>>(new Set())
  const toggle = (t: FeedbackType) =>
    setHidden((h) => {
      const n = new Set(h)
      if (n.has(t)) n.delete(t)
      else n.add(t)
      return n
    })

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {types.length > 1 &&
          types.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              aria-pressed={!hidden.has(t)}
              className={`inline-flex items-center gap-1.5 text-xs transition ${hidden.has(t) ? 'text-muted line-through' : 'text-ink-2 hover:text-ink'}`}
            >
              <span className="h-0.5 w-3.5 rounded-full" style={{ background: TYPE_META[t].color }} aria-hidden />
              {TYPE_META[t].label}
            </button>
          ))}
        <button onClick={() => setAsTable(!asTable)} className="ml-auto text-xs text-ink-2 underline decoration-line underline-offset-4 hover:text-ink">
          {asTable ? 'Show chart' : 'View as table'}
        </button>
      </div>

      {asTable ? (
        <div className="max-h-[260px] overflow-auto rounded-lg border border-line">
          <table className="tabular w-full text-sm">
            <thead className="sticky top-0 bg-surface-2 text-left text-xs text-ink-2">
              <tr>
                <th className="px-3 py-2 font-medium">Day</th>
                {types.map((t) => (
                  <th key={t} className="px-3 py-2 text-right font-medium">
                    {TYPE_META[t].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((r) => (
                <tr key={r.day} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink-2">{r.label}</td>
                  {types.map((t) => (
                    <td key={t} className="px-3 py-1.5 text-right">
                      {r[t]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={TrendTooltip} cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }} />
            {types
              .filter((t) => !hidden.has(t))
              .map((t) => (
                <Line
                  key={t}
                  type="linear"
                  dataKey={t}
                  name={TYPE_META[t].label}
                  stroke={TYPE_META[t].color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: 'var(--surface)', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function TrendTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0)
  return (
    <div className="card min-w-40 px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-ink">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center justify-between gap-4 text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tabular text-ink">{p.value}</span>
        </p>
      ))}
      {payload.length > 1 && (
        <p className="mt-1.5 flex justify-between border-t border-line pt-1.5 text-ink-2">
          Total <span className="tabular text-ink">{total}</span>
        </p>
      )}
    </div>
  )
}

/** Horizontal bars with direct value labels. Single series, so one color. */
export function BarList({
  rows,
  color = 'var(--series-1)',
  empty = 'Nothing here yet',
  suffix,
}: {
  rows: { label: string; value: number; hint?: string }[]
  color?: string
  empty?: string
  suffix?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${r.value}${suffix ? ' ' + suffix : ''}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{r.label}</span>
            <span className="tabular shrink-0 text-ink-2">
              {r.value}
              {r.hint && <span className="ml-1.5 text-xs text-muted">{r.hint}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] group-hover:opacity-80" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** 100% stacked bar with a legend underneath, for part-of-whole splits */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (!total) return <p className="py-6 text-center text-sm text-muted">No data yet</p>
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`} />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5 text-sm text-ink-2">
            <span className="size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />
            {p.label}
            <span className="tabular text-ink">{Math.round((p.value / total) * 100)}%</span>
            <span className="tabular text-xs text-muted">({p.value})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
