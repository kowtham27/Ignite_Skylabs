import { z } from "zod";
import { hmac, safeEqual, signPayload, verifyPayload } from "@/lib/signing";

export const OTP_COOKIE = "rm_otp";
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 30 * 1000;

const challengeSchema = z.object({
  phone: z.string(),
  expiresAt: z.number(),
  attempts: z.number().int().min(0),
  hash: z.string(),
});

export type OtpChallenge = z.infer<typeof challengeSchema>;

function hashOtp(phone: string, otp: string, expiresAt: number): string {
  return hmac(`${phone}|${otp}|${expiresAt}`);
}

export function createChallenge(phone: string, otp: string, now = Date.now()): OtpChallenge {
  const expiresAt = now + OTP_TTL_MS;
  return { phone, expiresAt, attempts: 0, hash: hashOtp(phone, otp, expiresAt) };
}

export function encodeChallenge(challenge: OtpChallenge): string {
  return signPayload(challenge);
}

export function decodeChallenge(token: string | undefined): OtpChallenge | null {
  const parsed = challengeSchema.safeParse(verifyPayload(token));
  return parsed.success ? parsed.data : null;
}

export function otpMatches(challenge: OtpChallenge, otp: string): boolean {
  return safeEqual(challenge.hash, hashOtp(challenge.phone, otp, challenge.expiresAt));
}
