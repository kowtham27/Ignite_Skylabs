"use client";

import type { Channel, RealtimeResponseEvent } from "appwrite";
import { realtime } from "./appwrite";

export type ConnectionStatus = "connecting" | "live" | "reconnecting" | "offline";

type Listener = (status: ConnectionStatus, previous: ConnectionStatus) => void;

let status: ConnectionStatus = "connecting";
/** Whether the socket itself is up. A short network blip can leave it open. */
let socketOpen = false;
let wiredSocket: object | null = null;
let windowWired = false;
const listeners = new Set<Listener>();

function set(next: ConnectionStatus) {
  if (next === status) return;
  const prev = status;
  status = next;
  for (const l of listeners) l(next, prev);
}

/**
 * Realtime's onOpen/onClose have no "off", so hook each socket instance
 * exactly once and fan out. A new instance appears after sign-out
 * (resetRealtime), so compare instances rather than using a boolean.
 */
function wire() {
  const rt = realtime();
  if (rt !== wiredSocket) {
    wiredSocket = rt;
    rt.onOpen(() => {
      socketOpen = true;
      set("live");
    });
    rt.onClose(() => {
      socketOpen = false;
      set(navigator.onLine ? "reconnecting" : "offline");
    });
    // No onError → status. The SDK reports both socket errors and refused
    // requests (e.g. a 401 on one message) through onError, while the socket
    // itself stays up. Real disconnects always end in onClose.
  }
  if (!windowWired) {
    windowWired = true;
    window.addEventListener("offline", () => set("offline"));
    // Back online: if the socket rode out the blip we're simply live again
    // (and the "live" transition triggers a catch-up refetch). Otherwise the
    // SDK is reconnecting and onOpen will flip us to live.
    window.addEventListener("online", () => set(socketOpen ? "live" : "reconnecting"));
  }
}

/**
 * Subscribe to socket status. The callback receives the previous status too,
 * so callers can refetch on any transition back into "live" (missed events).
 */
export function onConnection(listener: Listener): () => void {
  wire();
  listeners.add(listener);
  listener(status, status);
  return () => {
    listeners.delete(listener);
  };
}

type AnyChannel = string | Channel<unknown>;

/**
 * The one way the app subscribes: always over the shared socket, always wired
 * for status. Returns a plain unsubscribe that is safe to call before the
 * subscription has finished opening (React effects clean up early).
 */
export function subscribe<T>(
  channels: AnyChannel | AnyChannel[],
  onEvent: (event: RealtimeResponseEvent<T>) => void,
): () => void {
  wire();
  let cancelled = false;
  let stop: (() => Promise<void>) | null = null;
  const list = Array.isArray(channels) ? channels : [channels];
  realtime()
    .subscribe<T>(list as Parameters<ReturnType<typeof realtime>["subscribe"]>[0] & unknown[], onEvent)
    .then((sub) => {
      if (cancelled) void sub.unsubscribe();
      else stop = sub.unsubscribe;
    })
    .catch(() => set(navigator.onLine ? "reconnecting" : "offline"));
  return () => {
    cancelled = true;
    void stop?.();
  };
}
