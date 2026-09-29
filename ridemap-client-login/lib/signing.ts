import { createHmac, timingSafeEqual } from "node:crypto";

const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-change-me-please-0000";

export function getSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("OTP_SECRET must be set to at least 32 characters in production.");
  }
  return DEV_FALLBACK_SECRET;
}

export function hmac(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

/** Constant-time comparison of two base64url HMAC digests. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Serialize a payload as `base64url(json).signature`. */
export function signPayload(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

/** Returns the parsed payload if the signature is valid, otherwise null. */
export function verifyPayload(token: string | undefined): unknown {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, hmac(body))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
