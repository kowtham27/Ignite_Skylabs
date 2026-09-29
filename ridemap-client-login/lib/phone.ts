/** Indian mobile numbers only: 10 digits, starting with 6–9. */
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;
export const E164_INDIA_RE = /^\+91[6-9]\d{9}$/;

/**
 * Reduce any typed or pasted value to at most 10 national digits.
 * Handles "+91 98765 43210", "919876543210", "09876543210", "98765-43210".
 */
export function normalizeIndianPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function isValidIndianMobile(national: string): boolean {
  return INDIAN_MOBILE_RE.test(national);
}

export function toE164(national: string): string {
  return `+91${national}`;
}

/** "9876543210" → "98765 43210" (works on partial input too). */
export function formatNational(national: string): string {
  return national.length > 5 ? `${national.slice(0, 5)} ${national.slice(5)}` : national;
}

/** "+919876543210" or "9876543210" → "+91 98765 43210". */
export function formatForDisplay(phone: string): string {
  return `+91 ${formatNational(normalizeIndianPhone(phone))}`;
}
