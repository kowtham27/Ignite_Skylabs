"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { PasswordMeter } from "@/components/auth/PasswordMeter";
import { StatusButton } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { Bars } from "@/components/ui/Skeleton";
import { completeRecovery } from "@/lib/auth";
import { generalMessage, isAppwrite, passwordPolicyMessage } from "@/lib/errors";
import { assessPassword } from "@/lib/password";
import { fieldErrors, resetSchema } from "@/lib/validation";

type Field = "password" | "confirm";

function Expired() {
  return (
    <>
      <AuthTitle lede="Reset links work once, for one hour. Ask for a new one and use the latest email.">
        That link has <em>expired</em>.
      </AuthTitle>
      <Link href="/forgot" className="text-[14px] text-ink underline decoration-field underline-offset-4">
        Send a new link
      </Link>
    </>
  );
}

function Reset() {
  const params = useSearchParams();
  const router = useRouter();
  const userId = params.get("userId");
  const secret = params.get("secret");

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const strength = useMemo(() => assessPassword(form.password), [form.password]);

  if (!userId || !secret || expired) return <Expired />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status || !userId || !secret) return;
    const parsed = resetSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<Field>(parsed.error));
      return;
    }
    setErrors({});
    setStatus("saving…");
    try {
      await completeRecovery(userId, secret, parsed.data.password);
      router.replace("/login?reset=1");
    } catch (err) {
      setStatus(null);
      const policy = passwordPolicyMessage(err);
      if (policy) setErrors({ password: policy });
      else if (isAppwrite(err, 401) || isAppwrite(err, 404)) setExpired(true);
      else setErrors({ form: generalMessage(err) });
    }
  }

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <AuthTitle lede="Pick something you haven't used here before.">
        Choose a new <em>password</em>.
      </AuthTitle>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          autoFocus
          note={form.password ? <PasswordMeter strength={strength} /> : null}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set("confirm")}
          error={errors.confirm}
        />
        <FormMessage>{errors.form}</FormMessage>
        <div>
          <StatusButton idle="Save password" status={status} />
        </div>
      </form>
    </>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<Bars rows={[70, 100, 100, 40]} />}>
      <Reset />
    </Suspense>
  );
}
