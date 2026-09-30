"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { maskEmail, useAuthLog } from "@/components/auth/AuthLog";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { GoogleButton, OrRule } from "@/components/auth/GoogleButton";
import { PasswordMeter } from "@/components/auth/PasswordMeter";
import { StatusButton } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { Bars } from "@/components/ui/Skeleton";
import { signUp } from "@/lib/auth";
import { COPY, generalMessage, isAppwrite, passwordPolicyMessage } from "@/lib/errors";
import { assessPassword } from "@/lib/password";
import { useGuard, useSession } from "@/lib/session";
import { KEYS, write } from "@/lib/storage";
import { fieldErrors, signupSchema } from "@/lib/validation";

type Field = "name" | "email" | "password" | "confirm";

export default function SignupPage() {
  const { refresh } = useSession();
  const log = useAuthLog();
  const [hold, setHold] = useState(false);
  const { ready, failed } = useGuard(["anon"], { hold });

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const strength = useMemo(
    () => assessPassword(form.password, { email: form.email, name: form.name }),
    [form.password, form.email, form.name],
  );

  // Server unreachable: still show the form, with the reason above it.
  if (!ready && !hold && !failed) return <Bars />;

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status) return;
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<Field>(parsed.error));
      setAttempt((n) => n + 1);
      return;
    }
    setErrors({});
    setHold(true);
    try {
      const { name, email, password } = parsed.data;
      log.push(`→ new account ${maskEmail(email)}`, "ink");
      await signUp({ name, email, password }, (step) => {
        setStatus(step);
        log.push(`  ${step.replace("…", "")}`, "muted");
      });
      log.push("✓ verification sent", "signal");
      write(KEYS.verifySentAt, String(Date.now()));
      write(KEYS.lastEmail, email);
      await refresh();
      setHold(false); // guard now moves us to /verify-pending
    } catch (err) {
      setHold(false);
      setStatus(null);
      log.push("✗ sign-up stopped", "brick");
      setAttempt((n) => n + 1);
      const policy = passwordPolicyMessage(err);
      if (isAppwrite(err, 409)) {
        setErrors({ email: "Can't use that email. If it's yours, sign in or reset the password." });
      } else if (policy) {
        setErrors({ password: policy });
      } else {
        setErrors({ form: generalMessage(err) });
      }
    }
  }

  return (
    <>
      <AuthTitle lede="Confirm your email and the board opens right after.">
        Get on the <em>board</em>.
      </AuthTitle>

      {failed ? (
        <div className="mb-6">
          <FormMessage>{COPY.network}</FormMessage>
        </div>
      ) : null}

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField label="Name" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} attempt={attempt} autoFocus />
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={set("email")}
          error={errors.email}
          attempt={attempt}
        />
        {/* Side by side from sm up: the pair is read as one decision, and it
            keeps the whole form on one screen at laptop heights. */}
        <div>
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
            <TextField
              label="Password"
              type="password"
              name="new-password"
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              error={errors.password}
              attempt={attempt}
              aside={<span className="font-mono text-[12px] text-muted">10+ chars</span>}
            />
            <TextField
              label="Confirm"
              type="password"
              name="confirm"
              autoComplete="new-password"
              value={form.confirm}
              onChange={set("confirm")}
              error={errors.confirm}
              attempt={attempt}
            />
          </div>
          {form.password ? (
            <div className="mt-3">
              <PasswordMeter strength={strength} />
            </div>
          ) : null}
        </div>
        <FormMessage>{errors.form}</FormMessage>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusButton idle="Create account" hint="↵" status={status} />
          <p className="text-[14px] text-muted">
            Have an account?{" "}
            <Link href="/login" className="text-ink underline decoration-field underline-offset-4 hover:decoration-ink">
              Sign in
            </Link>
          </p>
        </div>
      </form>

      <OrRule />
      <GoogleButton label="Sign up with Google" />
    </>
  );
}
