import { MockOtpProvider } from "./mock-provider";

export interface OtpProvider {
  send(phoneE164: string, code: string): Promise<void>;
}

/**
 * Adding a real WhatsApp provider
 * -------------------------------
 * 1. Create `lib/otp/<name>-provider.ts` exporting a class that implements `OtpProvider`.
 *    `send()` must resolve only once the provider has accepted the message, and throw on failure
 *    (the send-otp route turns a throw into a 502 for the user).
 *
 *    - Meta WhatsApp Cloud API: POST https://graph.facebook.com/v{N}/{PHONE_NUMBER_ID}/messages
 *      with `type: "template"` using an approved AUTHENTICATION template (copy-code button).
 *      Pass `code` as the body parameter and as the button's `url` parameter.
 *      Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME.
 *    - MSG91 / Gupshup / Twilio WhatsApp: call their WhatsApp template-send endpoint with the
 *      approved OTP template and `code` as the variable. Env: provider API key + template ID.
 *
 * 2. Add a `case` below keyed by `OTP_PROVIDER` (e.g. "meta", "msg91").
 * 3. Set `OTP_PROVIDER=<name>` and `OTP_DEMO_MODE=false` in the environment.
 *
 * Nothing else changes: code generation, hashing, cookies, attempts and rate limits stay as they are.
 */
export function getOtpProvider(): OtpProvider {
  const name = process.env.OTP_PROVIDER ?? "mock";
  switch (name) {
    case "mock":
      return new MockOtpProvider();
    // case "meta":
    //   return new MetaWhatsAppProvider();
    // case "msg91":
    //   return new Msg91WhatsAppProvider();
    default:
      throw new Error(`Unknown OTP_PROVIDER "${name}". Supported: mock`);
  }
}

export function isDemoMode(): boolean {
  return process.env.OTP_DEMO_MODE === "true";
}
