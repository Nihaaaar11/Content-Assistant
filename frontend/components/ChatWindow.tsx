"use client";

import { useEffect, useRef } from "react";
import TechText from "./TechText";
import { LiquidGlassCard } from "./ui/LiquidGlassCard";
import MessageBubble from "./MessageBubble";
import type { ChatTurn } from "@/lib/types";

export type ActivityState = { label: string } | null;

const SUGGESTIONS = [
  {
    title: "Cross-Platform Growth Audit",
    sub: "Analyze Reels, Shorts, posts, and engagement across all socials",
    prompt: "Audit my content strategy across Instagram, YouTube, and connected platforms.",
    tag: "Analytics",
  },
  {

    title: "Double Engagement & Optimize SEO",
    sub: "Data-driven posting frequency, hooks, and caption strategies",
    prompt: "How can I double my overall engagement rate based on my content performance history?",
    tag: "Growth Strategy",
  },
  {

    title: "Multi-Platform Content Calendar",
    sub: "Generate 7-day Reel scripts, YouTube Shorts & Carousel angles",
    prompt: "Restructure my content strategy into a 7-day cross-platform posting plan.",
    tag: "Content Plan",
  },
  {
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
        <div className="animate-orb-1 absolute -top-20 left-1/4 h-96 w-96 rounded-full bg-[#A855F7]/15 blur-3xl opacity-70" />
        <div className="animate-orb-2 absolute top-1/3 right-1/4 h-96 w-96 rounded-full bg-[#9333EA]/15 blur-3xl opacity-70" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl space-y-4">
        {turns.length === 0 && !activity && (
          <div className="py-8 md:py-16 text-center animate-fade-in-up">
            <div style={{ width: '100%', height: '480px', position: 'relative' }}>
              <TechText
                text="N I H A R"
                fontWeight={600}
                fontSize={150}
                reveal="letter"
                dashLength={4}
                dashGap={1}
                specks={15}
                color="#A855F7"
                accentColor="#C084FC"
              />
            </div>

            {/* Title */}
            <h2 className="mb-3 text-3xl md:text-4xl font-normal tracking-tight text-slate-100 font-sans">
              Hey Nihar, Let's discuss your ideas
            </h2>

            <p className="mx-auto mb-10 max-w-xl text-sm text-slate-400 leading-relaxed font-light">

              I observe your social media accounts, Analyse things, remember them and advice you as a friend.
              Feel free to Discuss your content strategy with me
            </p>

            {/* Interactive Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-left">
              {SUGGESTIONS.map((s) => (
                <div
                  key={s.title}
                  onClick={() => onSelectSuggestion?.(s.prompt)}
                  className="w-full text-left cursor-pointer group"
                >
                  <LiquidGlassCard className="h-full flex flex-col justify-between transition-transform duration-200 group-hover:scale-[1.02] border-purple-900/40 bg-[#120822]/90">
                    <div className="flex items-start justify-between mb-3">

                      <span className="rounded-full bg-purple-950/80 border border-purple-900/30 px-2.5 py-0.5 text-[10px] font-medium text-purple-300/80 group-hover:bg-[#A855F7]/20 group-hover:text-purple-200 transition-colors">
                        {s.tag}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {s.title}
                      </h3>
                      <p className="mt-1 text-xs text-purple-200/70 leading-relaxed font-light">
                        {s.sub}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-end">

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
            <div className="py-2.5 px-4 rounded-full bg-[#140a24] border border-purple-900/50 text-xs font-medium text-purple-200 flex items-center gap-3 shadow-md">
              <span className="flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-purple-300 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#A855F7] [animation-delay:300ms]" />
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
