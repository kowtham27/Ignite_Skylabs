"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { pingServer } from "@/lib/auth";

export type LogTone = "ink" | "muted" | "signal" | "brick";
export type LogLine = { id: number; text: string; tone: LogTone };

type AuthLogValue = {
  lines: LogLine[];
  push: (text: string, tone?: LogTone) => void;
  /** True for the moment between "signed in" and the board opening. */
  leaving: boolean;
  setLeaving: (v: boolean) => void;
};

const AuthLogContext = createContext<AuthLogValue | null>(null);

const MAX_LINES = 6;

/**
 * The panel's log keeps going after "✓ ready": the forms write to it, so the
 * left column narrates what the right column is doing, the way a dev server
 * logs requests.
 */
export function AuthLogProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [leaving, setLeaving] = useState(false);
  const nextId = useRef(0);
  const pinged = useRef(false);

  const push = useCallback((text: string, tone: LogTone = "muted") => {
    setLines((prev) => [...prev, { id: nextId.current++, text, tone }].slice(-MAX_LINES));
  }, []);

  // One real round trip on arrival, so "server" shows a measured number
  // instead of a claim. Once per page load; nothing repeats.
  useEffect(() => {
    if (pinged.current) return;
    pinged.current = true;
    pingServer()
      .then(({ host, ms }) => push(`- server:   ${host} · ${ms} ms`, "muted"))
      .catch(() => push("✗ server unreachable", "brick"));
  }, [push]);

  const value = useMemo(() => ({ lines, push, leaving, setLeaving }), [lines, push, leaving]);
  return <AuthLogContext.Provider value={value}>{children}</AuthLogContext.Provider>;
}

/** Safe outside the provider (returns a no-op), so shared components can log freely. */
export function useAuthLog(): AuthLogValue {
  return useContext(AuthLogContext) ?? { lines: [], push: () => {}, leaving: false, setLeaving: () => {} };
}

export const logToneClass: Record<LogTone, string> = {
  ink: "text-ink",
  muted: "text-muted",
  signal: "text-signal",
  brick: "text-brick",
};

/** "someone.name@example.com" → "som•••@example.com". The panel is on screen, not private. */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 3)}•••${domain ? `@${domain}` : ""}`;
}

/** Mobile header: the panel is collapsed, so show only the newest line. */
export function LatestLogLine() {
  const { lines } = useAuthLog();
  const last = lines.at(-1);
  // The header is narrow: keep the number, drop the hostname.
  const text = last?.text.replace(/^- server:\s+\S+ · /, "● connected · ") ?? "✓ ready";
  return (
    <span
      aria-hidden="true"
      className={`max-w-[60%] truncate font-mono text-[12px] ${!last || last.text.startsWith("- server") ? "text-signal" : logToneClass[last.tone]}`}
    >
      {text}
    </span>
  );
}

/**
 * The form column. Children settle in one after another (.stagger), and the
 * whole column steps aside (.leaving) once a sign-in succeeds.
 */
export function AuthStage({ children }: { children: React.ReactNode }) {
  const { leaving } = useAuthLog();
  return <div className={`stagger max-w-[26rem] ${leaving ? "leaving" : ""}`}>{children}</div>;
}
