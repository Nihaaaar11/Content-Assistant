"use client";

import { useEffect, useRef } from "react";
import { LiquidGlassCard } from "./ui/LiquidGlassCard";
import MessageBubble from "./MessageBubble";
import type { ChatTurn } from "@/lib/types";

export type ActivityState = { label: string } | null;

const SUGGESTIONS = [
  {
    icon: "📊",
    title: "Cross-Platform Growth Audit",
    sub: "Analyze Reels, Shorts, posts, and engagement across all socials",
    prompt: "Audit my content strategy across Instagram, YouTube, and connected platforms.",
    tag: "Analytics",
  },
  {
    icon: "🚀",
    title: "Double Engagement & Reach",
    sub: "Data-driven posting frequency, hooks, and caption strategies",
    prompt: "How can I double my overall engagement rate based on my content performance history?",
    tag: "Growth Strategy",
  },
  {
    icon: "📅",
    title: "Multi-Platform Content Calendar",
    sub: "Generate 7-day Reel scripts, YouTube Shorts & Carousel angles",
    prompt: "Restructure my content strategy into a 7-day cross-platform posting plan.",
    tag: "Content Plan",
  },
  {
    icon: "🔍",
    title: "Identify Audience Gaps",
    sub: "Spot low-performing post types & missing viral content opportunities",
    prompt: "Where are the biggest performance gaps and missing opportunities in my current content?",
    tag: "Audit",
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
    <div className="relative scroll-slim flex-1 overflow-y-auto px-4 py-6 md:px-8 overflow-x-hidden bg-[#090b11]">
      {/* Background Moving Ambient Light Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-orb-1 absolute -top-20 left-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl opacity-70" />
        <div className="animate-orb-2 absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl opacity-70" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-4">
        {turns.length === 0 && !activity && (
          <div className="py-8 md:py-16 text-center animate-fade-in-up">
            {/* Animated Floating Logo */}
            <div className="animate-float relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-500 via-indigo-500 to-purple-600 text-white shadow-xl shadow-blue-500/20">
              <span className="text-3xl">✨</span>
            </div>

            {/* Title */}
            <h2 className="mb-3 text-3xl md:text-4xl font-normal tracking-tight text-slate-100 font-sans">
              The mic is yours, <span className="font-medium text-white">Content Strategist</span>
            </h2>

            <p className="mx-auto mb-10 max-w-xl text-sm text-slate-400 leading-relaxed font-light">
              {brandName ? <span className="font-medium text-slate-200">{brandName} · </span> : null}
              ContentMind AI observes your social media accounts, remembers post metrics in Hindsight memory, and crafts data-backed growth plans.
            </p>

            {/* Interactive Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
              {SUGGESTIONS.map((s) => (
                <div
                  key={s.title}
                  onClick={() => onSelectSuggestion?.(s.prompt)}
                  className="w-full text-left cursor-pointer group"
                >
                  <LiquidGlassCard className="h-full flex flex-col justify-between transition-transform duration-200 group-hover:scale-[1.02] border-slate-700/60 bg-[#121624]/90">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xl text-blue-400 transition-transform duration-300 group-hover:scale-110">
                        {s.icon}
                      </div>
                      <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-medium text-slate-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                        {s.tag}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors">
                        {s.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed font-light">
                        {s.sub}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-end">
                      <span className="text-[11px] font-medium text-blue-400 opacity-80 group-hover:opacity-100 transition-opacity">
                        Ask ContentMind ↗
                      </span>
                    </div>
                  </LiquidGlassCard>
                </div>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <MessageBubble key={i} turn={turn} />
        ))}

        {activity && (
          <div className="flex justify-start items-center gap-3 my-4 animate-fade-in-up">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-tr from-blue-500 via-indigo-500 to-purple-600 text-xs text-white shadow-md">
              <span>✨</span>
            </div>
            <div className="py-2.5 px-4 rounded-full bg-[#161c2e] border border-slate-700/60 text-xs font-medium text-slate-200 flex items-center gap-3 shadow-md">
              <span className="flex gap-1.5">
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
