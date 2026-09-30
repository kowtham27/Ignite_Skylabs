"use client";

import { useEffect, useState } from "react";
import { KEYS, read, write } from "@/lib/storage";
import { logToneClass, useAuthLog } from "./AuthLog";

type Line = { text: string; tone: "ink" | "muted" | "signal" };

const LINES: Line[] = [
  { text: "run dev 1.0.0", tone: "ink" },
  { text: "- local:    you", tone: "muted" },
  { text: "- network:  everyone on the board", tone: "muted" },
  { text: "✓ ready", tone: "signal" },
];
const TOTAL = LINES.reduce((n, l) => n + l.text.length, 0);
const CHAR_MS = 18;

const toneClass = { ink: "text-ink", muted: "text-muted", signal: "text-signal" } as const;

/**
 * Types out once, on the very first visit. After that (or with reduced motion)
 * it's simply there, like a server that's already running.
 */
export function BootLog() {
  // null = not decided yet (pre-mount); render nothing to avoid a full → empty flash.
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || read(KEYS.booted)) {
      setShown(TOTAL);
      return;
    }
    write(KEYS.booted, "1");
    let n = 0;
    setShown(0);
    const timer = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= TOTAL) window.clearInterval(timer);
    }, CHAR_MS);
    return () => window.clearInterval(timer);
  }, []);

  const { lines } = useAuthLog();
  const booted = shown === TOTAL;

  let budget = shown ?? 0;
  return (
    <div className="min-h-[16rem]">
      <p className="sr-only">run dev 1.0.0. Local: you. Network: everyone on the board. Ready.</p>
      <pre aria-hidden="true" className="font-mono text-[13px] leading-[1.9] whitespace-pre">
        {LINES.map((line, i) => {
          const visible = line.text.slice(0, Math.max(0, budget));
          budget -= line.text.length;
          if (!visible) return null;
          return (
            <span key={i} className={`block ${toneClass[line.tone]}`}>
              {visible}
            </span>
          );
        })}
        {/* Live lines wait for the boot to finish, so the story reads in order. */}
        {booted && lines.length > 0 ? (
          <span className="mt-3 block border-t border-rule pt-3">
            {lines.map((l) => (
              <span key={l.id} className={`log-line block ${logToneClass[l.tone]}`}>
                {l.text}
              </span>
            ))}
          </span>
        ) : null}
      </pre>
    </div>
  );
}
