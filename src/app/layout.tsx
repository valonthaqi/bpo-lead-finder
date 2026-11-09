import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { APPLY_SAVED_THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "BPO Lead Finder",
  description: "Find BPO call centers running US insurance campaigns",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-background ${geist.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: APPLY_SAVED_THEME_SCRIPT }}
        />
      </head>
      <body className="min-h-screen bg-muted/40 font-sans">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
