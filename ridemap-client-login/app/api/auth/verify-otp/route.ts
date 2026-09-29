import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { VerifyOtpResponse } from "@/lib/otp/api-types";
import {
  OTP_COOKIE,
  OTP_MAX_ATTEMPTS,
  decodeChallenge,
  encodeChallenge,
  otpMatches,
} from "@/lib/otp/token";
import { E164_INDIA_RE } from "@/lib/phone";
import { clientIp, consume } from "@/lib/rate-limit";
import {
  SESSION_COOKIE,
  SESSION_TTL_S,
  cookieBase,
  encodeSession,
  postLoginRedirect,
} from "@/lib/session";

const bodySchema = z.object({
  phone: z.string().regex(E164_INDIA_RE),
  otp: z.string().regex(/^\d{6}$/),
});

/**
 * Server-side failure counts per challenge. The cookie also carries `attempts`,
 * but a client could replay an older cookie; this map closes that gap per instance.
 */
const failures = new Map<string, number>();

function json(body: VerifyOtpResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ ok: false, code: "INVALID_REQUEST", message: "Enter the 6-digit code." }, 400);
  }
  const { phone, otp } = parsed.data;

  if (!consume([{ key: `verify:ip:${clientIp(request.headers)}`, max: 30, windowMs: 10 * 60 * 1000 }]).ok) {
    return json(
      { ok: false, code: "RATE_LIMITED", message: "Too many requests. Please try again in a few minutes." },
      429,
    );
  }

  const challenge = decodeChallenge(request.cookies.get(OTP_COOKIE)?.value);
  if (!challenge || challenge.phone !== phone) {
    return json(
      { ok: false, code: "NO_CHALLENGE", message: "Your code is no longer valid. Request a new one." },
      400,
    );
  }

  if (Date.now() > challenge.expiresAt) {
    failures.delete(challenge.hash);
    return json({ ok: false, code: "EXPIRED", message: "This code has expired. Request a new one." }, 410);
  }

  const attempts = Math.max(challenge.attempts, failures.get(challenge.hash) ?? 0);
  if (attempts >= OTP_MAX_ATTEMPTS) {
    return json(
      { ok: false, code: "TOO_MANY_ATTEMPTS", message: "Too many attempts. Request a new code." },
      429,
    );
  }

  if (!otpMatches(challenge, otp)) {
    const next = attempts + 1;
    failures.set(challenge.hash, next);
    const attemptsLeft = OTP_MAX_ATTEMPTS - next;
    const response =
      attemptsLeft > 0
        ? json(
            {
              ok: false,
              code: "INCORRECT",
              message: `Incorrect code. ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} left.`,
              attemptsLeft,
            },
            401,
          )
        : json(
            { ok: false, code: "TOO_MANY_ATTEMPTS", message: "Too many attempts. Request a new code." },
            429,
          );
    response.cookies.set(OTP_COOKIE, encodeChallenge({ ...challenge, attempts: next }), {
      ...cookieBase,
      maxAge: Math.max(1, Math.ceil((challenge.expiresAt - Date.now()) / 1000)),
    });
    return response;
  }

  failures.delete(challenge.hash);
  const response = json({ ok: true, redirectTo: postLoginRedirect() });
  response.cookies.delete(OTP_COOKIE);
  response.cookies.set(SESSION_COOKIE, encodeSession(phone), { ...cookieBase, maxAge: SESSION_TTL_S });
  return response;
}
