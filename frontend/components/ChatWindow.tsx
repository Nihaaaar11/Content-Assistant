"use client";

import { useEffect, useRef } from "react";

import MessageBubble from "./MessageBubble";
import type { ChatTurn } from "@/lib/types";

export type ActivityState = { label: string } | null;

const SUGGESTIONS = [
  {
    icon: "📊",
    title: "Cross-Platform Growth Audit",
    sub: "Analyze Reels, Shorts, posts, and engagement across all socials",
    prompt: "Audit my content strategy across Instagram, YouTube, and connected platforms.",
  },
  {
    icon: "🚀",
    title: "Double Engagement & Reach",
    sub: "Data-driven posting frequency, hooks, and caption strategies",
    prompt: "How can I double my overall engagement rate based on my content performance history?",
  },
  {
    icon: "📅",
    title: "Multi-Platform Content Calendar",
    sub: "Generate 7-day Reel scripts, YouTube Shorts & Carousel angles",
    prompt: "Restructure my content strategy into a 7-day cross-platform posting plan.",
  },
  {
    icon: "🔍",
    title: "Identify Audience Gaps",
    sub: "Spot low-performing post types & missing viral content opportunities",
    prompt: "Where are the biggest performance gaps and missing opportunities in my current content?",
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
    <div className="scroll-slim flex-1 overflow-y-auto px-4 py-6 md:px-8 bg-gemini-glow">
      <div className="mx-auto max-w-4xl space-y-4">
        {turns.length === 0 && !activity && (
          <div className="py-16 md:py-24 text-center animate-fade-in-up">
            {/* Gemini Big Center Title matching screenshot */}
            <h2 className="mb-4 text-3xl md:text-4xl font-normal tracking-tight text-slate-100 font-sans">
              The mic is yours, <span className="font-semibold text-white">Durga Trinadh</span>
            </h2>

            <p className="mx-auto mb-10 max-w-xl text-sm text-slate-400 leading-relaxed font-light">
              ContentMind AI observes your social media presence ({brandName}), remembers your post performance in Hindsight, and helps you craft high-converting content plans.
            </p>

            {/* Prompt Cards Grid */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 text-left">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => onSelectSuggestion?.(s.prompt)}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-800/70 bg-[#121622]/80 p-4 transition-all duration-200 hover:border-blue-500/40 hover:bg-[#181d2d] hover:shadow-lg active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl mb-2">{s.icon}</span>
                    <span className="text-[11px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Ask ContentMind ↗
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
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
          <div className="flex justify-start items-center gap-3 my-4 animate-fade-in-up">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 text-xs text-white shadow-sm">
              ✨
            </div>
            <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-[#161a26] px-4 py-2.5 text-xs font-medium text-slate-300 shadow-md">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400 [animation-delay:300ms]" />
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


