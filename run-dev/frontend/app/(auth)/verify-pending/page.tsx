"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { Bars } from "@/components/ui/Skeleton";
import { sendVerification, signOut } from "@/lib/auth";
import { COPY, generalMessage } from "@/lib/errors";
import { useCooldown, useRefocus } from "@/lib/hooks";
import { useGuard, useSession } from "@/lib/session";
import { KEYS } from "@/lib/storage";
import { mmss } from "@/lib/time";

const COOLDOWN_S = 60;

export default function VerifyPendingPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const { ready, failed, user } = useGuard(["verify-pending"]);
  const cooldown = useCooldown(KEYS.verifySentAt, COOLDOWN_S);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  // Clicked the link in another tab? Moving back here is enough to move on.
  useRefocus(useCallback(() => void refresh().catch(() => {}), [refresh]));

  if (failed) return <FormMessage>{COPY.network}</FormMessage>;
  if (!ready || !user) return <Bars rows={[70, 100, 40]} />;

  async function resend() {
    if (cooldown.remaining > 0 || sending) return;
    setSending(true);
    setNote(null);
    try {
      await sendVerification();
      cooldown.start();
      setNote({ tone: "ok", text: "✓ sent. The newest link is the one that works." });
    } catch (err) {
      setNote({ tone: "error", text: generalMessage(err) });
    } finally {
      setSending(false);
    }
  }

  async function startOver() {
    await signOut();
    await refresh().catch(() => {});
    router.replace("/signup");
  }

  const waiting = cooldown.remaining > 0;

  return (
    <>
      <AuthTitle
        lede={
          <>
            We sent a confirmation link to <span className="font-medium text-ink">{user.email}</span>. Open it on any
            device and this page will move on by itself when you come back.
          </>
        }
      >
        Check your <em>inbox</em>.
      </AuthTitle>

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="secondary" onClick={resend} disabled={waiting || sending} aria-live="polite">
          {sending ? (
            <span className="font-mono text-[13px] font-normal">sending…</span>
          ) : waiting ? (
            <span className="font-mono text-[13px] font-normal tabular">resend in {mmss(cooldown.remaining)}</span>
          ) : (
            "Resend the email"
          )}
        </Button>
        <p className="font-mono text-[12px] text-muted">not there? check spam.</p>
      </div>

      <div className="mt-4">
        <FormMessage tone={note?.tone}>{note?.text}</FormMessage>
      </div>

      <p className="mt-10 border-t border-rule pt-6 text-[14px] text-muted">
        Wrong email?{" "}
        <button
          type="button"
          onClick={startOver}
          className="text-ink underline decoration-field underline-offset-4 hover:decoration-ink"
        >
          Start over
        </button>
        .
      </p>
    </>
  );
}
