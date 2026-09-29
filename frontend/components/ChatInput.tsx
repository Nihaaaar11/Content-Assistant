"use client";

import { useRef, useState } from "react";
import { LiquidGlassCard } from "@/components/ui/LiquidGlassCard";

export default function ChatInput({
  disabled,
  onSend,
  onOpenConnect,
}: {
  disabled: boolean;
  onSend: (message: string) => void | Promise<void>;
  onOpenConnect?: () => void;
}) {
  const [value, setValue] = useState("");
  const [model, setModel] = useState("Grok 4 Fast");
  const [showModelMenu, setShowModelMenu] = useState(false);
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
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  };

  return (
    <div className="bg-[#0b0d14]/90 px-4 py-5 md:px-8 border-t border-slate-800/40 relative z-30">
      <div className="mx-auto max-w-4xl relative group">
        {/* Ambient liquid glow behind input bar */}
        <div className="absolute -inset-1 rounded-[36px] bg-linear-to-r from-blue-600/30 via-indigo-500/20 to-purple-600/30 blur-xl opacity-60 transition-all duration-500 group-focus-within:opacity-100 group-focus-within:blur-2xl" />

        {/* Liquid Glass Card Bar */}
        <LiquidGlassCard
          glassSize="none"
          className="relative flex items-center gap-3.5 rounded-full border border-slate-700/60 bg-[#121624]/90 px-6 py-3.5 md:py-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300 focus-within:border-blue-400/80 focus-within:ring-4 focus-within:ring-blue-500/20 hover:border-slate-500/80"
        >
          {/* Plus icon on left */}
          <button
            onClick={onOpenConnect}
            title="Connect Accounts or Upload Brand Assets"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 hover:bg-blue-500/20 hover:text-blue-300 hover:scale-105 active:scale-95 transition-all text-xl font-light shadow-sm"
          >
            +
          </button>

          {/* Large Main Textarea */}
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
                ? "Add or select a brand strategy to start..."
                : "Ask ContentMind to generate posts, script reels, or analyze growth..."
            }
            disabled={disabled}
            className="scroll-slim max-h-44 flex-1 resize-none bg-transparent py-2 text-base md:text-lg text-slate-100 placeholder:text-slate-400/80 focus:outline-none disabled:opacity-50 font-sans tracking-wide leading-relaxed"
          />

          {/* Model Selector & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Model Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowModelMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-[#1c2236]/90 hover:bg-[#252d47] px-4 py-2 text-xs md:text-sm font-medium text-slate-200 transition-all shadow-inner hover:border-blue-400/40"
              >
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {model}
                </span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {showModelMenu && (
                <div className="absolute right-0 bottom-full mb-3 w-52 rounded-2xl border border-slate-700/80 bg-[#141826] p-2 shadow-2xl backdrop-blur-2xl text-xs md:text-sm z-50 animate-fade-in-up">
                  <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Select AI Engine
                  </div>
                  <button
                    onClick={() => {
                      setModel("Grok 4 Fast");
                      setShowModelMenu(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition flex items-center justify-between ${
                      model === "Grok 4 Fast"
                        ? "bg-blue-600/20 text-blue-300 font-medium"
                        : "text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <span>⚡ Grok 4 Fast</span>
                    {model === "Grok 4 Fast" && <span className="text-xs">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      setModel("Grok 4 Deep");
                      setShowModelMenu(false);
                    }}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition flex items-center justify-between ${
                      model === "Grok 4 Deep"
                        ? "bg-purple-600/20 text-purple-300 font-medium"
                        : "text-slate-200 hover:bg-slate-800/80"
                    }`}
                  >
                    <span>🧠 Grok 4 Reasoning</span>
                    {model === "Grok 4 Deep" && <span className="text-xs">✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Mic Icon */}
            <button
              title="Voice Input Mode"
              onClick={() => void submit()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-105 active:scale-95 transition-all text-lg shadow-sm"
            >
              🎙️
            </button>

            {/* Send Button */}
            <button
              onClick={() => void submit()}
              disabled={disabled || !value.trim()}
              title="Send prompt"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-bold transition-all duration-200 hover:scale-105 hover:shadow-[0_0_22px_rgba(79,70,229,0.5)] active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:shadow-none text-lg"
            >
              ↗
            </button>
          </div>
        </LiquidGlassCard>

        <p className="mt-2.5 text-center text-[11px] text-slate-400 font-medium tracking-wide">
          ContentMind AI powered by Grok 4 &amp; Hindsight long-term memory engine.
        </p>
      </div>
    </div>
  );
}



