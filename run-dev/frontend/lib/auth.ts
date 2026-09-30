import { ID, OAuthProvider } from "appwrite";
import { account, client, endpointHost, resetRealtime } from "./appwrite";
import { isAppwrite } from "./errors";
import { LABELS } from "./schema";
import type { Prefs, User } from "./types";

function origin(): string {
  return window.location.origin;
}

/** The signed-in user, or null for guests. Any other failure is rethrown. */
export async function currentUser(): Promise<User | null> {
  try {
    return await account.get<Prefs>();
  } catch (e) {
    if (isAppwrite(e, 401)) return null;
    throw e;
  }
}

/** One round trip to Appwrite, timed. Works signed out. */
export async function pingServer(): Promise<{ host: string; ms: number }> {
  const t0 = performance.now();
  await client.ping();
  return { host: endpointHost, ms: Math.round(performance.now() - t0) };
}

export function isAdmin(user: User | null): boolean {
  return !!user?.labels.includes(LABELS.admin);
}

/**
 * Mirrors the board table permission: read → label:admin, users/verified.
 * This only picks the route; the database enforces the same rule.
 */
export function canReadBoard(user: User | null): boolean {
  return !!user && (user.labels.includes(LABELS.admin) || user.emailVerification);
}

export async function signIn(email: string, password: string): Promise<void> {
  try {
    await account.createEmailPasswordSession({ email, password });
  } catch (e) {
    // A stale session in this browser blocks a new one. Drop it and retry once.
    if (isAppwrite(e, 401, "user_session_already_exists")) {
      await signOut();
      await account.createEmailPasswordSession({ email, password });
      return;
    }
    throw e;
  }
}

export async function signUp(
  input: { name: string; email: string; password: string },
  onProgress: (status: string) => void = () => {},
): Promise<void> {
  onProgress("creating account…");
  await account.create({ userId: ID.unique(), ...input });
  onProgress("starting session…");
  await signIn(input.email, input.password);
  onProgress("sending verification…");
  await sendVerification();
}

export async function sendVerification(): Promise<void> {
  await account.createEmailVerification({ url: `${origin()}/verify` });
}

export async function confirmVerification(userId: string, secret: string): Promise<void> {
  await account.updateEmailVerification({ userId, secret });
}

/**
 * Google via OAuth2 *token* rather than OAuth2 session: Appwrite redirects back
 * with userId + secret and we create the session from this origin. That avoids
 * relying on a third-party cookie from the Appwrite host, which browsers
 * increasingly block even on localhost.
 */
export function continueWithGoogle(): void {
  account.createOAuth2Token({
    provider: OAuthProvider.Google,
    success: `${origin()}/auth/callback`,
    failure: `${origin()}/auth/failed`,
  });
}

export async function finishOAuth(userId: string, secret: string): Promise<void> {
  try {
    await account.createSession({ userId, secret });
  } catch (e) {
    if (isAppwrite(e, 401, "user_session_already_exists")) {
      await signOut();
      await account.createSession({ userId, secret });
      return;
    }
    throw e;
  }
}

export async function requestRecovery(email: string): Promise<void> {
  await account.createRecovery({ email, url: `${origin()}/reset` });
}

export async function completeRecovery(userId: string, secret: string, password: string): Promise<void> {
  await account.updateRecovery({ userId, secret, password });
}

export async function updateName(name: string): Promise<void> {
  await account.updateName({ name });
}

export async function signOut(): Promise<void> {
  await resetRealtime();
  try {
    await account.deleteSession({ sessionId: "current" });
  } catch (e) {
    if (!isAppwrite(e, 401)) throw e;
  }
}
