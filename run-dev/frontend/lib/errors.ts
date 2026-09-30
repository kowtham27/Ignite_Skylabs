import { AppwriteException } from "appwrite";

export type FieldError<F extends string> = { field: F | "form"; message: string };

export const COPY = {
  network: "Can't reach the server. Check your connection and try again.",
  unknown: "Something went wrong on our side. Try again in a moment.",
  rateLimited: "Too many attempts. Give it a minute, then try again.",
  badCredentials: "That password didn't match. Try again or reset it.",
  blocked: "This account can't sign in right now. Ask the admin.",
} as const;

export function isAppwrite(e: unknown, code?: number, type?: string): e is AppwriteException {
  if (!(e instanceof AppwriteException)) return false;
  if (code !== undefined && e.code !== code) return false;
  if (type !== undefined && e.type !== type) return false;
  return true;
}

/** Errors that aren't about any particular field. */
export function generalMessage(e: unknown): string {
  if (!(e instanceof AppwriteException)) return COPY.network;
  if (e.code === 0) return COPY.network;
  if (e.code === 429) return COPY.rateLimited;
  if (e.type === "user_blocked") return COPY.blocked;
  return COPY.unknown;
}

/**
 * Server-side password policy rejections, translated. Appwrite's error types for
 * these have shifted between versions, so match on both type and message.
 */
export function passwordPolicyMessage(e: unknown): string | null {
  if (!(e instanceof AppwriteException) || e.code !== 400) return null;
  const t = `${e.type} ${e.message}`.toLowerCase();
  if (t.includes("personal")) return "Too close to your name or email. Pick something unrelated.";
  if (t.includes("dictionary") || t.includes("commonly used"))
    return "That one's on the common-passwords list. Pick something less guessable.";
  if (t.includes("recently used")) return "You've used that one before. Pick a new one.";
  if (t.includes("password")) return "Needs at least 10 characters.";
  return null;
}
