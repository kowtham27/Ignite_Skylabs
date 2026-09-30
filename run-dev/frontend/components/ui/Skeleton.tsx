/** Quiet placeholder bars shown while the session is being checked. */
export function Bars({ rows = [60, 100, 100, 40] }: { rows?: number[] }) {
  return (
    <div role="status" aria-label="Checking your session" className="flex flex-col gap-4">
      {rows.map((w, i) => (
        <div key={i} className="h-10 rounded-ui bg-rule/60" style={{ width: `${w}%` }} />
      ))}
      <span className="font-mono text-[12px] text-muted">checking session…</span>
    </div>
  );
}
