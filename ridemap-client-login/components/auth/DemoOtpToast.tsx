"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface DemoOtpToastProps {
  code: string | null;
  onFill: (code: string) => void;
  onDismiss: () => void;
}

/** WhatsApp-style preview of the demo OTP. Only rendered when the API returns `demoOtp`. */
export function DemoOtpToast({ code, onFill, onDismiss }: DemoOtpToastProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-auto sm:justify-end"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {code && (
          <m.div
            key={code}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, x: 24 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="pointer-events-auto w-full max-w-sm rounded-card border border-rm-border bg-rm-raised/95 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wa-green text-white">
                <WhatsAppIcon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Ridemap</p>
                  <span className="rounded bg-rm-lime px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-rm-bg">
                    DEMO
                  </span>
                  <span className="ml-auto text-xs text-rm-muted">now</span>
                </div>
                <p className="mt-1 text-sm leading-snug text-rm-text/90">
                  <strong className="font-mono text-base tracking-wider text-rm-text">{code}</strong> is your
                  Ridemap login code. Do not share it.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onFill(code)}
                    className="min-h-11 rounded-control bg-rm-lime px-4 text-sm font-semibold text-rm-bg transition hover:bg-rm-lime-hover active:scale-[0.98]"
                  >
                    Fill code
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss demo code"
                className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-rm-muted hover:text-rm-text"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
