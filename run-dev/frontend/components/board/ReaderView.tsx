"use client";

import { Button } from "@/components/ui/Button";
import type { ConnectionStatus } from "@/lib/connection";
import { useNow } from "@/lib/hooks";
import { ago } from "@/lib/time";
import type { Board } from "@/lib/types";
import type { Fresh } from "@/lib/useBoard";
import { BoardCard, versionLabel } from "./BoardCard";
import { ConnectionLine } from "./TopBar";

const EMPTY = "Nothing on the board yet. When the admin writes something, it’ll appear here on its own.";

export function ReaderView({
  board,
  fresh,
  status,
  here,
  seen,
  onAck,
}: {
  board: Board;
  fresh: Fresh | null;
  status: ConnectionStatus;
  here: number | null;
  seen: boolean | null;
  onAck: () => void;
}) {
  const now = useNow(30_000);
  const hasNotice = board.version > 0 && !!(board.title.trim() || board.body.trim());

  return (
    <div className="mx-auto grid max-w-[90rem] gap-10 px-4 pt-10 pb-20 sm:px-8 sm:pt-14 lg:grid-cols-12 lg:gap-8">
      <section className="lg:col-span-8 lg:col-start-2 xl:col-span-7 xl:col-start-2" aria-label="The notice">
        <BoardCard board={board} fresh={fresh} emptyCopy={EMPTY} />

        {hasNotice ? (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {seen ? (
              <span className="log-line inline-flex h-10 items-center gap-2 rounded-ui border border-signal/40 px-4 font-mono text-[13px] text-signal">
                ✓ seen
              </span>
            ) : (
              // Not disabled while we check for an earlier ack: acking twice is a no-op.
              <Button onClick={onAck}>
                Got it
              </Button>
            )}
            <p className="text-[14px] text-muted">
              {seen ? `The admin can see you've read ${versionLabel(board.version)}.` : "Lets the admin know you've read this version."}
            </p>
          </div>
        ) : null}
      </section>

      {/* Quiet side column: the facts, in the app's mono voice. */}
      <aside className="lg:col-span-3 lg:col-start-10 xl:col-start-10" aria-label="Board status">
        <dl className="space-y-4 font-mono text-[12px] lg:sticky lg:top-24">
          <div>
            <dt className="text-muted">status</dt>
            <dd className="mt-1">
              <ConnectionLine status={status} />
            </dd>
          </div>
          {here !== null ? (
            <div>
              <dt className="text-muted">readers</dt>
              <dd className="mt-1 text-ink tabular">{here} here now</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">version</dt>
            <dd className="mt-1 text-ink tabular">
              {versionLabel(board.version)}
              {board.version > 0 ? <span className="text-muted"> · {ago(board.$updatedAt, now)}</span> : null}
            </dd>
          </div>
          <div className="border-t border-rule pt-4 text-muted">Only the admin can edit this board.</div>
        </dl>
      </aside>
    </div>
  );
}
