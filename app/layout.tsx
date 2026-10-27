import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/app-nav";
import { NotifyHost } from "@/components/notify-host";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
// Geist has no Thai glyphs; Thai text falls through to this face instead of the OS default
const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
});
const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Prudential Thailand - New Product Timeline & Knowledge Base",
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
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable, plexThai.variable)}
    >
      <body className="min-h-screen bg-[#F8FAFC] text-[#2D2D2D] flex flex-col">
        <AppNav />
        <main className="flex-1">{children}</main>
        <NotifyHost />
      </body>
    </html>
  );
}
