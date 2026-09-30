"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { StatusButton } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { Bars } from "@/components/ui/Skeleton";
import { requestRecovery } from "@/lib/auth";
import { COPY, isAppwrite } from "@/lib/errors";
import { useGuard } from "@/lib/session";
import { KEYS, read } from "@/lib/storage";
import { fieldErrors, forgotSchema } from "@/lib/validation";

export default function ForgotPage() {
  const { ready, failed } = useGuard(["anon"]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [status, setStatus] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    const last = read(KEYS.lastEmail);
    if (last) setEmail(last);
  }, []);

  if (!ready && !failed) return <Bars rows={[70, 100, 40]} />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status) return;
    const parsed = forgotSchema.safeParse({ email });
    if (!parsed.success) {
      setError(fieldErrors<"email">(parsed.error).email);
      return;
    }
    setError(undefined);
    setFormError(undefined);
    setStatus("sending…");
    try {
      await requestRecovery(parsed.data.email);
    } catch (err) {
      // Unknown email, blocked user, whatever: the answer looks the same, so
      // this page can't be used to find out who has an account. Only problems
      // that say nothing about the address get their own message.
      if (!isAppwrite(err) || err.code === 0) {
        setStatus(null);
        setFormError(COPY.network);
        return;
      }
      if (err.code === 429) {
        setStatus(null);
        setFormError(COPY.rateLimited);
        return;
      }
    }
    setStatus(null);
    setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <>
        <AuthTitle
          lede={
            <>
              If there&apos;s an account for <span className="font-medium text-ink">{sentTo}</span>, a reset link is
              on its way. It works for one hour.
            </>
          }
        >
          Check your <em>inbox</em>.
        </AuthTitle>
        <Link href="/login" className="text-[14px] text-ink underline decoration-field underline-offset-4">
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthTitle lede="We'll email you a link to choose a new one.">
        Reset your <em>password</em>.
      </AuthTitle>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          autoFocus
        />
        <FormMessage>{formError ?? (failed ? COPY.network : undefined)}</FormMessage>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusButton idle="Send reset link" status={status} />
          <Link href="/login" className="text-[14px] text-muted underline decoration-rule underline-offset-4 hover:text-ink">
            Remembered it?
          </Link>
        </div>
      </form>
    </>
  );
}
