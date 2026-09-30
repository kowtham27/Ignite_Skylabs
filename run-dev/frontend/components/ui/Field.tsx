import { forwardRef, useEffect, useId, useState } from "react";

/**
 * Shake once each time `attempt` increases while this field has an error.
 * A counter rather than the message, so a repeated identical error still
 * gets its shake.
 */
function useShake(hasError: boolean, attempt: number | undefined): string {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!attempt || !hasError) return;
    setOn(false);
    const frame = requestAnimationFrame(() => setOn(true));
    const done = window.setTimeout(() => setOn(false), 380);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new attempt should shake
  }, [attempt]);
  return on ? "shake" : "";
}

/**
 * Error output styled like a friendly compiler: a caret under the field, then
 * the message. Always mounted so screen readers announce changes.
 */
export function FieldMessage({ id, error }: { id: string; error?: string | null }) {
  return (
    <div id={id} aria-live="polite" className="min-h-0">
      {error ? (
        <p className="mt-1 font-mono text-[12px] leading-[18px] text-brick">
          <span aria-hidden="true" className="block pl-3 leading-[14px]">
            ^
          </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "w-full rounded-ui border border-field bg-surface px-3 text-[15px] text-ink placeholder:text-muted " +
  "transition-[border-color] transition-quick hover:border-ink " +
  "aria-[invalid=true]:border-brick";

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  note?: React.ReactNode;
  /** Rendered at the right end of the label row (e.g. "show", a counter). */
  aside?: React.ReactNode;
  /** Submit attempt counter; bump it on a failed submit to shake the field. */
  attempt?: number;
};

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField(
  { label, error, note, aside, id, attempt, className = "", ...rest },
  ref,
) {
  const shake = useShake(!!error, attempt);
  const auto = useId();
  const inputId = id ?? auto;
  const msgId = `${inputId}-msg`;
  const noteId = note ? `${inputId}-note` : undefined;
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[msgId, noteId].filter(Boolean).join(" ")}
        className={`${control} h-10 ${shake}`}
        {...rest}
      />
      {note ? (
        <div id={noteId} className="mt-2">
          {note}
        </div>
      ) : null}
      <FieldMessage id={msgId} error={error} />
    </div>
  );
});

type AreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string | null;
  aside?: React.ReactNode;
  attempt?: number;
};

export function TextArea({ label, error, aside, id, attempt, className = "", ...rest }: AreaProps) {
  const shake = useShake(!!error, attempt);
  const auto = useId();
  const inputId = id ?? auto;
  const msgId = `${inputId}-msg`;
  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={msgId}
        className={`${control} min-h-[88px] resize-y py-2 leading-6 ${shake}`}
        {...rest}
      />
      <FieldMessage id={msgId} error={error} />
    </div>
  );
}

/** Form-level message (not tied to one field). */
export function FormMessage({ tone = "error", children }: { tone?: "error" | "ok"; children?: React.ReactNode }) {
  return (
    <div aria-live="polite">
      {children ? (
        <p
          className={`rounded-ui border px-3 py-2 font-mono text-[12px] leading-5 ${
            tone === "error" ? "border-brick/40 bg-brick-tint text-brick" : "border-signal/40 text-signal"
          }`}
        >
          {children}
        </p>
      ) : null}
    </div>
  );
}
