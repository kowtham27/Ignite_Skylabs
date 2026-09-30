import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "run dev",
  description: "A live notice board. One admin writes; everyone sees it the moment it changes.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#141412" },
  ],
};

// Runs before paint: follow the system theme, and keep following it if the OS
// flips (e.g. at sunset). Also clears a theme choice saved by the old switch.
const themeBoot = `try{localStorage.removeItem("rundev:theme")}catch(e){}var m=matchMedia("(prefers-color-scheme: dark)");function a(){document.documentElement.classList.toggle("dark",m.matches)}a();m.addEventListener("change",a);`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {/* beforeInteractive: injected into the server HTML and run before hydration. */}
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
