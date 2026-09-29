import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrandPulse — AI Content Strategist",
  description:
    "Grok × Hindsight agent that observes your brand's social content and helps you plan what's next.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
