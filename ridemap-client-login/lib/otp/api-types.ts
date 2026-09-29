export type SendOtpResponse =
  | { ok: true; expiresAt: number; resendAt: number; demoOtp?: string }
  | { ok: false; code: "INVALID_PHONE" | "RATE_LIMITED" | "SEND_FAILED"; message: string };

export type VerifyOtpErrorCode =
  | "INVALID_REQUEST"
  | "NO_CHALLENGE"
  | "EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "INCORRECT"
  | "RATE_LIMITED";

export type VerifyOtpResponse =
  | { ok: true; redirectTo: string }
  | { ok: false; code: VerifyOtpErrorCode; message: string; attemptsLeft?: number };
