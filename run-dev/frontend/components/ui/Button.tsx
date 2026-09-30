import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex h-10 items-center justify-center gap-2 rounded-ui px-4 text-[14px] font-medium " +
  "disabled:cursor-not-allowed disabled:opacity-60";

// Primary and secondary are keycaps: a solid 2px lip they press down onto
// (see .keycap in globals.css). Quiet is a text link and stays flat.
const variants: Record<Variant, string> = {
  primary: "keycap bg-signal text-on-signal shadow-[0_2px_0_0_var(--signal-deep)] hover:brightness-[1.06]",
  secondary: "keycap border border-field bg-surface text-ink shadow-[0_2px_0_0_var(--lip)] hover:border-ink",
  quiet:
    "h-auto px-0 text-muted underline decoration-rule underline-offset-4 transition-colors transition-quick " +
    "hover:text-ink hover:decoration-ink",
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className = "", type = "button", ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={`${base} ${variants[variant]} ${className}`} {...rest} />;
});

/** A small keycap, for shortcut hints ("↵", "esc"). */
export function Kbd({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "on-signal" }) {
  const cls =
    tone === "on-signal"
      ? "border-on-signal/35 text-on-signal/80"
      : "border-field text-muted shadow-[0_1px_0_0_var(--lip)]";
  return (
    <kbd
      className={`inline-grid h-[18px] min-w-[18px] place-items-center rounded-[4px] border px-1 font-mono text-[11px] leading-none font-normal ${cls}`}
    >
      {children}
    </kbd>
  );
}

/**
 * Submit button whose label turns into a mono status line while working
 * ("starting session…") and when done ("✓ ready in 412 ms").
 */
export function StatusButton({
  idle,
  status,
  hint,
  className = "",
  ...rest
}: Omit<Props, "children"> & { idle: string; status: string | null; hint?: string }) {
  return (
    <Button type="submit" aria-disabled={!!status} className={`min-w-[11rem] ${className}`} {...rest}>
      {status ? (
        <span className="font-mono text-[13px] font-normal tabular">{status}</span>
      ) : (
        <>
          {idle}
          {hint ? (
            <span aria-hidden="true">
              <Kbd tone="on-signal">{hint}</Kbd>
            </span>
          ) : null}
        </>
      )}
    </Button>
  );
}
