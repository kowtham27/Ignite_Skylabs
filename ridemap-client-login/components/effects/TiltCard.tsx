"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import { useCursorEffects } from "@/lib/use-media-query";

const MAX_TILT = 3; // degrees — subtle, so typing never feels wobbly

/** Tilts toward the cursor and lights up its border where the mouse is. Inert on touch/reduced motion. */
export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useCursorEffects();

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!enabled || !el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    el.style.setProperty("--glow", "1");
    el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * MAX_TILT * 2}deg) rotateY(${(px - 0.5) * MAX_TILT * 2}deg)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--glow", "0");
    el.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`relative transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {children}
      {enabled && (
        <>
          {/* Inner spotlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-card opacity-[var(--glow,0)] transition-opacity duration-300"
            style={{
              background:
                "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(167,233,47,0.07), transparent 45%)",
            }}
          />
          {/* Border highlight: same gradient masked to a 1px ring */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-card p-px opacity-[var(--glow,0)] transition-opacity duration-300"
            style={{
              background:
                "radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(167,233,47,0.75), transparent 60%)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
        </>
      )}
    </div>
  );
}
