import { useId, type SVGProps } from "react";

/** 20×14 India flag. Inline SVG because flag emoji don't render on Windows. */
export function IndiaFlag(props: SVGProps<SVGSVGElement>) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 30 21" width={20} height={14} aria-hidden="true" focusable="false" {...props}>
      <clipPath id={clipId}>
        <rect width="30" height="21" rx="3" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="30" height="7" fill="#FF9933" />
        <rect y="7" width="30" height="7" fill="#FFFFFF" />
        <rect y="14" width="30" height="7" fill="#138808" />
        <circle cx="15" cy="10.5" r="2.6" fill="none" stroke="#000080" strokeWidth="0.6" />
        <circle cx="15" cy="10.5" r="0.5" fill="#000080" />
      </g>
    </svg>
  );
}
