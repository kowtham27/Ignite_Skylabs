import { Mark } from "./Mark";

/** Mark + "run dev" + cursor. The cursor only blinks where asked (auth pages). */
export function Wordmark({ blink = false, size = 22 }: { blink?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink" aria-label="run dev">
      <Mark size={size} className="text-signal" />
      <span aria-hidden="true" className="font-mono text-[15px] font-medium tracking-tight">
        run dev
        <span className={blink ? "cursor-blink" : undefined}>_</span>
      </span>
    </span>
  );
}
