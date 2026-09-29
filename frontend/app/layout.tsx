import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstaPulse AI — Instagram Professional Account & Content Assistant",
  description:
    "AI Growth & Content Strategy Agent for Instagram Professional accounts, powered by Grok & Hindsight memory.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-rose-500/30 selection:text-rose-200">
        {children}
      </body>
    </html>
  );
}

