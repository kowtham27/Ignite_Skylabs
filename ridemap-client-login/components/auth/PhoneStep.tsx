"use client";

import { useState, type FormEvent } from "react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { isValidIndianMobile } from "@/lib/phone";
import { IndiaPhoneInput } from "./IndiaPhoneInput";
import { PrimaryButton } from "./PrimaryButton";

interface PhoneStepProps {
  initialPhone: string;
  /** Resolves to an error message, or null on success. */
  onSubmit: (national: string) => Promise<string | null>;
}

const INVALID_MSG = "Enter a valid 10-digit Indian mobile number";

export function PhoneStep({ initialPhone, onSubmit }: PhoneStepProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const valid = isValidIndianMobile(phone);
  const error = serverError ?? (touched && !valid ? INVALID_MSG : null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!valid || loading) return;
    setLoading(true);
    setServerError(null);
    const message = await onSubmit(phone);
    // On success the step unmounts; only reset local state on failure.
    if (message) {
      setServerError(message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back</h1>
        <p className="text-rm-muted">Sign in to your Ridemap client panel</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
          <WhatsAppIcon className="h-4 w-4 text-wa-green" />
          WhatsApp number
        </label>
        <IndiaPhoneInput
          id="phone"
          value={phone}
          onChange={(next) => {
            setPhone(next);
            setServerError(null);
          }}
          onBlur={() => phone.length > 0 && setTouched(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !valid) setTouched(true);
          }}
          invalid={Boolean(error)}
          describedBy="phone-help phone-error"
          disabled={loading}
        />
        <p id="phone-help" className="text-sm text-rm-muted">
          We&apos;ll send a 6-digit code to this number on WhatsApp.
        </p>
        <p id="phone-error" aria-live="polite" className="min-h-5 text-sm font-medium text-rm-error">
          {error}
        </p>
      </div>

      <PrimaryButton
        type="submit"
        disabled={!valid}
        loading={loading}
        loadingLabel="Sending…"
        icon={<WhatsAppIcon className="h-5 w-5" />}
      >
        Send OTP on WhatsApp
      </PrimaryButton>

      <p className="text-center text-xs leading-relaxed text-rm-muted">
        By continuing, you agree to Ridemap&apos;s{" "}
        <a href="/terms" className="font-medium text-rm-text underline decoration-rm-lime/60 underline-offset-2 hover:text-rm-lime">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="font-medium text-rm-text underline decoration-rm-lime/60 underline-offset-2 hover:text-rm-lime">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
