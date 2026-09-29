"use client";

import { useRef, useState } from "react";

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
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className="bg-[#0e1017]/90 px-4 py-4 md:px-8 border-t border-slate-800/40">
      <div className="mx-auto max-w-3xl relative">
        {/* Gemini Pill Floating Container matching screenshot */}
        <div className="relative flex items-center gap-3 rounded-full border border-slate-800 bg-[#161a26]/90 px-4.5 py-2.5 shadow-2xl backdrop-blur-xl transition-all duration-300 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:shadow-[0_0_25px_rgba(59,130,246,0.25)]">

          {/* Plus icon on left matching screenshot */}
          <button
            onClick={onOpenConnect}
            title="Connect Accounts or Upload Data"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition text-lg"
          >
            +
          </button>

          {/* Text Area */}
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
                ? "Add or select a brand to start..."
                : "Ask ContentMind"
            }
            disabled={disabled}
            className="scroll-slim max-h-36 flex-1 resize-none bg-transparent py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50 font-sans"
          />

          {/* Model Selector dropdown matching screenshot ('Flash ∨') */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowModelMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-[#1e2333] hover:bg-[#272e42] px-3 py-1.5 text-xs font-medium text-slate-300 transition"
            >
              <span>{model}</span>
              <span className="text-[10px] text-slate-500">▼</span>
            </button>

            {showModelMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-44 rounded-xl border border-slate-800 bg-[#161a26] p-1.5 shadow-xl text-xs z-50">
                <button
                  onClick={() => { setModel("Grok 4 Fast"); setShowModelMenu(false); }}
                  className="w-full rounded-lg px-3 py-2 text-left text-slate-200 hover:bg-slate-800 transition"
                >
                  ⚡ Grok 4 Fast
                </button>
                <button
                  onClick={() => { setModel("Grok 4 Deep"); setShowModelMenu(false); }}
                  className="w-full rounded-lg px-3 py-2 text-left text-slate-200 hover:bg-slate-800 transition"
                >
                  🧠 Grok 4 Reasoning
                </button>
              </div>
            )}
          </div>

          {/* Mic icon matching screenshot */}
          <button
            title="Voice input simulation"
            onClick={() => void submit()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            🎙️
          </button>

          {/* Send Icon */}
          <button
            onClick={() => void submit()}
            disabled={disabled || !value.trim()}
            title="Send message"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600"
          >
            ↗
          </button>
        </div>

        <p className="mt-2.5 text-center text-[11px] text-slate-500">
          ContentMind AI powered by Grok 4 &amp; Hindsight long-term memory server.
        </p>
      </div>
    </div>
  );
}


