"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { maskEmail, useAuthLog } from "@/components/auth/AuthLog";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { GoogleButton, OrRule } from "@/components/auth/GoogleButton";
import { StatusButton } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { Bars } from "@/components/ui/Skeleton";
import { signIn } from "@/lib/auth";
import { COPY, generalMessage, isAppwrite } from "@/lib/errors";
import { useGuard, useSession } from "@/lib/session";
import { KEYS, read, write } from "@/lib/storage";
import { fieldErrors, loginSchema } from "@/lib/validation";

type Field = "email" | "password";

/** Only same-origin continuation into the verify step is honoured. */
function safeNext(next: string | null): string | null {
  return next && next.startsWith("/verify?") ? next : null;
}

/**
 * Returning visitor: the email is already known, so show who's signing in
 * rather than an input they'd have to re-check. One click to switch.
 */
function KnownIdentity({ email, onSwitch }: { email: string; onSwitch: () => void }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-ink">Signing in as</p>
      <div className="flex h-10 items-center justify-between gap-3 rounded-ui border border-rule bg-paper pr-3 pl-1">
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-signal font-mono text-[13px] font-medium text-on-signal uppercase"
          >
            {email[0]}
          </span>
          <span className="truncate text-[14px] text-ink">{email}</span>
        </span>
        <button
          type="button"
          onClick={onSwitch}
          className="shrink-0 font-mono text-[12px] text-muted underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
        >
          not you?
        </button>
      </div>
    </div>
  );
}

function Login() {
  const params = useSearchParams();
  const router = useRouter();
  const log = useAuthLog();
  const { refresh } = useSession();
  const [hold, setHold] = useState(false);
  const { ready, failed } = useGuard(["anon"], { hold });

  const [email, setEmail] = useState("");
  const [known, setKnown] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const passwordRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const last = read(KEYS.lastEmail);
    if (last) {
      setEmail(last);
      setKnown(last);
    }
  }, []);

  // Focus where the typing actually starts: password for a known visitor.
  useEffect(() => {
    if (!ready) return;
    (known ? passwordRef : emailRef).current?.focus();
  }, [ready, known]);

  // Server unreachable: still show the form, with the reason above it.
  if (!ready && !hold && !failed) return <Bars />;

  function forgetIdentity() {
    write(KEYS.lastEmail, null);
    setKnown(null);
    setEmail("");
    setErrors({});
    window.setTimeout(() => emailRef.current?.focus(), 0);
  }

  function trackCaps(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState("CapsLock"));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status) return;
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors<Field>(parsed.error));
      setAttempt((n) => n + 1);
      return;
    }
    setErrors({});
    setHold(true);
    setStatus("starting session…");
    log.push(`→ signing in ${maskEmail(parsed.data.email)}`, "ink");
    const t0 = performance.now();
    try {
      await signIn(parsed.data.email, parsed.data.password);
      await refresh();
      const ms = Math.round(performance.now() - t0);
      write(KEYS.lastEmail, parsed.data.email);
      setStatus(`✓ ready in ${ms} ms`);
      log.push(`✓ session ready in ${ms} ms`, "signal");
      // Long enough to read, short enough not to feel like a delay. The form
      // steps aside just before the board takes over.
      window.setTimeout(() => log.setLeaving(true), 480);
      window.setTimeout(() => {
        const next = safeNext(params.get("next"));
        if (next) router.replace(next);
        else setHold(false);
        log.setLeaving(false);
      }, 700);
    } catch (err) {
      setHold(false);
      setStatus(null);
      setAttempt((n) => n + 1);
      if (isAppwrite(err, 401, "user_invalid_credentials")) {
        setErrors({ password: COPY.badCredentials });
        log.push("✗ password rejected", "brick");
        passwordRef.current?.select();
      } else {
        const message = generalMessage(err);
        setErrors({ form: message });
        log.push(`✗ ${message.split(".")[0]!.toLowerCase()}`, "brick");
      }
    }
  }

  return (
    <>
      <AuthTitle lede="One admin writes. You see it the moment it changes.">
        Open the <em>board</em>.
      </AuthTitle>

      {failed ? (
        <div className="mb-6">
          <FormMessage>{COPY.network}</FormMessage>
        </div>
      ) : null}

      {params.get("reset") === "1" ? (
        <div className="mb-6">
          <FormMessage tone="ok">✓ password updated. Sign in with the new one.</FormMessage>
        </div>
      ) : null}

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {known ? (
          <KnownIdentity email={known} onSwitch={forgetIdentity} />
        ) : (
          <TextField
            ref={emailRef}
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            attempt={attempt}
          />
        )}
        {/* Keeps password managers pairing the password with the right account. */}
        {known ? <input type="hidden" name="email" autoComplete="username" value={known} readOnly /> : null}
        <TextField
          ref={passwordRef}
          label="Password"
          type={reveal ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={trackCaps}
          onKeyUp={trackCaps}
          onBlur={() => setCapsLock(false)}
          error={errors.password}
          attempt={attempt}
          note={
            capsLock ? (
              <p className="font-mono text-[12px] text-amber-ink" role="status">
                ⇪ caps lock is on
              </p>
            ) : null
          }
          aside={
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="font-mono text-[12px] text-muted hover:text-ink"
              aria-pressed={reveal}
            >
              {reveal ? "hide" : "show"}
            </button>
          }
        />
        <FormMessage>{errors.form}</FormMessage>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusButton idle="Sign in" hint="↵" status={status} />
          <Link href="/forgot" className="text-[14px] text-muted underline decoration-rule underline-offset-4 hover:text-ink">
            Forgot your password?
          </Link>
        </div>
      </form>

      <OrRule />
      <GoogleButton />

      <p className="mt-10 border-t border-rule pt-6 text-[14px] text-muted">
        New here?{" "}
        <Link href="/signup" className="text-ink underline decoration-field underline-offset-4 hover:decoration-ink">
          Make an account
        </Link>
        . It takes a minute.
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Bars />}>
      <Login />
    </Suspense>
  );
}
