// localStorage can throw (private mode, blocked site data). Nothing here is
// load-bearing; every read has a fallback.

const PREFIX = "rundev:";

export const KEYS = {
  lastEmail: "last-email",
  verifySentAt: "verify-sent-at",
  booted: "booted",
} as const;

export function read(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Not worth surfacing.
  }
}
