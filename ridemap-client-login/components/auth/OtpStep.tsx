"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from "react";
import { m, useAnimationControls, useReducedMotion } from "framer-motion";
import { ClipboardPaste, Pencil, ShieldCheck } from "lucide-react";
import type { VerifyOtpResponse } from "@/lib/otp/api-types";
import { formatForDisplay, toE164 } from "@/lib/phone";
import { OTP_LENGTH, OtpInput, extractOtp } from "./OtpInput";
import { PrimaryButton } from "./PrimaryButton";

export interface OtpStepHandle {
  /** Fill all boxes (e.g. from the demo toast) and verify. */
  fill: (code: string) => void;
}

interface OtpStepProps {
  ref?: Ref<OtpStepHandle>;
  phone: string;
  expiresAt: number;
  resendAt: number;
  onEdit: () => void;
  /** Resolves to an error message, or null on success (parent updates expiresAt/resendAt). */
  onResend: () => Promise<string | null>;
  onVerified: (redirectTo: string) => void;
}

const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";
const EXPIRED_MSG = "This code has expired. Request a new one.";
const emptyDigits = () => Array<string>(OTP_LENGTH).fill("");

function formatClock(ms: number, round: (n: number) => number = Math.ceil): string {
  const total = Math.max(0, round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function OtpStep({ ref, phone, expiresAt, resendAt, onEdit, onResend, onVerified }: OtpStepProps) {
  const [digits, setDigits] = useState(emptyDigits);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [serverExpired, setServerExpired] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const inFlight = useRef(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const shake = useAnimationControls();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expired = serverExpired || now >= expiresAt;
  const resendIn = resendAt - now;
  const canResend = resendIn <= 0 && !resending;
  const shownError = error ?? (expired ? EXPIRED_MSG : null);
  const complete = digits.every((d) => d !== "");

  function rejectInput() {
    setDigits(emptyDigits());
    if (!reduceMotion) void shake.start({ x: [0, -10, 10, -7, 7, -3, 0], transition: { duration: 0.4 } });
    firstInputRef.current?.focus();
  }

  async function verify(code: string) {
    if (inFlight.current || locked || expired || code.length !== OTP_LENGTH) return;
    inFlight.current = true;
    setVerifying(true);
    setError(null);

    let data: VerifyOtpResponse;
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: toE164(phone), otp: code }),
      });
      data = (await res.json()) as VerifyOtpResponse;
    } catch {
      data = { ok: false, code: "RATE_LIMITED", message: NETWORK_ERROR };
    } finally {
      inFlight.current = false;
      setVerifying(false);
    }

    if (data.ok) {
      onVerified(data.redirectTo);
      return;
    }
    setError(data.message);
    if (data.code === "TOO_MANY_ATTEMPTS") {
      setLocked(true);
      setDigits(emptyDigits());
    } else if (data.code === "EXPIRED" || data.code === "NO_CHALLENGE") {
      setServerExpired(true);
    } else if (data.code === "INCORRECT") {
      rejectInput();
    }
  }

  function fillAndVerify(code: string) {
    if (locked || expired || verifying) return;
    setDigits(code.split("").slice(0, OTP_LENGTH));
    void verify(code);
  }

  useImperativeHandle(ref, () => ({ fill: fillAndVerify }));

  /** "Paste code" button: read the clipboard (e.g. the copied WhatsApp message). */
  async function pasteFromClipboard() {
    if (locked || expired) return;
    try {
      const code = extractOtp(await navigator.clipboard.readText());
      if (code) fillAndVerify(code);
      else setError("No 6-digit code found in your clipboard. Copy the code from WhatsApp first.");
    } catch {
      setError("Couldn't read the clipboard. Tap a box and paste, or type the code.");
      firstInputRef.current?.focus();
    }
  }

  // Ctrl/Cmd+V anywhere on this step works, even before clicking a box.
  const onWindowPaste = useEffectEvent((e: ClipboardEvent) => {
    if ((e.target as HTMLElement | null)?.closest("input, textarea")) return; // boxes handle their own paste
    const code = extractOtp(e.clipboardData?.getData("text") ?? "");
    if (!code) return;
    e.preventDefault();
    fillAndVerify(code);
  });
  useEffect(() => {
    const handler = (e: ClipboardEvent) => onWindowPaste(e);
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, []);

  async function handleResend() {
    if (!canResend) return;
    setResending(true);
    setError(null);
    const message = await onResend();
    setResending(false);
    if (message) {
      setError(message);
      return;
    }
    setDigits(emptyDigits());
    setLocked(false);
    setServerExpired(false);
    setNow(Date.now());
    firstInputRef.current?.focus();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void verify(digits.join(""));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Enter verification code</h1>
        <p className="flex flex-wrap items-center gap-x-2 text-rm-muted">
          <span>
            Sent to WhatsApp <strong className="font-semibold text-rm-text">{formatForDisplay(phone)}</strong>
          </span>
          <button
            type="button"
            onClick={onEdit}
            className="-mx-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-sm font-medium text-rm-lime hover:underline"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit<span className="sr-only"> WhatsApp number</span>
          </button>
        </p>
      </div>

      <div className="space-y-3">
        <m.div animate={shake}>
          <OtpInput
            value={digits}
            onChange={(next) => {
              setDigits(next);
              if (error && !locked) setError(null);
            }}
            onComplete={(code) => void verify(code)}
            invalid={Boolean(shownError) && !complete}
            disabled={locked || expired}
            readOnly={verifying}
            describedBy="otp-error otp-expiry"
            firstInputRef={firstInputRef}
          />
        </m.div>
        <div className="flex items-start justify-between gap-3">
          <p id="otp-error" aria-live="polite" className="min-h-5 text-sm font-medium text-rm-error">
            {shownError}
          </p>
          <button
            type="button"
            onClick={pasteFromClipboard}
            disabled={locked || expired || verifying}
            className="-my-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-rm-lime/40 bg-rm-lime/10 px-3.5 text-sm font-semibold text-rm-lime transition hover:border-rm-lime hover:bg-rm-lime/20 active:scale-[0.97] disabled:opacity-40"
          >
            <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
            Paste code
          </button>
        </div>
      </div>

      <PrimaryButton
        type="submit"
        disabled={!complete || locked || expired}
        loading={verifying}
        loadingLabel="Verifying…"
        icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
      >
        Verify &amp; Continue
      </PrimaryButton>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-rm-muted">
          Didn&apos;t get it?{" "}
          {resendIn > 0 ? (
            <span>
              Resend in <span className="tabular-nums">{formatClock(resendIn)}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend}
              className="inline-flex min-h-11 items-center rounded-md font-semibold text-rm-lime hover:underline disabled:opacity-60"
            >
              {resending ? "Sending…" : "Resend OTP"}
            </button>
          )}
        </p>
        {!expired && (
          <p id="otp-expiry" className="text-xs text-rm-muted">
            Code expires in <span className="tabular-nums">{formatClock(expiresAt - now, Math.floor)}</span>
          </p>
        )}
      </div>
    </form>
  );
}
