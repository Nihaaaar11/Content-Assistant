import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContentMind",
  description:
    "Grok & Gemini LLM powered strategy advicing agent with a pinch of Hindsight",
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
