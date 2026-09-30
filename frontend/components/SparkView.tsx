"use client";

import { LiquidGlassCard } from "./ui/LiquidGlassCard";
import type { Brand } from "@/lib/types";

const SPARK_CATEGORIES = [
  {
    title: "Viral Video Hooks",
    description: "High-retention video script hooks designed to capture immediate attention in 3 seconds.",
    prompts: [
      "Give me 5 proven 3-second Reel hooks for high retention in my niche.",
      "Write a storytelling script hook that converts viewers into followers.",
      "Create a controversial opening statement hook that drives comments.",
    ],
  },
  {
    title: "Instagram Reel & Carousel Scripts",
    description: "Step-by-step visual storyboard and caption structure for Instagram growth.",
    prompts: [
      "Outline a 5-slide educational Instagram Carousel on audience growth hacks.",
      "Write a 30-second Reel script with exact camera angle notes and text overlays.",
      "Draft a high-converting Instagram bio and pinned post strategy.",
    ],
  },
  {
    title: "YouTube Shorts & TikTok Trends",
    description: "Fast-paced short-form video concepts tailored for YouTube algorithm acceleration.",
    prompts: [
      "Generate 3 YouTube Shorts ideas based on trending tech & business discussions.",
      "How can I structure a 60-second YouTube Short to maximize subscriber CTR?",
      "Create a multi-platform video repurposing plan for 1 long video into 5 Shorts.",
    ],
  },
  {
    title: "Cross-Platform Repurposing",
    description: "Turn 1 core content idea into 7 distinct formats across Instagram, X, LinkedIn & TikTok.",
    prompts: [
      "Turn a single 500-word blog post into 1 Reel script, 1 X thread, and 1 LinkedIn post.",
      "Create a content calendar for 7 days featuring 1 core topic adapted per platform.",
      "Write an engaging X/Twitter thread breakdown that drives newsletter signups.",
    ],
  },
];

export default function SparkView({
  brand,
  onAskAI,
}: {
  brand?: Brand | null;
  onAskAI: (prompt: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#090514] p-6 md:p-8 space-y-6 scroll-slim">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-950/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-3">
            <span>Spark Idea Engine</span>
            <span className="rounded-full bg-[#A855F7]/20 border border-[#A855F7]/30 px-3 py-0.5 text-xs font-semibold text-purple-300">
              BETA
            </span>
          </h1>
          <p className="mt-1 text-sm text-purple-300/70">
            Brainstorm trending video hooks, carousel blueprints, and multi-platform viral strategies with one click.
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SPARK_CATEGORIES.map((cat, idx) => (
          <LiquidGlassCard key={idx} className="p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="mb-2">
                <h3 className="text-base font-bold text-white">{cat.title}</h3>
                <p className="text-xs text-purple-300/70 leading-relaxed mt-0.5">{cat.description}</p>
              </div>

              <div className="mt-4 space-y-2">
                {cat.prompts.map((p, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => onAskAI(p)}
                    className="w-full text-left rounded-xl bg-[#140a24] hover:bg-[#1f1035] p-3 text-xs text-purple-200 border border-purple-900/40 hover:border-[#A855F7]/50 transition flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{p}</span>
                    <span className="text-[#A855F7] font-semibold opacity-0 group-hover:opacity-100 transition shrink-0">
                      Run
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() =>
                  onAskAI(`Brainstorm 5 creative ${cat.title} concepts tailored specifically for ${brand ? brand.name : "my brand"}.`)
                }
                className="w-full rounded-xl bg-[#A855F7]/20 hover:bg-[#A855F7]/30 border border-[#A855F7]/30 py-2.5 text-xs font-semibold text-purple-300 transition"
              >
                Brainstorm Custom {cat.title}
              </button>
            </div>
          </LiquidGlassCard>
        ))}
      </div>
    </div>
  );
}
