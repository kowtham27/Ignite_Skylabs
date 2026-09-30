"use client";

import type { Fresh } from "@/lib/useBoard";
import { useNow } from "@/lib/hooks";
import type { Tone } from "@/lib/schema";
import { ago } from "@/lib/time";
import { Markdown, Words } from "./Markdown";

export type CardData = {
  title: string;
  body: string;
  tone: Tone;
  version: number;
  updatedByName: string | null;
  $updatedAt?: string;
};

const TONE: Record<Tone, { label: string; cls: string }> = {
  note: { label: "note", cls: "border-rule text-muted" },
  "heads-up": { label: "heads-up", cls: "border-amber/40 bg-amber-tint text-amber-ink" },
  urgent: { label: "urgent", cls: "border-brick/40 bg-brick-tint text-brick" },
};

export function ToneTag({ tone }: { tone: Tone }) {
  const t = TONE[tone];
  return (
    <span className={`inline-flex h-6 items-center rounded-tag border px-2 font-mono text-[11px] tracking-wide uppercase ${t.cls}`}>
      {t.label}
    </span>
  );
}

export function versionLabel(v: number): string {
  return `v${String(v).padStart(2, "0")}`;
}

/**
 * The notice itself. Admin preview and readers render this exact component,
 * so "what everyone sees" is never an approximation.
 */
export function BoardCard({
  board,
  fresh,
  emptyCopy,
  metaOverride,
}: {
  board: CardData;
  fresh?: Fresh | null;
  emptyCopy: string;
  /** Replaces the meta line (the admin preview shows "draft · not published"). */
  metaOverride?: string;
}) {
  const now = useNow(30_000);
  const empty = !board.title.trim() && !board.body.trim();
  const counter = { n: 0 };

  return (
    <article
      key={fresh?.version ?? "steady"} /* remount → one .repin settle per update */
      className={`relative rounded-ui border border-rule bg-surface px-6 pt-8 pb-6 shadow-[0_1px_0_var(--rule),0_18px_40px_-28px_rgb(0_0_0/0.35)] sm:px-10 sm:pt-10 sm:pb-8 ${fresh ? "repin" : ""}`}
    >
      {/* Tape holding the notice to the board. */}
      <span aria-hidden="true" className="absolute -top-2.5 left-8 h-5 w-20 -rotate-[3deg] bg-amber/25 sm:left-12" />

      {empty ? (
        <div className="py-6">
          <p className="max-w-[34ch] font-display text-[26px] leading-[1.25] text-muted">{emptyCopy}</p>
          <p className="mt-6 font-mono text-[12px] text-muted">{metaOverride ?? "v00 · waiting for the first notice"}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <ToneTag tone={board.tone} />
            {fresh ? (
              <span role="status" className="log-line font-mono text-[12px] text-signal">
                ● updated just now
              </span>
            ) : null}
          </div>
          <h2 className="mt-5 font-display text-[34px] leading-[1.1] tracking-[-0.01em] break-words text-ink sm:text-[44px]">
            <Words text={board.title} changed={fresh?.diff.title} counter={counter} />
          </h2>
          {board.body.trim() ? (
            <div className="mt-5">
              <Markdown source={board.body} changed={fresh?.diff.body} />
            </div>
          ) : null}
          <p className="mt-8 border-t border-rule pt-4 font-mono text-[12px] text-muted tabular">
            {metaOverride ??
              [
                versionLabel(board.version),
                board.$updatedAt ? `edited ${ago(board.$updatedAt, now)}` : null,
                board.updatedByName ? `by ${board.updatedByName}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
          </p>
        </>
      )}
    </article>
  );
}
