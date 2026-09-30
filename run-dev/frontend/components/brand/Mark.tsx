/**
 * The mark: a prompt chevron leaning forward mid-stride, with the cursor
 * underscore trailing off its lower arm. Reads as ">_" and as motion.
 * Drawn on a 32-unit grid; the stroke stays ≥ 1.5px at 16px.
 */
export function Mark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M10.5 5.5 L20.5 15.5 L8 26"
        stroke="currentColor"
        strokeWidth="3.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path d="M17.5 26 H27" stroke="currentColor" strokeWidth="3.25" strokeLinecap="square" />
    </svg>
  );
}
