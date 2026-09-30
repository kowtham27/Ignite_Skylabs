"use client";

import { Bars } from "@/components/ui/Skeleton";
import { useGuard } from "@/lib/session";

/** No content of its own: the guard sends everyone to their current step. */
export default function Home() {
  useGuard([]);
  return (
    <main className="mx-auto max-w-[26rem] px-4 pt-[20vh]">
      <Bars rows={[60, 100]} />
    </main>
  );
}
