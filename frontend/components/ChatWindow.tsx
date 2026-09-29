"use client";

import { useEffect, useRef } from "react";

import MessageBubble from "./MessageBubble";
import type { ChatTurn } from "@/lib/types";

export type ActivityState = { label: string } | null;

const SUGGESTIONS = [
  {
    icon: "📸",
    title: "Audit Instagram Performance",
    sub: "Analyze Reels, hooks, views & engagement",
    prompt: "Audit my Instagram account performance and tell me what's working best.",
  },
  {
    icon: "🚀",
    title: "Boost Engagement & Reach",
    sub: "Data-backed tips on posting times & captions",
    prompt: "How can I double my Instagram engagement rate based on my past metrics?",
  },
  {
    icon: "📅",
    title: "7-Day Content Plan",
    sub: "Generate viral Reel scripts & carousel ideas",
    prompt: "Restructure my content plan into a 7-day Instagram growth strategy.",
  },
  {
    icon: "🔍",
    title: "Find Account Strategy Gaps",
    sub: "Spot low-performing posts & hashtag gaps",
    prompt: "Where are the biggest performance gaps in my current posting schedule?",
  },
];

export default function ChatWindow({
  brandName,
  turns,
  activity,
  onSelectSuggestion,
}: {
  brandName: string;
  turns: ChatTurn[];
  activity: ActivityState;
  onSelectSuggestion?: (prompt: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, activity]);

  return (
    <div className="scroll-slim flex-1 overflow-y-auto px-4 py-6 md:px-8 bg-radial-glow">
      <div className="mx-auto max-w-4xl space-y-4">
        {turns.length === 0 && !activity && (
          <div className="py-12 md:py-16 text-center">
            {/* Glowing Icon Header */}
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-xl shadow-rose-500/25 animate-pulse-glow">
              <span className="text-4xl">✨</span>
            </div>

            <h2 className="mb-2 text-2xl md:text-3xl font-bold tracking-tight text-white">
              What would you like to grow on <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">{brandName}</span> today?
            </h2>
            <p className="mx-auto mb-10 max-w-lg text-sm text-zinc-400 leading-relaxed">
              Your AI Assistant for Instagram Professional account growth. Powered by Grok 4 &amp; Hindsight memory to analyze your Reels, posts, views, and reach.
            </p>

            {/* Prompt Cards Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-left">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => onSelectSuggestion?.(s.prompt)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all duration-200 hover:border-rose-500/50 hover:bg-zinc-900/90 hover:shadow-lg hover:shadow-rose-500/10 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl mb-2">{s.icon}</span>
                    <span className="text-xs text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to ask ↗
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200 group-hover:text-rose-300 transition-colors">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400 leading-normal">
                      {s.sub}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <MessageBubble key={i} turn={turn} />
        ))}

        {activity && (
          <div className="flex justify-start items-center gap-3 my-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-xs text-white shadow-md">
              ✨
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/80 px-4 py-3 text-xs font-medium text-zinc-300 shadow-md backdrop-blur-xs">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-rose-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-rose-500 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-purple-500 [animation-delay:300ms]" />
              </span>
              <span>{activity.label}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

