/** Page title in Instrument Serif. Pass at most one word in <em>. */
export function AuthTitle({ children, lede }: { children: React.ReactNode; lede?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="hand-em font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[46px] [&_em]:italic">
        {children}
      </h1>
      {lede ? <p className="mt-3 text-[15px] leading-6 text-muted">{lede}</p> : null}
    </div>
  );
}
