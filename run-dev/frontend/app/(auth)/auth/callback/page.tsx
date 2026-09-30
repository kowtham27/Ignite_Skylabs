"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { Bars } from "@/components/ui/Skeleton";
import { currentUser, finishOAuth, sendVerification } from "@/lib/auth";
import { STEP_PATH, useSession } from "@/lib/session";
import { KEYS, write } from "@/lib/storage";

function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useSession();
  const [line, setLine] = useState("exchanging token…");
  const started = useRef(false); // the OAuth secret is single-use

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const userId = params.get("userId");
    const secret = params.get("secret");
    if (!userId || !secret) {
      router.replace("/auth/failed");
      return;
    }
    (async () => {
      try {
        await finishOAuth(userId, secret);
        const me = await currentUser();
        if (!me) throw new Error("no session after OAuth");
        if (me.email) write(KEYS.lastEmail, me.email);
        // Google usually vouches for the address and Appwrite marks it verified.
        // If not, fall back to our own verification email.
        if (!me.emailVerification) {
          setLine("sending verification…");
          await sendVerification();
          write(KEYS.verifySentAt, String(Date.now()));
        }
        setLine(`✓ signed in as ${me.email}`);
        const step = await refresh();
        router.replace(STEP_PATH[step]);
      } catch {
        router.replace("/auth/failed");
      }
    })();
  }, [params, refresh, router]);

  return (
    <>
      <AuthTitle>Back from <em>Google</em>.</AuthTitle>
      <p role="status" className="font-mono text-[13px] text-muted">
        {line}
      </p>
    </>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<Bars rows={[70, 40]} />}>
      <Callback />
    </Suspense>
  );
}
