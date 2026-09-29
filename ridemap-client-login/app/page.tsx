import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, decodeSession } from "@/lib/session";
import { formatForDisplay } from "@/lib/phone";

/**
 * Placeholder for NEXT_PUBLIC_POST_LOGIN_REDIRECT's default ("/").
 * Not a dashboard: it only confirms the session so the login flow can be tested end to end.
 */
export default async function Home() {
  const session = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center">
      <p className="text-rm-muted">
        Signed in as <strong className="text-rm-text">{formatForDisplay(session.phone)}</strong>. Point{" "}
        <code className="text-rm-lime">NEXT_PUBLIC_POST_LOGIN_REDIRECT</code> at your client panel.
      </p>
    </main>
  );
}
