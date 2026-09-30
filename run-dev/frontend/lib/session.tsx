"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SetupNeeded } from "@/components/SetupNeeded";
import { missingConfig } from "./appwrite";
import { canReadBoard, currentUser } from "./auth";
import type { User } from "./types";

/** Where a person is in the funnel. Every route maps to exactly one of these. */
export type Step = "anon" | "verify-pending" | "board";

export const STEP_PATH: Record<Step, string> = {
  anon: "/login",
  "verify-pending": "/verify-pending",
  board: "/board",
};

type SessionState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; user: User | null; step: Step };

type SessionContextValue = {
  state: SessionState;
  /** Re-reads the account. Call after anything that could move the user a step. */
  refresh: () => Promise<Step>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function stepFor(user: User | null): Step {
  if (!user) return "anon";
  // No approval step: a confirmed email is enough to read. Google accounts
  // arrive already verified, so they skip straight to the board.
  if (canReadBoard(user)) return "board";
  return "verify-pending";
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const inflight = useRef<Promise<Step> | null>(null);

  const refresh = useCallback(() => {
    // Collapse concurrent refreshes (focus + realtime reconnect can fire together).
    inflight.current ??= (async () => {
      try {
        const user = await currentUser();
        const step = stepFor(user);
        setState({ status: "ready", user, step });
        return step;
      } catch {
        setState((prev) => (prev.status === "ready" ? prev : { status: "error" }));
        throw new Error("session check failed");
      } finally {
        inflight.current = null;
      }
    })();
    return inflight.current;
  }, []);

  useEffect(() => {
    if (missingConfig.length) return;
    refresh().catch(() => {});
  }, [refresh]);

  const value = useMemo(() => ({ state, refresh }), [state, refresh]);
  if (missingConfig.length) return <SetupNeeded missing={missingConfig} />;
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/**
 * Declare which steps may see this page. Anyone else is sent to their own step.
 * Returns `ready` only once we know the user belongs here, so the wrong page
 * never flashes. `hold` pauses the redirect (e.g. to show "ready in 412 ms").
 */
export function useGuard(allowed: Step[], opts: { hold?: boolean } = {}) {
  const { state } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const step = state.status === "ready" ? state.step : null;
  const allowedHere = step !== null && allowed.includes(step);

  useEffect(() => {
    if (step === null || allowedHere || opts.hold) return;
    const target = STEP_PATH[step];
    if (target !== pathname) router.replace(target);
  }, [step, allowedHere, opts.hold, pathname, router]);

  return {
    ready: allowedHere,
    failed: state.status === "error",
    user: state.status === "ready" ? state.user : null,
  };
}
