"use client";

import { useState } from "react";
import { LiquidGlassCard } from "./ui/LiquidGlassCard";
import type { ChatTurn } from "@/lib/types";


/** Renders text with clean markdown formatting: **bold**, bullets, and # headings. */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-zinc-100">
      {lines.map((line, i) => {
        const isBullet = /^\s*[-•*]\s+/.test(line);
        const isHeading = /^#{1,3}\s+/.test(line);
        const raw = isBullet
          ? line.replace(/^\s*[-•*]\s+/, "")
          : isHeading
            ? line.replace(/^#{1,3}\s+/, "")
            : line;

        if (!raw.trim()) {
          return <div key={i} className="h-2" />;
        }

        const parts = raw.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div
            key={i}
            className={
              isHeading
                ? "mt-3 text-base font-bold text-white tracking-tight"
                : isBullet
                  ? "relative pl-5 text-sm leading-relaxed text-zinc-200 before:absolute before:left-1 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-blue-400"
                  : "text-sm leading-relaxed text-zinc-200"
            }
          >
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j} className="font-semibold text-white">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MessageBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(turn.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore copy error */
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] rounded-2xl rounded-tr-xs bg-slate-800/90 border border-slate-700/60 px-4 py-3 text-sm text-white shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{turn.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex justify-start items-start gap-3 mb-6">
      {/* Assistant AI Avatar */}
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-linear-to-tr from-blue-500 via-indigo-500 to-purple-600 text-xs text-white shadow-md">
        ✨
      </div>

      <div className="flex flex-col gap-1 max-w-[85%]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">ContentMind AI</span>
          <span className="text-[10px] text-slate-500">Grok 4 Analyst</span>
        </div>

        <LiquidGlassCard className="rounded-2xl rounded-tl-xs px-5 py-4">
          <RichText text={turn.content} />

          <div className="mt-3 flex items-center gap-2 border-t border-slate-800/60 pt-2 text-[11px] text-slate-400">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-slate-800 hover:text-slate-200"
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  );
}


