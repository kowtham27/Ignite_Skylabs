"use client";

import { useEffect, useRef, useState } from "react";
import { onConnection, type ConnectionStatus } from "./connection";
import { read, write } from "./storage";

/** Re-render on an interval so relative times stay honest. */
export function useNow(everyMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(t);
  }, [everyMs]);
  return now;
}

/**
 * A cooldown that survives reloads (stored as a start timestamp), so
 * refreshing the page can't be used to skip it.
 */
export function useCooldown(key: string, seconds: number) {
  const [remaining, setRemaining] = useState(0);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const tick = () => {
      const started = Number(read(key) ?? 0);
      const left = Math.max(0, Math.ceil((started + seconds * 1000 - Date.now()) / 1000));
      setRemaining(left);
      return left;
    };
    if (tick() === 0) return;
    const t = window.setInterval(() => {
      if (tick() === 0) window.clearInterval(t);
    }, 1000);
    return () => window.clearInterval(t);
  }, [key, seconds, epoch]);

  return {
    remaining,
    start: () => {
      write(key, String(Date.now()));
      setEpoch((n) => n + 1);
    },
  };
}

/**
 * Socket status. `onReconnect` fires on every transition back into "live"
 * after a drop, which is when missed events need to be refetched.
 */
export function useConnection(onReconnect?: () => void): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const cb = useRef(onReconnect);
  cb.current = onReconnect;
  useEffect(
    () =>
      onConnection((next, prev) => {
        setStatus(next);
        if (next === "live" && (prev === "reconnecting" || prev === "offline")) cb.current?.();
      }),
    [],
  );
  return status;
}

/** Run `fn` when the tab regains focus or becomes visible. */
export function useRefocus(fn: () => void) {
  const cb = useRef(fn);
  cb.current = fn;
  useEffect(() => {
    const run = () => cb.current();
    const onVis = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", run);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
}
