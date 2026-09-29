import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ridemap",
  icons: { icon: "/ridemap/favicon.png", apple: "/ridemap/fullIcon.png" },
};

export const viewport: Viewport = {
  themeColor: "#a7e92f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-rm-bg font-sans text-rm-text">{children}</body>
    </html>
  );
}
