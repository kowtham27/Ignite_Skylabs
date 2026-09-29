import { randomInt } from "node:crypto";

export const OTP_LENGTH = 6;

/** Cryptographically secure 6-digit code, zero-padded (e.g. "048213"). */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}
