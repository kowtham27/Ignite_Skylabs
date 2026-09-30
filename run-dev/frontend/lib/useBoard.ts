"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { acknowledge, getBoard, hasAcked, watchBoard } from "./board";
import { changedWordIndexes, type WordDiff } from "./diff";
import { useConnection, useRefocus } from "./hooks";
import { blockWords, parseBlocks } from "./markdown";
import type { ConnectionStatus } from "./connection";
import { read, write } from "./storage";
import type { Board } from "./types";

const CACHE_KEY = "board-cache";
/** How long changed words stay highlighted (the CSS fade matches). */
export const FRESH_MS = 6500;

export type Fresh = { diff: WordDiff; at: number; version: number };

function diffBoards(prev: Board, next: Board): WordDiff {
  const words = (s: string) => s.split(/\s+/).filter(Boolean);
  return {
    title: changedWordIndexes(words(prev.title), words(next.title)),
    body: changedWordIndexes(blockWords(parseBlocks(prev.body)), blockWords(parseBlocks(next.body))),
  };
}

function readCache(): Board | null {
  try {
    const raw = read(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Board) : null;
  } catch {
    return null;
  }
}

/**
 * Everything the board page needs, in one place: the last known board shown
 * instantly from cache, revalidated, kept live over the socket, caught up
 * after any reconnect or refocus (events can be missed while away), and
 * left on screen when offline.
 */
export function useBoard(userId: string | null, { trackAck = true } = {}) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loaded, setLoaded] = useState(false); // true once the server has answered
  const [error, setError] = useState(false);
  const [fresh, setFresh] = useState<Fresh | null>(null);
  const [seen, setSeen] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0);
  const current = useRef<Board | null>(null);
  const freshTimer = useRef<number | undefined>(undefined);
  const loadedRef = useRef(false); // first server answer is not "news"

  /** Take a board from anywhere (fetch, socket, publish) and decide if it's news. */
  const accept = useCallback((next: Board, { live }: { live: boolean }) => {
    const prev = current.current;
    if (prev && next.version < prev.version) return; // late, out-of-order event
    const isNews = !!prev && next.version > prev.version;
    current.current = next;
    setBoard(next);
    write(CACHE_KEY, JSON.stringify(next));
    if (isNews && live) {
      setFresh({ diff: diffBoards(prev, next), at: Date.now(), version: next.version });
      window.clearTimeout(freshTimer.current);
      freshTimer.current = window.setTimeout(() => setFresh(null), FRESH_MS);
      if (document.visibilityState === "hidden") setUnread((n) => n + 1);
    }
  }, []);

  const revalidate = useCallback(async () => {
    try {
      const b = await getBoard();
      accept(b, { live: current.current !== null && loadedRef.current });
      setLoaded(true);
      loadedRef.current = true;
      setError(false);
    } catch {
      setError(true); // keep showing the last known board
    }
  }, [accept]);

  // 1. last known board, instantly; 2. the real one; 3. live from then on.
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      current.current = cached;
      setBoard(cached);
    }
    void revalidate();
    return watchBoard((b) => accept(b, { live: true }));
  }, [accept, revalidate]);

  const status: ConnectionStatus = useConnection(revalidate);
  useRefocus(revalidate);

  // "(1) run dev" while the tab is in the background and something changed.
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) run dev` : "run dev";
  }, [unread]);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setUnread(0);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Has this reader already tapped "Got it" for the version on screen?
  const version = board?.version ?? 0;
  useEffect(() => {
    if (!trackAck || !userId || version < 1) return;
    let stale = false;
    setSeen(null);
    hasAcked(userId, version)
      .then((v) => !stale && setSeen(v))
      .catch(() => !stale && setSeen(false));
    return () => {
      stale = true;
    };
  }, [trackAck, userId, version]);

  const ack = useCallback(async () => {
    if (!userId || version < 1) return;
    setSeen(true); // optimistic
    try {
      await acknowledge(userId, version);
    } catch {
      setSeen(false);
    }
  }, [userId, version]);

  /** For the admin's optimistic publish: show it now, undo if the server says no. */
  const optimistic = useCallback((next: Board) => {
    const before = current.current;
    current.current = next;
    setBoard(next);
    return () => {
      if (before && current.current === next) {
        current.current = before;
        setBoard(before);
      }
    };
  }, []);

  return { board, loaded, error, status, fresh, seen, ack, optimistic, revalidate };
}
