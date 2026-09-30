"use client";

import { Channel, Permission, Query, Role, type Models } from "appwrite";
import { useCallback, useEffect, useRef, useState } from "react";
import { presences, realtime } from "./appwrite";
import { subscribe } from "./connection";
import { useConnection, useRefocus } from "./hooks";

type Presence = Models.Presence;

/**
 * "N here now", from Appwrite's Presences API. Announced over the realtime
 * socket; Appwrite deletes the record when that socket closes (tab closed,
 * signed out, network gone), so nobody lingers.
 *
 * One record per person: the presence id *is* the user id, and every tab
 * updates the same record (so two tabs still count as one reader).
 * When one tab closes, its socket takes the record with it; any other tab
 * that's still open sees the delete and puts it straight back.
 *
 * Returns null if the server has no Presences API, so the UI can hide it.
 */
export function usePresence(user: { $id: string; name: string } | null): number | null {
  const [records, setRecords] = useState<Map<string, Presence> | null>(null);
  const userId = user?.$id;
  const name = user?.name ?? "";
  const reannounce = useRef<number | undefined>(undefined);

  const announce = useCallback(() => {
    if (!userId) return;
    void realtime()
      .upsertPresence({
        presenceId: userId,
        status: document.hasFocus() ? "online" : "away",
        // Passing permissions replaces Appwrite's default ("creator can do
        // anything"), so the owner's update/delete must be listed explicitly,
        // or every later upsert (focus/blur, other tabs) is refused with 401.
        permissions: [
          Permission.read(Role.users("verified")),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId)),
        ],
        metadata: { name },
      })
      .catch(() => {});
  }, [userId, name]);

  const load = useCallback(async () => {
    try {
      const list = await presences.list({ queries: [Query.limit(100)] });
      setRecords(new Map(list.presences.map((p) => [p.$id, p])));
    } catch {
      setRecords(null); // no Presences API on this server
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    announce();
    void load();
    const stop = subscribe<Presence>(Channel.presences(), (e) => {
      const gone = e.events.some((ev) => ev.endsWith(".delete"));
      setRecords((prev) => {
        const next = new Map(prev ?? []);
        if (gone) next.delete(e.payload.$id);
        else next.set(e.payload.$id, e.payload);
        return next;
      });
      // Our record went with another tab's socket, but this tab is still here.
      if (gone && e.payload.$id === userId) {
        window.clearTimeout(reannounce.current);
        reannounce.current = window.setTimeout(announce, 250);
      }
    });
    const onBlur = () => announce();
    window.addEventListener("blur", onBlur);
    return () => {
      stop();
      window.clearTimeout(reannounce.current);
      window.removeEventListener("blur", onBlur);
    };
  }, [userId, announce, load]);

  // Focus flips status back to online; a reconnect re-announces and resyncs,
  // since the old socket's record was deleted when it dropped.
  useRefocus(announce);
  useConnection(
    useCallback(() => {
      announce();
      void load();
    }, [announce, load]),
  );

  if (!records) return null;
  return new Set([...records.values()].map((p) => p.userId)).size;
}
