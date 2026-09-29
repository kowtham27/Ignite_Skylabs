"use client";

import { useSyncExternalStore } from "react";

/** Hydration-safe media query: the server snapshot is `false`, then the client re-renders with the real value. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** True on mouse/trackpad devices with motion allowed — the only place cursor effects run. */
export const useCursorEffects = () =>
  useMediaQuery("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
