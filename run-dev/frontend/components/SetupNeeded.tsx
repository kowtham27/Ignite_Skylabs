import { Wordmark } from "@/components/brand/Wordmark";

/** Shown instead of the app when the browser env vars are missing. */
export function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <main className="min-h-dvh bg-surface px-4 pt-10 sm:px-8 lg:pt-[14vh] lg:pl-[12%]">
      <div className="max-w-[36rem]">
        <Wordmark />
        <h1 className="mt-10 font-display text-[40px] leading-[1.05] text-ink sm:text-[46px]">
          Not <em className="italic">configured</em> yet.
        </h1>
        <p className="mt-3 text-[15px] leading-6 text-muted">
          The app doesn&apos;t know which Appwrite project to talk to. Create <code className="font-mono text-[13px] text-ink">.env.local</code>{" "}
          in the project root, then restart <code className="font-mono text-[13px] text-ink">npm run dev</code>. Next.js only reads env files at startup.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-ui border border-rule bg-paper p-4 font-mono text-[12px] leading-6 text-ink">
          {missing.map((m) => (
            <span key={m} className="block">
              <span className="text-brick">✗</span> {m}
            </span>
          ))}
        </pre>
        <p className="mt-6 font-mono text-[12px] leading-5 text-muted">
          copy .env.example .env.local · fill it in · restart the dev server
        </p>
      </div>
    </main>
  );
}
