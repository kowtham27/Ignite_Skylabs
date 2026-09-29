import type { Metadata } from "next";
import { LoginShell } from "@/components/auth/LoginShell";

export const metadata: Metadata = {
  title: "Login – Ridemap Client Panel",
  description: "Sign in to the Ridemap client panel with your WhatsApp number.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginShell />;
}
