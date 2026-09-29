"use client";

import { useEffect, useRef } from "react";
import { useCursorEffects } from "@/lib/use-media-query";

const GAP = 28; // dot grid spacing (px)
const RADIUS = 150; // cursor influence radius (px)
const PING_EVERY = 70; // px of mouse travel between pings
const PING_LIFE = 700; // ms
const MAX_PINGS = 24;
const LIME = "167, 233, 47";

interface Ping {
  x: number;
  y: number;
  born: number;
}

/**
 * Full-screen canvas behind the page: a map-style dot grid whose dots swell and glow
 * near the cursor, a soft lime spotlight, and GPS-style pings that pop up along the
 * mouse path. Runs only on fine pointers with motion allowed, and idles when still.
 */
export function CursorField() {
  const enabled = useCursorEffects();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!enabled || !canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    const target = { x: -9999, y: -9999 };
    const pos = { x: -9999, y: -9999 };
    let presence = 0; // 0 → cursor away, 1 → cursor on page
    let present = false;
    let travelled = 0;
    let last: { x: number; y: number } | null = null;
    const pings: Ping[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      // Spotlight
      if (presence > 0.01) {
        const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 320);
        g.addColorStop(0, `rgba(${LIME}, ${0.11 * presence})`);
        g.addColorStop(1, `rgba(${LIME}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(pos.x - 320, pos.y - 320, 640, 640);
      }

      // Dot grid
      for (let y = GAP / 2; y < height; y += GAP) {
        for (let x = GAP / 2; x < width; x += GAP) {
          const d = Math.hypot(x - pos.x, y - pos.y);
          const t = d < RADIUS ? (1 - d / RADIUS) * presence : 0;
          const ease = t * t;
          ctx.beginPath();
          ctx.arc(x, y, 0.9 + ease * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = t > 0 ? `rgba(${LIME}, ${0.1 + ease * 0.75})` : "rgba(255, 255, 255, 0.07)";
          ctx.fill();
        }
      }

      // Pings: a dot that pops then a ring that expands and fades
      for (let i = pings.length - 1; i >= 0; i--) {
        const p = pings[i];
        const age = (now - p.born) / PING_LIFE;
        if (age >= 1) {
          pings.splice(i, 1);
          continue;
        }
        const pop = age < 0.25 ? age / 0.25 : 1 - (age - 0.25) / 0.75;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 * pop, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${LIME}, ${0.9 * pop})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + age * 26, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${LIME}, ${0.55 * (1 - age)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    const tick = () => {
      const now = performance.now();
      pos.x += (target.x - pos.x) * 0.2;
      pos.y += (target.y - pos.y) * 0.2;
      presence += ((present ? 1 : 0) - presence) * 0.12;
      draw(now);

      const settled =
        Math.abs(target.x - pos.x) < 0.3 &&
        Math.abs(target.y - pos.y) < 0.3 &&
        Math.abs((present ? 1 : 0) - presence) < 0.01 &&
        pings.length === 0;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!present) {
        pos.x = e.clientX;
        pos.y = e.clientY;
      }
      present = true;
      target.x = e.clientX;
      target.y = e.clientY;
      if (last) travelled += Math.hypot(e.clientX - last.x, e.clientY - last.y);
      last = { x: e.clientX, y: e.clientY };
      if (travelled >= PING_EVERY) {
        travelled = 0;
        pings.push({ x: e.clientX, y: e.clientY, born: performance.now() });
        if (pings.length > MAX_PINGS) pings.shift();
      }
      wake();
    };

    const onLeave = () => {
      present = false;
      last = null;
      wake();
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className="fixed inset-0" aria-hidden="true" />;
}
