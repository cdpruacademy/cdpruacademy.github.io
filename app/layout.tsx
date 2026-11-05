import type { Metadata } from "next";
// Noto Sans Thai, one family for Thai, English and figures (see DESIGN.md), is bundled
// through @font-face in globals.css, so the build needs no font download
import "./globals.css";
import { AppNav } from "@/components/app-nav";
import { AuthGate } from "@/components/auth/auth-gate";
import { NotifyHost } from "@/components/notify-host";

export const metadata: Metadata = {
  title: "CD Team · ฝ่ายพัฒนาหลักสูตร",
  description: "Internal dashboard for curriculum development team, timeline management, and knowledge search",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className="antialiased font-sans"
    >
      <body className="min-h-screen bg-paper text-ink flex flex-col pb-16 lg:pb-0">
        <AppNav />
        <main className="flex-1">
          <AuthGate>{children}</AuthGate>
        </main>
        <NotifyHost />
      </body>
    </html>
  );
}
