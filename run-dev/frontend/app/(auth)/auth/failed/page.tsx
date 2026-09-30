import Link from "next/link";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default function AuthFailedPage() {
  return (
    <>
      <AuthTitle lede="The sign-in was cancelled, or Google and the server didn't agree on something. Nothing was changed.">
        Google didn&apos;t let us <em>in</em>.
      </AuthTitle>
      <div className="flex flex-col gap-4">
        <GoogleButton label="Try Google again" />
        <Link href="/login" className="text-[14px] text-muted underline decoration-rule underline-offset-4 hover:text-ink">
          Use email and password instead
        </Link>
      </div>
    </>
  );
}
