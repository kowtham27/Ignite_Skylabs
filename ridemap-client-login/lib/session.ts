import { z } from "zod";
import { signPayload, verifyPayload } from "@/lib/signing";

export const SESSION_COOKIE = "rm_session";
export const SESSION_TTL_S = 7 * 24 * 60 * 60;

const sessionSchema = z.object({ phone: z.string(), issuedAt: z.number() });
export type Session = z.infer<typeof sessionSchema>;

export function encodeSession(phone: string, now = Date.now()): string {
  return signPayload({ phone, issuedAt: now } satisfies Session);
}

export function decodeSession(token: string | undefined, now = Date.now()): Session | null {
  const parsed = sessionSchema.safeParse(verifyPayload(token));
  if (!parsed.success || now - parsed.data.issuedAt > SESSION_TTL_S * 1000) return null;
  return parsed.data;
}

/** Only allow same-origin relative paths as redirect targets. */
export function postLoginRedirect(): string {
  const target = process.env.NEXT_PUBLIC_POST_LOGIN_REDIRECT ?? "/";
  return target.startsWith("/") && !target.startsWith("//") ? target : "/";
}

export const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
