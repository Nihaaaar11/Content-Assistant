"use client";

import { useRef, useState } from "react";

export default function ChatInput({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (message: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const submit = async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await onSend(text);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className="bg-zinc-950/80 px-4 py-4 md:px-8 border-t border-zinc-800/40">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-2xl border border-zinc-700/70 bg-zinc-900/90 p-2 shadow-2xl backdrop-blur-xl transition-all focus-within:border-rose-500/60 focus-within:ring-2 focus-within:ring-rose-500/20">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder={
              disabled
                ? "Create or select an Instagram account first..."
                : "Ask InstaPulse AI about your Instagram account growth..."
            }
            disabled={disabled}
            className="scroll-slim max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
          />

          <button
            onClick={() => void submit()}
            disabled={disabled || !value.trim()}
            title="Send Message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 text-white shadow-md transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
          >
            <svg className="h-4 w-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] text-zinc-500">
          Enter to send · Shift+Enter for multiline · InstaPulse AI uses Grok 4 &amp; Hindsight memory to optimize your Instagram account strategy.
        </p>
      </div>
    </div>
  );
}

