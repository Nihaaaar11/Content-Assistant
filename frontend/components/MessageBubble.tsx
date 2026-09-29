"use client";

import type { ChatTurn } from "@/lib/types";

/** Renders text with minimal markdown: **bold**, bullets, and # headings. */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const isBullet = /^\s*[-•*]\s+/.test(line);
        const isHeading = /^#{1,3}\s+/.test(line);
        const raw = isBullet
          ? line.replace(/^\s*[-•*]\s+/, "")
          : isHeading
            ? line.replace(/^#{1,3}\s+/, "")
            : line;
        const parts = raw.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p
            key={i}
            className={
              isHeading
                ? "mt-2 text-sm font-semibold text-white"
                : isBullet
                  ? "relative pl-4 text-sm leading-relaxed before:absolute before:left-0 before:text-zinc-500 before:content-['•']"
                  : "text-sm leading-relaxed"
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
          </p>
        );
      })}
    </div>
  );
}

export default function MessageBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-2xl rounded-br-sm bg-sky-600 px-4 py-2.5 text-sm text-white"
            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-800/80 px-4 py-3 text-zinc-100"
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{turn.content}</p>
        ) : (
          <RichText text={turn.content} />
        )}
      </div>
    </div>
  );
}
