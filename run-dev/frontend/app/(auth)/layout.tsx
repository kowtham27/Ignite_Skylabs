import { AuthLogProvider, AuthStage, LatestLogLine } from "@/components/auth/AuthLog";
import { BootLog } from "@/components/auth/BootLog";
import { Wordmark } from "@/components/brand/Wordmark";
import { ScrollCue } from "@/components/ui/ScrollCue";

/**
 * Left 5/12: a sheet of paper that behaves like a dev server that just
 * started, and keeps logging what the form does. Right 7/12: the form,
 * anchored high and left rather than floating in the middle of the screen.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthLogProvider>
      <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-12">
        <aside className="paper-grain hidden border-r border-rule lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
          <Wordmark blink />
          <div className="pt-[14vh] pb-[6vh]">
            <BootLog />
          </div>
          <p className="font-mono text-[12px] text-muted">watching for changes…</p>
        </aside>

        <header className="flex h-14 items-center justify-between gap-4 border-b border-rule px-4 sm:px-6 lg:hidden">
          <Wordmark blink size={20} />
          <LatestLogLine />
        </header>

        <main className="flex-1 bg-surface lg:col-span-7 lg:min-h-dvh">
          <div className="px-4 pt-10 pb-16 sm:px-8 sm:pt-16 lg:pt-[clamp(2rem,11vh,9rem)] lg:pr-12 lg:pb-8 lg:pl-[12%]">
            <AuthStage>{children}</AuthStage>
          </div>
        </main>
      </div>
      <div className="lg:hidden">
        <ScrollCue />
      </div>
    </AuthLogProvider>
  );
}
