"use client";

import { useState } from "react";
import { GoogleG } from "@/components/brand/GoogleG";
import { Button } from "@/components/ui/Button";
import { continueWithGoogle } from "@/lib/auth";
import { useAuthLog } from "./AuthLog";

export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [leaving, setLeaving] = useState(false);
  const log = useAuthLog();
  return (
    <Button
      variant="secondary"
      className="w-full"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        log.push("→ handing off to google", "ink");
        continueWithGoogle();
      }}
    >
      <GoogleG />
      {leaving ? <span className="font-mono text-[13px] font-normal">handing off to google…</span> : label}
    </Button>
  );
}

export function OrRule() {
  return (
    <div className="my-6 flex items-center gap-3 font-mono text-[12px] text-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-rule" />
      or
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}
