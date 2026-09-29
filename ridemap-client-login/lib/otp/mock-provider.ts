import type { OtpProvider } from "./provider";

/**
 * Demo provider: sends nothing. The send-otp route returns the code to the UI
 * only when OTP_DEMO_MODE=true, and this provider logs it only in that case.
 */
export class MockOtpProvider implements OtpProvider {
  async send(phoneE164: string, code: string): Promise<void> {
    if (process.env.OTP_DEMO_MODE === "true") {
      console.info(`[otp:mock] ${code} → ${phoneE164.slice(0, 5)}*****${phoneE164.slice(-2)}`);
    }
  }
}
