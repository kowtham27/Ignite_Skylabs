"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { TiltCard } from "@/components/effects/TiltCard";
import type { SendOtpResponse } from "@/lib/otp/api-types";
import { toE164 } from "@/lib/phone";
import { DemoOtpToast } from "./DemoOtpToast";
import { OtpStep, type OtpStepHandle } from "./OtpStep";
import { PhoneStep } from "./PhoneStep";
import { REDIRECT_DELAY_MS, SuccessState } from "./SuccessState";

type Step = "phone" | "otp" | "success";

const NETWORK_ERROR = "Couldn't reach the server. Check your connection and try again.";

export function AuthCard() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const otpRef = useRef<OtpStepHandle>(null);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [challenge, setChallenge] = useState({ expiresAt: 0, resendAt: 0 });
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  /** Requests a code; resolves to an error message or null. */
  async function sendOtp(national: string): Promise<string | null> {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: toE164(national) }),
      });
      const data = (await res.json()) as SendOtpResponse;
      if (!data.ok) return data.message;
      setChallenge({ expiresAt: data.expiresAt, resendAt: data.resendAt });
      setDemoOtp(data.demoOtp ?? null);
      return null;
    } catch {
      return NETWORK_ERROR;
    }
  }

  const slide = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
      };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="relative w-full max-w-[420px]">
        <div
          className="absolute -inset-6 -z-10 rounded-[32px] bg-rm-lime/10 blur-3xl"
          aria-hidden="true"
        />
        <TiltCard>
        <div className="overflow-hidden rounded-card border border-rm-border bg-rm-surface p-6 shadow-2xl backdrop-blur-xl sm:p-8 [@media(max-height:620px)]:p-5">
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={step} {...slide} transition={{ duration: 0.25, ease: "easeOut" }}>
              {step === "phone" && (
                <PhoneStep
                  initialPhone={phone}
                  onSubmit={async (national) => {
                    const error = await sendOtp(national);
                    if (!error) {
                      setPhone(national);
                      setStep("otp");
                    }
                    return error;
                  }}
                />
              )}
              {step === "otp" && (
                <OtpStep
                  ref={otpRef}
                  phone={phone}
                  expiresAt={challenge.expiresAt}
                  resendAt={challenge.resendAt}
                  onEdit={() => {
                    setDemoOtp(null);
                    setStep("phone");
                  }}
                  onResend={() => sendOtp(phone)}
                  onVerified={(redirectTo) => {
                    setDemoOtp(null);
                    setStep("success");
                    window.setTimeout(() => router.replace(redirectTo), REDIRECT_DELAY_MS);
                  }}
                />
              )}
              {step === "success" && <SuccessState />}
            </m.div>
          </AnimatePresence>
        </div>
        </TiltCard>
      </div>

      <DemoOtpToast
        code={step === "otp" ? demoOtp : null}
        onFill={(code) => {
          setDemoOtp(null);
          otpRef.current?.fill(code);
        }}
        onDismiss={() => setDemoOtp(null)}
      />
    </LazyMotion>
  );
}
