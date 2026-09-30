export const MIN_PASSWORD = 10;

export type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "too short" | "weak" | "fair" | "good" | "strong";
  hints: string[];
};

const RUNS = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const COMMON = ["password", "letmein", "welcome", "iloveyou", "admin", "rundev", "qwerty"];

function hasRun(pw: string): boolean {
  const s = pw.toLowerCase();
  if (/(.)\1{3,}/.test(s)) return true;
  return RUNS.some((run) => {
    for (let i = 0; i + 4 <= run.length; i++) {
      const chunk = run.slice(i, i + 4);
      if (s.includes(chunk) || s.includes([...chunk].reverse().join(""))) return true;
    }
    return false;
  });
}

/**
 * A plain, explainable estimate. The server runs the real dictionary and
 * personal-data checks; this exists to give specific hints before submit.
 */
export function assessPassword(pw: string, personal: { email?: string; name?: string } = {}): Strength {
  const hints: string[] = [];
  const lower = pw.toLowerCase();

  if (pw.length < MIN_PASSWORD) {
    const left = MIN_PASSWORD - pw.length;
    hints.push(`${left} more character${left === 1 ? "" : "s"} to go.`);
  }

  const personalBits = [
    personal.email?.split("@")[0],
    ...(personal.name?.split(/\s+/) ?? []),
  ].filter((p): p is string => !!p && p.length >= 3);
  const personalHit = personalBits.some((p) => lower.includes(p.toLowerCase()));
  if (personalHit) hints.push("Leave your name and email out of it.");

  const commonHit = COMMON.some((w) => lower.includes(w));
  if (commonHit) hints.push("Skip common words like “password” or “welcome”.");

  const run = hasRun(pw);
  if (run) hints.push("Avoid runs like 1234, aaaa or qwerty.");

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length >= MIN_PASSWORD && pw.length < 16 && classes < 3) {
    hints.push("Mix in a number or symbol, or just make it longer.");
  }

  if (pw.length < MIN_PASSWORD) return { score: 0, label: "too short", hints };

  let score = 1;
  if (pw.length >= 14) score++;
  if (pw.length >= 20) score++;
  if (classes >= 3) score++;
  if (personalHit || commonHit) score = Math.min(score, 1);
  if (run) score--;
  const clamped = Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
  const label = (["weak", "fair", "good", "strong"] as const)[clamped - 1]!;
  return { score: clamped, label, hints };
}
