"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent, type RefObject } from "react";

export const OTP_LENGTH = 6;

/**
 * Pull a 6-digit code out of pasted text: a bare code, "449 791", or the whole
 * WhatsApp message ("449791 is your Ridemap login code…").
 */
export function extractOtp(text: string): string | null {
  const standalone = text.match(/(?<!\d)\d{6}(?!\d)/);
  if (standalone) return standalone[0];
  const digits = text.replace(/\D/g, "");
  return digits.length === OTP_LENGTH ? digits : null;
}

interface OtpInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  onComplete: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  describedBy?: string;
  /** Exposes the first box so the parent can refocus it after errors. */
  firstInputRef?: RefObject<HTMLInputElement | null>;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  readOnly,
  describedBy,
  firstInputRef,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focusAt = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))];
    el?.focus();
    el?.select();
  };

  const commit = (next: string[]) => {
    onChange(next);
    if (next.every((d) => d !== "")) onComplete(next.join(""));
  };

  /** Fill from index `start` with a run of digits (typing or paste). */
  const fillFrom = (start: number, digits: string) => {
    if (!digits) return;
    // A full-length code always fills from the first box, wherever it was pasted.
    const from = digits.length >= OTP_LENGTH ? 0 : start;
    const next = [...value];
    for (let k = 0; k < digits.length && from + k < OTP_LENGTH; k++) next[from + k] = digits[k];
    focusAt(Math.min(from + digits.length, OTP_LENGTH - 1));
    commit(next);
  };

  const handleKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...value];
      if (next[i]) {
        next[i] = "";
      } else if (i > 0) {
        next[i - 1] = "";
        focusAt(i - 1);
      }
      onChange(next);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
    }
  };

  const handlePaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (readOnly) return;
    const text = e.clipboardData.getData("text");
    fillFrom(i, extractOtp(text) ?? text.replace(/\D/g, "").slice(0, OTP_LENGTH));
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="Verification code">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
            if (i === 0 && firstInputRef) firstInputRef.current = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={OTP_LENGTH}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={digit}
          disabled={disabled}
          readOnly={readOnly}
          onFocus={(e) => e.target.select()}
          onKeyDown={handleKeyDown(i)}
          onPaste={handlePaste(i)}
          onChange={(e) => {
            if (readOnly) return;
            const typed = e.target.value.replace(/\D/g, "");
            if (!typed) {
              // Android keyboards often report Backspace only as an emptied value.
              const next = [...value];
              next[i] = "";
              onChange(next);
              return;
            }
            // Single box: keep the newest keystroke. Longer values come from OS autofill.
            fillFrom(i, typed.length > 1 && typed.length < OTP_LENGTH ? typed.slice(-1) : typed);
          }}
          className={`h-13 w-full min-w-0 max-w-14 rounded-control border bg-rm-bg/60 text-center font-mono text-2xl font-semibold text-rm-text caret-rm-lime transition-[border-color,box-shadow] focus:border-rm-lime focus:shadow-[0_0_0_4px_var(--rm-lime-glow)] focus:outline-none focus-visible:outline-none disabled:opacity-50 sm:h-14 ${
            invalid ? "border-rm-error" : digit ? "border-rm-lime/50" : "border-rm-border"
          }`}
        />
      ))}
    </div>
  );
}
