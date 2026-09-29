"use client";

import type { KeyboardEvent } from "react";
import { IndiaFlag } from "@/components/icons/IndiaFlag";
import { formatNational, normalizeIndianPhone } from "@/lib/phone";

interface IndiaPhoneInputProps {
  id: string;
  /** National number, digits only (0–10 chars). */
  value: string;
  onChange: (national: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}

export function IndiaPhoneInput({
  id,
  value,
  onChange,
  onBlur,
  onKeyDown,
  invalid,
  describedBy,
  disabled,
}: IndiaPhoneInputProps) {
  return (
    <div
      className={`flex min-h-13 items-stretch overflow-hidden rounded-control border bg-rm-bg/60 transition-[border-color,box-shadow] focus-within:border-rm-lime focus-within:shadow-[0_0_0_4px_var(--rm-lime-glow)] ${
        invalid ? "border-rm-error" : "border-rm-border"
      }`}
    >
      <span
        className="flex select-none items-center gap-2 border-r border-rm-border bg-white/[0.04] px-3.5 text-base font-medium"
        aria-hidden="true"
      >
        <IndiaFlag className="rounded-[2px]" />
        +91
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        autoFocus
        placeholder="98765 43210"
        value={formatNational(value)}
        onChange={(e) => onChange(normalizeIndianPhone(e.target.value))}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="w-full min-w-0 bg-transparent px-3.5 text-lg tracking-wide text-rm-text placeholder:text-rm-muted/60 focus:outline-none focus-visible:outline-none disabled:opacity-60"
      />
    </div>
  );
}
