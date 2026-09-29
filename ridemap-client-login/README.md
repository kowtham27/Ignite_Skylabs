# Ridemap Client Panel — Login

WhatsApp number + OTP login for the Ridemap client panel, styled to match [ridemap.in](https://ridemap.in).

Built with Next.js 16 (App Router), Tailwind CSS v4, framer-motion and zod.

## Run locally

```bash
npm install
cp .env.example .env.local   # then set OTP_SECRET to 32+ random characters
npm run dev                  # http://localhost:3000/login
```

With `OTP_DEMO_MODE=true`, the generated code appears in a "DEMO" WhatsApp-style toast. Click **Fill code**, use **Paste code**, or type it.

## Environment

| Variable | Purpose |
|---|---|
| `OTP_SECRET` | HMAC key for OTP and session cookies (required in production, 32+ chars) |
| `OTP_DEMO_MODE` | `true` returns the code to the UI for testing. Never enable in production. |
| `OTP_PROVIDER` | `mock` for now. Add `meta` / `msg91` etc. in `lib/otp/provider.ts`. |
| `NEXT_PUBLIC_POST_LOGIN_REDIRECT` | Where to send users after login (default `/`) |

## How it works

- `POST /api/auth/send-otp`: validates the `+91` number, rate-limits (3 per phone and 10 per IP, per 10 min), generates a 6-digit code with `crypto.randomInt`, and stores an HMAC of it in a signed `httpOnly` cookie (`rm_otp`, 5 min).
- `POST /api/auth/verify-otp`: checks expiry and attempts (max 5), compares with `timingSafeEqual`, then sets a signed `rm_session` cookie (7 days).
- Stateless, so it works on Vercel/serverless. The rate limiter is in-memory per instance; use Redis before relying on it in production.

## Plugging in real WhatsApp delivery

Implement `OtpProvider.send()` in a new file under `lib/otp/`, register it in `getOtpProvider()` in [`lib/otp/provider.ts`](lib/otp/provider.ts), then set `OTP_PROVIDER` and `OTP_DEMO_MODE=false`. The comment block in that file covers the Meta WhatsApp Cloud API and MSG91 / Gupshup / Twilio.
