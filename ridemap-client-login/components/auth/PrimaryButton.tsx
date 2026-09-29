import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
}

/** Lime CTA — dark text on lime for contrast (never white). */
export function PrimaryButton({
  loading = false,
  loadingLabel,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`rm-shine flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-rm-lime px-5 text-base font-semibold text-rm-bg shadow-[0_8px_30px_-8px_var(--rm-lime-glow)] transition-[background-color,transform,opacity] duration-150 hover:bg-rm-lime-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:scale-100 ${className}`}
    >
      {loading ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : icon}
      <span className="relative">{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
}
