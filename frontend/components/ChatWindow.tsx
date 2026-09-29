"use client";

import { useEffect, useRef } from "react";

import MessageBubble from "./MessageBubble";
import type { ChatTurn } from "@/lib/types";

export type ActivityState = { label: string } | null;

const SUGGESTIONS = [
  "What's working on my Instagram this month?",
  "Why did engagement spike last week?",
  "Restructure my content plan based on what's been performing",
  "Where are the gaps in my current posting strategy?",
];

export default function ChatWindow({
  brandName,
  turns,
  activity,
}: {
  brandName: string;
  turns: ChatTurn[];
  activity: ActivityState;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, activity]);

  return (
    <div className="scroll-slim flex-1 space-y-4 overflow-y-auto px-6 py-6">
      {turns.length === 0 && !activity && (
        <div className="mx-auto max-w-lg pt-10 text-center">
          <div className="mb-3 text-4xl">🧠</div>
          <h2 className="mb-1 text-lg font-medium">
            Ask about {brandName}&apos;s content strategy
          </h2>
          <p className="mb-6 text-sm text-zinc-500">
            Answers are grounded in everything the agent has observed and remembered.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <div
                key={s}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left text-xs text-zinc-400"
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {turns.map((turn, i) => (
        <MessageBubble key={i} turn={turn} />
      ))}

      {activity && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-400">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
            </span>
            {activity.label}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
