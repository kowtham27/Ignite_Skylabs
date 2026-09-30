"use client";

import { AdminView } from "@/components/board/AdminView";
import { ReaderView } from "@/components/board/ReaderView";
import { TopBar } from "@/components/board/TopBar";
import { FormMessage } from "@/components/ui/Field";
import { isAdmin, signOut } from "@/lib/auth";
import { COPY } from "@/lib/errors";
import { usePresence } from "@/lib/presence";
import { useGuard, useSession } from "@/lib/session";
import { useBoard } from "@/lib/useBoard";

function BoardSkeleton() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 pt-14 sm:px-8 lg:grid lg:grid-cols-12 lg:gap-8">
      <div role="status" aria-label="Loading the board" className="lg:col-span-7 lg:col-start-2">
        <div className="rounded-ui border border-rule bg-surface px-10 pt-10 pb-8">
          <div className="h-6 w-20 rounded-tag bg-rule/70" />
          <div className="mt-6 h-10 w-3/4 rounded-ui bg-rule/70" />
          <div className="mt-6 space-y-3">
            <div className="h-4 w-full rounded-ui bg-rule/50" />
            <div className="h-4 w-11/12 rounded-ui bg-rule/50" />
            <div className="h-4 w-2/3 rounded-ui bg-rule/50" />
          </div>
        </div>
        <p className="mt-4 font-mono text-[12px] text-muted">fetching the board…</p>
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { refresh } = useSession();
  const { ready, user } = useGuard(["board"]);
  const admin = isAdmin(user);
  const { board, loaded, error, status, fresh, seen, ack, optimistic } = useBoard(ready ? user!.$id : null, {
    trackAck: !admin,
  });
  const here = usePresence(ready && user ? { $id: user.$id, name: user.name } : null);

  if (!ready || !user) {
    return (
      <div className="min-h-dvh">
        <div className="h-14 border-b border-rule" />
        <BoardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <TopBar
        status={status}
        here={here}
        user={{ name: user.name, email: user.email }}
        role={admin ? "admin" : "reader"}
        onSignOut={async () => {
          await signOut();
          await refresh().catch(() => {});
        }}
      />
      {!board ? (
        error && !loaded ? (
          <div className="mx-auto max-w-[40rem] px-4 pt-14">
            <FormMessage>{COPY.network}</FormMessage>
          </div>
        ) : (
          <BoardSkeleton />
        )
      ) : admin ? (
        <AdminView board={board} fresh={fresh} user={user} optimistic={optimistic} />
      ) : (
        <ReaderView board={board} fresh={fresh} status={status} here={here} seen={seen} onAck={ack} />
      )}
    </div>
  );
}
