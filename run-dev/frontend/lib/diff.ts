/**
 * Word-level diff: which words in `next` are new compared with `prev`.
 * Classic longest-common-subsequence; a notice is at most ~1000 words, so the
 * O(n·m) table is fine. Past a size cap we give up gracefully and report
 * "everything changed" rather than freeze the tab.
 */
const CELL_CAP = 4_000_000;

export function changedWordIndexes(prev: string[], next: string[]): Set<number> {
  const n = prev.length;
  const m = next.length;
  if (n === 0) return new Set(next.map((_, i) => i));
  if ((n + 1) * (m + 1) > CELL_CAP) return new Set(next.map((_, i) => i));

  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] =
        norm(prev[i]!) === norm(next[j]!) ? dp[(i + 1) * w + j + 1]! + 1 : Math.max(dp[(i + 1) * w + j]!, dp[i * w + j + 1]!);
    }
  }

  const kept = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (norm(prev[i]!) === norm(next[j]!)) {
      kept.add(j);
      i++;
      j++;
    } else if (dp[(i + 1) * w + j]! >= dp[i * w + j + 1]!) i++;
    else j++;
  }

  const changed = new Set<number>();
  for (let k = 0; k < m; k++) if (!kept.has(k)) changed.add(k);
  return changed;
}

// Punctuation-only edits ("today" → "today.") still count, but case-only
// edits don't light up a whole sentence.
function norm(word: string): string {
  return word.toLowerCase();
}

export type WordDiff = { title: Set<number>; body: Set<number> };
