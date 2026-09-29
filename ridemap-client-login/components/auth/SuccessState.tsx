"use client";

import { m, useReducedMotion } from "framer-motion";

export const REDIRECT_DELAY_MS = 1200;

export function SuccessState() {
  const reduceMotion = useReducedMotion();
  const draw = reduceMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" as const, delay: 0.15 };

  return (
    <div className="flex flex-col items-center py-6 text-center" role="status" aria-live="polite">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-rm-lime/30 blur-xl" aria-hidden="true" />
        <svg viewBox="0 0 80 80" className="relative h-20 w-20" aria-hidden="true">
          <circle cx="40" cy="40" r="38" fill="var(--rm-lime)" />
          <m.path
            d="M24 41 L35 52 L57 29"
            fill="none"
            stroke="var(--rm-bg)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduceMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={draw}
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">You&apos;re in!</h1>
      <p className="mt-2 text-rm-muted">Redirecting to your panel…</p>
      <div className="mt-6 h-1 w-full max-w-60 overflow-hidden rounded-full bg-white/10">
        <m.div
          className="h-full rounded-full bg-rm-lime"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: REDIRECT_DELAY_MS / 1000, ease: "linear" }}
        />
      </div>
    </div>
  );
}
