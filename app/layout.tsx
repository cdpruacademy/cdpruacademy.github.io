import type { Metadata } from "next";
import { Noto_Sans_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/app-nav";
import { NotifyHost } from "@/components/notify-host";
import { cn } from "@/lib/utils";

// One family for Thai, English and figures (see DESIGN.md)
const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-thai",
});
const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "CD Team · ฝ่ายพัฒนาหลักสูตร",
  description: "Internal dashboard for curriculum development team, timeline management, and knowledge search",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={cn("antialiased", fontMono.variable, "font-sans", notoThai.variable)}
    >
      <body className="min-h-screen bg-paper text-ink flex flex-col pb-16 md:pb-0">
        <AppNav />
        <main className="flex-1">{children}</main>
        <NotifyHost />
      </body>
    </html>
  );
}
