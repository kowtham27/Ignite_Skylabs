"use client";

import { useEffect, useRef, useState } from "react";
import { Mark } from "@/components/brand/Mark";
import type { ConnectionStatus } from "@/lib/connection";

const STATUS: Record<ConnectionStatus, { text: string; cls: string }> = {
  connecting: { text: "◌ connecting…", cls: "text-muted" },
  live: { text: "● live", cls: "text-signal" },
  reconnecting: { text: "◌ reconnecting…", cls: "text-amber-ink" },
  offline: { text: "○ offline, showing last known", cls: "text-brick" },
};

export function ConnectionLine({ status, className = "" }: { status: ConnectionStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span role="status" className={`font-mono text-[12px] whitespace-nowrap ${s.cls} ${className}`}>
      {s.text}
    </span>
  );
}

export function TopBar({
  status,
  here,
  user,
  role,
  onSignOut,
}: {
  status: ConnectionStatus;
  here: number | null;
  user: { name: string; email: string };
  role: "admin" | "reader";
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Mark size={22} className="text-signal" />
          <span className="font-display text-[22px] leading-none text-ink italic">the board</span>
        </div>
        <span aria-hidden="true" className="hidden h-4 w-px bg-rule sm:block" />
        <ConnectionLine status={status} className="hidden sm:inline" />
        {here !== null ? (
          <span className="hidden font-mono text-[12px] text-muted tabular md:inline">
            {here} here now
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          <ConnectionLine status={status} className="sm:hidden" />
          <UserMenu user={user} role={role} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}

function UserMenu({
  user,
  role,
  onSignOut,
}: {
  user: { name: string; email: string };
  role: "admin" | "reader";
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const initial = (user.name || user.email).trim()[0] ?? "?";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-ui py-1 pr-1 pl-1 hover:bg-ink/[0.05]"
      >
        <span className="grid size-7 place-items-center rounded-[4px] bg-signal font-mono text-[12px] font-medium text-on-signal uppercase">
          {initial}
        </span>
        <span className="hidden max-w-[12rem] truncate text-[14px] text-ink sm:inline">{user.name || user.email}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="log-line absolute top-full right-0 mt-2 w-64 rounded-ui border border-rule bg-surface p-1 shadow-[0_12px_30px_-18px_rgb(0_0_0/0.4)]"
        >
          <div className="border-b border-rule px-3 pt-2 pb-3">
            <p className="truncate text-[14px] text-ink">{user.name || "—"}</p>
            <p className="truncate font-mono text-[12px] text-muted">{user.email}</p>
            <p className="mt-2 font-mono text-[11px] text-muted uppercase">{role === "admin" ? "admin · can edit" : "reader"}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="mt-1 w-full rounded-[4px] px-3 py-2 text-left text-[14px] text-ink hover:bg-ink/[0.05]"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
