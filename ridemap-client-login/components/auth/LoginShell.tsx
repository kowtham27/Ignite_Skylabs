import { CursorField } from "@/components/effects/CursorField";
import { AuthCard } from "./AuthCard";
import { BrandPanel } from "./BrandPanel";

export function LoginShell() {
  return (
    // Fixed to the viewport: the login screen never scrolls.
    <main className="relative isolate h-dvh overflow-hidden overscroll-none">
      {/* Background: subtle map grid + two blurred lime blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-rm-lime/20 blur-[120px]" />
        <div className="absolute -bottom-40 right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-rm-green/15 blur-[140px]" />
        <CursorField />
      </div>

      <div className="mx-auto flex h-full max-w-[1440px] flex-col lg:grid lg:grid-cols-[55fr_45fr]">
        <BrandPanel />
        <section
          aria-label="Sign in"
          className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 lg:px-10 lg:py-8"
        >
          <AuthCard />
        </section>
      </div>
    </main>
  );
}
