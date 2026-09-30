"use client";

import { ArrowDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * A small "there's more below" arrow, only when the page actually overflows
 * (phones, mostly). It nudges twice, then keeps still; the first scroll
 * retires it for this page.
 */
export function ScrollCue() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let retired = false;
    const check = () => {
      if (retired) return;
      const overflow = document.documentElement.scrollHeight - window.innerHeight > 48;
      setShow(overflow && window.scrollY < 24);
    };
    const onScroll = () => {
      if (window.scrollY > 24) {
        retired = true;
        setShow(false);
      }
    };
    // Content arrives after the session check; look again once it has.
    const late = window.setTimeout(check, 700);
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.clearTimeout(late);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", check);
    };
  }, [pathname]);

  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="Scroll to the rest of the form"
      onClick={() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduced ? "auto" : "smooth" });
      }}
      className="log-line keycap fixed bottom-5 left-1/2 z-20 -ml-5 grid size-10 place-items-center rounded-full border border-field bg-surface text-ink shadow-[0_2px_0_0_var(--lip)]"
    >
      <ArrowDown size={18} strokeWidth={1.5} className="nudge" />
    </button>
  );
}
