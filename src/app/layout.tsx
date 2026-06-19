import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SoundController } from "@/components/sound-controller";
import { BugReportButton } from "@/components/bug-report-button";

// Clean technical body + condensed tactical display font.
const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Tarkovsky — Escape from Tarkov Quest Wiki for Beginners",
    template: "%s · Tarkovsky",
  },
  description:
    "A clean, beginner-focused wiki for Escape from Tarkov quests, with interactive maps. No clutter — just what you need to finish tasks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SoundController />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <BugReportButton />
      </body>
    </html>
  );
}
