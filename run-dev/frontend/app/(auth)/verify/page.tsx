"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { FormMessage } from "@/components/ui/Field";
import { Bars } from "@/components/ui/Skeleton";
import { confirmVerification, currentUser } from "@/lib/auth";
import { generalMessage, isAppwrite } from "@/lib/errors";
import { STEP_PATH, useSession } from "@/lib/session";

type State =
  | { kind: "working" }
  | { kind: "done" }
  | { kind: "needs-session"; next: string }
  | { kind: "expired" }
  | { kind: "error"; message: string };

function Verify() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useSession();
  const [state, setState] = useState<State>({ kind: "working" });
  const started = useRef(false); // StrictMode runs effects twice; the secret is single-use.

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const userId = params.get("userId");
    const secret = params.get("secret");
    if (!userId || !secret) {
      setState({ kind: "expired" });
      return;
    }
    (async () => {
      try {
        // Confirming needs a session on this device. Check first so the
        // single-use secret isn't burned on a request that can't succeed.
        const me = await currentUser();
        if (!me || me.$id !== userId) {
          const next = `/verify?${new URLSearchParams({ userId, secret })}`;
          setState({ kind: "needs-session", next });
          return;
        }
        if (!me.emailVerification) await confirmVerification(userId, secret);
        setState({ kind: "done" });
        const step = await refresh();
        window.setTimeout(() => router.replace(STEP_PATH[step]), 600);
      } catch (err) {
        if (isAppwrite(err, 401)) setState({ kind: "expired" });
        else setState({ kind: "error", message: generalMessage(err) });
      }
    })();
  }, [params, refresh, router]);

  switch (state.kind) {
    case "working":
      return (
        <>
          <AuthTitle>Confirming your <em>email</em>.</AuthTitle>
          <p className="font-mono text-[13px] text-muted" role="status">checking the link…</p>
        </>
      );
    case "done":
      return (
        <>
          <AuthTitle>Confirming your <em>email</em>.</AuthTitle>
          <p className="font-mono text-[13px] text-signal" role="status">✓ email confirmed</p>
        </>
      );
    case "needs-session":
      return (
        <>
          <AuthTitle lede="The link is fine. It just needs you signed in on this device to finish.">
            One more <em>step</em>.
          </AuthTitle>
          <Link
            href={`/login?next=${encodeURIComponent(state.next)}`}
            className="inline-flex h-10 items-center rounded-ui bg-signal px-4 text-[14px] font-medium text-on-signal hover:opacity-90"
          >
            Sign in to finish
          </Link>
        </>
      );
    case "expired":
      return (
        <>
          <AuthTitle lede="It may have expired, or a newer one was sent after it. Only the latest link works.">
            That link didn&apos;t <em>work</em>.
          </AuthTitle>
          <Link href="/verify-pending" className="text-[14px] text-ink underline decoration-field underline-offset-4">
            Send a fresh one
          </Link>
        </>
      );
    case "error":
      return (
        <>
          <AuthTitle>Confirming your <em>email</em>.</AuthTitle>
          <FormMessage>{state.message}</FormMessage>
        </>
      );
  }
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Bars rows={[70, 40]} />}>
      <Verify />
    </Suspense>
  );
}
