import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BPO Lead Finder",
  description: "Find BPO call centers running US insurance campaigns",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
