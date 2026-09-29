import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { SendOtpResponse } from "@/lib/otp/api-types";
import { generateOtp } from "@/lib/otp/generate";
import { getOtpProvider, isDemoMode } from "@/lib/otp/provider";
import {
  OTP_COOKIE,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  createChallenge,
  encodeChallenge,
} from "@/lib/otp/token";
import { E164_INDIA_RE } from "@/lib/phone";
import { clientIp, consume } from "@/lib/rate-limit";
import { cookieBase } from "@/lib/session";

const bodySchema = z.object({ phone: z.string().regex(E164_INDIA_RE) });
const TEN_MIN = 10 * 60 * 1000;

function json(body: SendOtpResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json(
      { ok: false, code: "INVALID_PHONE", message: "Enter a valid 10-digit Indian mobile number" },
      400,
    );
  }
  const { phone } = parsed.data;

  const limited = !consume([
    { key: `send:phone:${phone}`, max: 3, windowMs: TEN_MIN },
    { key: `send:ip:${clientIp(request.headers)}`, max: 10, windowMs: TEN_MIN },
  ]).ok;
  if (limited) {
    return json(
      { ok: false, code: "RATE_LIMITED", message: "Too many requests. Please try again in a few minutes." },
      429,
    );
  }

  const otp = generateOtp();
  try {
    await getOtpProvider().send(phone, otp);
  } catch (error) {
    console.error("[otp] provider send failed", error);
    return json(
      { ok: false, code: "SEND_FAILED", message: "We couldn't send the code right now. Please try again." },
      502,
    );
  }

  const now = Date.now();
  const challenge = createChallenge(phone, otp, now);
  const response = json({
    ok: true,
    expiresAt: challenge.expiresAt,
    resendAt: now + RESEND_COOLDOWN_MS,
    ...(isDemoMode() ? { demoOtp: otp } : {}),
  });
  response.cookies.set(OTP_COOKIE, encodeChallenge(challenge), {
    ...cookieBase,
    maxAge: OTP_TTL_MS / 1000,
  });
  return response;
}
