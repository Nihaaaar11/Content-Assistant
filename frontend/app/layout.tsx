import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContentMind AI — Cross-Platform Social Content & Growth Agent",
  description:
    "AI Content Assistant for Instagram, YouTube, TikTok & Social Media, powered by Grok 4 & Hindsight long-term memory.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b0d14] text-slate-100 antialiased selection:bg-blue-600/30 selection:text-blue-200">
        {children}
      </body>
    </html>
  );
}


