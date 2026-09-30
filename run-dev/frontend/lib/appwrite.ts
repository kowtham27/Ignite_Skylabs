// The only module that constructs SDK objects. Components go through lib/auth.ts,
// lib/board.ts etc., never through this file directly.
import { Account, Client, Presences, Realtime, TablesDB } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim();
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID?.trim();

/** Env vars the browser needs but didn't get. Empty when configured. */
export const missingConfig: string[] = [
  ...(endpoint ? [] : ["NEXT_PUBLIC_APPWRITE_ENDPOINT"]),
  ...(projectId ? [] : ["NEXT_PUBLIC_APPWRITE_PROJECT_ID"]),
];

// With config missing we still build a client (so imports don't crash) but
// SessionProvider renders the setup screen instead of making any calls.
export const client = new Client()
  .setEndpoint(endpoint || "http://localhost/v1")
  .setProject(projectId || "unconfigured");
export const account = new Account(client);
export const tables = new TablesDB(client);
export const presences = new Presences(client);

// One socket for the whole app; every subscription multiplexes over it.
let realtimeInstance: Realtime | null = null;
export function realtime(): Realtime {
  realtimeInstance ??= new Realtime(client);
  return realtimeInstance;
}

/**
 * The socket authenticates once, when it opens. After sign-out (or switching
 * account) close it, so the next subscription opens a fresh one as the new
 * user instead of carrying the old user's permissions.
 */
export async function resetRealtime(): Promise<void> {
  const rt = realtimeInstance;
  realtimeInstance = null;
  await rt?.disconnect().catch(() => {});
}

/** "sgp.cloud.appwrite.io", for status lines. */
export const endpointHost = (() => {
  try {
    return new URL(endpoint ?? "").hostname;
  } catch {
    return "appwrite";
  }
})();
