"use client";

import { Bold, Italic, Link2, List } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Kbd } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { PublishConflict, publish, type BoardContent } from "@/lib/board";
import { generalMessage } from "@/lib/errors";
import { TONES, type Tone } from "@/lib/schema";
import { read, write } from "@/lib/storage";
import type { Board, User } from "@/lib/types";
import type { Fresh } from "@/lib/useBoard";
import { BoardCard, versionLabel } from "./BoardCard";

const TITLE_MAX = 120;
const BODY_MAX = 5000;
const DRAFT_KEY = "draft";

type Draft = BoardContent & { baseVersion: number };

function sameContent(a: BoardContent, b: BoardContent) {
  return a.title === b.title && a.body === b.body && a.tone === b.tone;
}

function readDraft(): Draft | null {
  try {
    const raw = read(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function AdminView({
  board,
  fresh,
  user,
  optimistic,
}: {
  board: Board;
  fresh: Fresh | null;
  user: User;
  optimistic: (b: Board) => () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Start from a saved draft (survives reloads) or from what's live now.
  // If the board moves on while the admin has no edits, just follow it; a
  // conflict only matters when there's unpublished work to protect.
  const prevBoard = useRef(board);
  useEffect(() => {
    const prev = prevBoard.current;
    prevBoard.current = board;
    const fromBoard = (): Draft => ({ title: board.title, body: board.body, tone: board.tone, baseVersion: board.version });
    setDraft((d) => {
      if (!d) return readDraft() ?? fromBoard();
      if (board.version > d.baseVersion && sameContent(d, prev)) return fromBoard();
      return d;
    });
  }, [board]);

  // Debounced autosave. Only keep a draft that differs from the live board.
  useEffect(() => {
    if (!draft) return;
    const t = window.setTimeout(() => {
      if (sameContent(draft, board) && draft.baseVersion === board.version) {
        write(DRAFT_KEY, null);
        setSavedAt(null);
      } else {
        write(DRAFT_KEY, JSON.stringify(draft));
        setSavedAt(Date.now());
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [draft, board]);

  // While our own publish is in flight the optimistic preview is already one
  // ahead; that isn't someone else moving the board.
  const movedOn = !!draft && !status && board.version > draft.baseVersion;
  const dirty = !!draft && !sameContent(draft, board);

  const onPublish = useCallback(async () => {
    if (!draft || status) return;
    const title = draft.title.trim();
    if (!title) return setError("Give the notice a title first.");
    if (draft.body.length > BODY_MAX) return setError(`The body is over ${BODY_MAX} characters.`);
    if (movedOn) return setConflict(true);
    setError(null);
    setStatus("publishing…");
    const content: BoardContent = { title, body: draft.body.trim(), tone: draft.tone };
    const t0 = performance.now();
    // Readers get it from the socket; the admin sees it immediately.
    const undo = optimistic({
      ...board,
      ...content,
      version: draft.baseVersion + 1,
      updatedById: user.$id,
      updatedByName: user.name,
      $updatedAt: new Date().toISOString(),
    });
    try {
      const v = await publish(content, draft.baseVersion, { id: user.$id, name: user.name || user.email });
      const ms = Math.round(performance.now() - t0);
      write(DRAFT_KEY, null);
      setDraft({ ...content, baseVersion: v });
      setSavedAt(null);
      setStatus(`✓ published ${versionLabel(v)} in ${ms} ms`);
      window.setTimeout(() => setStatus(null), 2600);
    } catch (e) {
      undo();
      setStatus(null);
      if (e instanceof PublishConflict) setConflict(true);
      else setError(generalMessage(e));
    }
  }, [draft, status, movedOn, optimistic, board, user]);

  // Ctrl/Cmd + Enter from anywhere in the composer.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void onPublish();
    }
  };

  if (!draft) return null;
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  /** Wrap the selection (or insert a placeholder) and keep it selected. */
  function wrap(before: string, after: string, placeholder: string) {
    const el = bodyRef.current;
    if (!el || !draft) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const picked = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + picked + after + value.slice(e);
    set({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + picked.length);
    });
  }

  function listify() {
    const el = bodyRef.current;
    if (!el || !draft) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(start, e);
    const lines = block.split("\n");
    const allListed = lines.every((l) => /^- /.test(l));
    const nextBlock = lines.map((l) => (allListed ? l.replace(/^- /, "") : `- ${l}`)).join("\n");
    set({ body: value.slice(0, start) + nextBlock + value.slice(e) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + nextBlock.length);
    });
  }

  function discard() {
    write(DRAFT_KEY, null);
    setDraft({ title: board.title, body: board.body, tone: board.tone, baseVersion: board.version });
    setConflict(false);
    setError(null);
  }

  const preview = { ...board, title: draft.title, body: draft.body, tone: draft.tone };

  return (
    <div className="mx-auto grid max-w-[90rem] gap-10 px-4 pt-10 pb-20 sm:px-8 sm:pt-12 lg:grid-cols-12 lg:gap-12">
      {/* ── composer ── */}
      <section className="lg:col-span-5" aria-label="Composer" onKeyDown={onKeyDown}>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-[32px] leading-none text-ink">
            Write the <em className="italic">notice</em>.
          </h1>
          <span className="font-mono text-[12px] text-muted tabular" aria-live="polite">
            {savedAt ? "draft saved" : dirty ? "editing…" : `live: ${versionLabel(board.version)}`}
          </span>
        </div>

        {movedOn || conflict ? (
          <div role="alert" className="log-line mt-6 rounded-ui border border-amber/50 bg-amber-tint px-4 py-3 text-[14px] text-ink">
            <p>
              <span className="font-mono text-[12px] text-amber-ink">! </span>
              {versionLabel(board.version)} went out while you were editing (you started from{" "}
              {versionLabel(draft.baseVersion)}). Publishing now would overwrite it, so it was held back.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-[12px]">
              <button
                type="button"
                className="text-ink underline decoration-field underline-offset-4"
                onClick={() => {
                  set({ baseVersion: board.version });
                  setConflict(false);
                }}
              >
                keep my text, publish on top of {versionLabel(board.version)}
              </button>
              <button type="button" className="text-muted underline decoration-rule underline-offset-4" onClick={discard}>
                load {versionLabel(board.version)} instead
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="c-title" className="text-[13px] font-medium text-ink">
                Title
              </label>
              <span className={`font-mono text-[12px] tabular ${draft.title.length > TITLE_MAX - 15 ? "text-amber-ink" : "text-muted"}`}>
                {draft.title.length}/{TITLE_MAX}
              </span>
            </div>
            <input
              id="c-title"
              value={draft.title}
              maxLength={TITLE_MAX}
              onChange={(e) => set({ title: e.target.value })}
              className="h-11 w-full rounded-ui border border-field bg-surface px-3 font-display text-[20px] text-ink transition-[border-color] transition-quick hover:border-ink"
              placeholder="What should everyone know?"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="c-body" className="text-[13px] font-medium text-ink">
                Body
              </label>
              <span className={`font-mono text-[12px] tabular ${draft.body.length > BODY_MAX ? "text-brick" : draft.body.length > BODY_MAX - 300 ? "text-amber-ink" : "text-muted"}`}>
                {draft.body.length}/{BODY_MAX}
              </span>
            </div>
            <div className="overflow-hidden rounded-ui border border-field bg-surface transition-[border-color] transition-quick focus-within:border-ink hover:border-ink">
              <div role="toolbar" aria-label="Formatting" className="flex items-center gap-1 border-b border-rule px-1.5 py-1">
                <ToolButton label="Bold" onClick={() => wrap("**", "**", "bold")}>
                  <Bold size={15} strokeWidth={1.5} />
                </ToolButton>
                <ToolButton label="Italic" onClick={() => wrap("*", "*", "italic")}>
                  <Italic size={15} strokeWidth={1.5} />
                </ToolButton>
                <ToolButton label="Link" onClick={() => wrap("[", "](https://)", "link text")}>
                  <Link2 size={15} strokeWidth={1.5} />
                </ToolButton>
                <ToolButton label="List" onClick={listify}>
                  <List size={15} strokeWidth={1.5} />
                </ToolButton>
                <span className="ml-auto pr-1.5 font-mono text-[11px] text-muted">**bold** *italic* - list</span>
              </div>
              <textarea
                id="c-body"
                ref={bodyRef}
                value={draft.body}
                onChange={(e) => set({ body: e.target.value })}
                rows={10}
                className="block min-h-[14rem] w-full resize-y bg-transparent px-3 py-3 text-[15px] leading-7 text-ink outline-none placeholder:text-muted"
                placeholder={"The details. Links, lists and *emphasis* work."}
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink">Tone</legend>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t: Tone) => (
                <label
                  key={t}
                  className={`keycap inline-flex h-9 cursor-pointer items-center rounded-ui border px-3 font-mono text-[12px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
                    draft.tone === t
                      ? "border-ink bg-ink text-paper shadow-[0_2px_0_0_var(--lip)]"
                      : "border-field text-muted shadow-[0_2px_0_0_var(--lip)] hover:text-ink"
                  }`}
                >
                  <input type="radio" name="tone" value={t} checked={draft.tone === t} onChange={() => set({ tone: t })} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>

          <FormMessage>{error}</FormMessage>

          <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-5">
            <Button onClick={onPublish} disabled={!dirty && !status} className="min-w-[11rem]" aria-disabled={!!status}>
              {status ? (
                <span className="font-mono text-[13px] font-normal tabular">{status}</span>
              ) : (
                <>
                  Publish
                  <span aria-hidden="true" className="inline-flex gap-1">
                    <Kbd tone="on-signal">ctrl</Kbd>
                    <Kbd tone="on-signal">↵</Kbd>
                  </span>
                </>
              )}
            </Button>
            {dirty ? (
              <Button variant="quiet" onClick={discard}>
                Discard draft
              </Button>
            ) : (
              <span className="font-mono text-[12px] text-muted">nothing to publish yet</span>
            )}
          </div>
        </div>
      </section>

      {/* ── preview: the very component readers get ── */}
      <section className="lg:col-span-7" aria-label="Preview">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[12px] text-muted">what everyone sees</p>
          {dirty ? <p className="font-mono text-[12px] text-amber-ink">preview · not published</p> : null}
        </div>
        <div className="lg:sticky lg:top-24">
          <BoardCard
            board={preview}
            fresh={dirty ? null : fresh}
            emptyCopy="Nothing published yet. Write the first notice on the left; it goes out to everyone the moment you publish."
            metaOverride={dirty ? `${versionLabel(draft.baseVersion + 1)} · draft · by ${user.name || user.email}` : undefined}
          />
        </div>
      </section>
    </div>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault() /* keep the textarea selection */}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-[4px] text-muted hover:bg-ink/[0.06] hover:text-ink"
    >
      {children}
    </button>
  );
}
