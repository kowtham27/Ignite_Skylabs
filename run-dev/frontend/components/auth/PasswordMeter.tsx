import type { Strength } from "@/lib/password";

const segColor = ["bg-rule", "bg-brick", "bg-amber", "bg-signal", "bg-signal"] as const;

/** Four plain segments and the reasons behind them. No mystery scores. */
export function PasswordMeter({ strength }: { strength: Strength }) {
  const fill = segColor[strength.score];
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-tag transition-colors transition-quick ${
                i <= strength.score ? fill : "bg-rule"
              }`}
            />
          ))}
        </div>
        <span className="w-[4.5rem] text-right font-mono text-[12px] text-muted">{strength.label}</span>
      </div>
      {strength.hints.length > 0 ? (
        <ul className="mt-2 space-y-0.5 font-mono text-[12px] leading-[18px] text-muted">
          {strength.hints.map((h) => (
            <li key={h}>· {h}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
