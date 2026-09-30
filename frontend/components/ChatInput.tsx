"use client";

import PromptBar, { type PromptBarModel, type PromptBarSource, type PromptBarCommand } from "./PromptBar";

export default function ChatInput({
  disabled,
  onSend,
  onOpenConnect,
}: {
  disabled: boolean;
  onSend: (message: string) => void | Promise<void>;
  onOpenConnect?: () => void;
}) {
  const sources: PromptBarSource[] = [
    {
      key: "connect",
      name: "Connect Accounts & CSV",
      description: "Connect YouTube, Instagram or paste metrics",
      attach: false,
    },
    { key: "web", name: "Web search", description: "Real-time viral trends & hooks" },
    { key: "metrics", name: "Channel Analytics", description: "Views, engagement, subscriber growth" },
    { key: "memory", name: "Hindsight Memory", description: "Brand facts, strategy audits, past insights" },
  ];

  const commands: PromptBarCommand[] = [
    { key: "audit", name: "/audit", description: "Audit my content strategy across platforms" },
    { key: "hooks", name: "/hooks", description: "Generate 5 viral hooks & reel angles" },
    { key: "calendar", name: "/calendar", description: "Generate a 7-day multi-platform posting schedule" },
    { key: "summarize", name: "/summarize", description: "Digest recent analytics & metrics" },
    { key: "restructure", name: "/restructure", description: "Restructure content strategy based on data" },
  ];

  const models: PromptBarModel[] = [
    { key: "gemini", name: "Gemini 3.5 Flash", tag: "Flagship" },
    { key: "grok", name: "Grok 4 Fast", tag: "Fast" },
  ];

  const handleSend = async (text: string) => {
    if (!text.trim() || disabled) return;
    await onSend(text.trim());
  };

  return (
    <div className="bg-[#090514]/95 px-4 py-3 md:px-8 border-t border-purple-950/60 relative z-30">
      <div className="mx-auto max-w-4xl flex flex-col items-center">
        <PromptBar
          placeholder="Ask ContentMind to generate posts, script reels, or analyze growth..."
          sources={sources}
          commands={commands}
          models={models}
          defaultModel="gemini"
          efforts={["Fast", "Balanced", "Deep", "Max"]}
          defaultEffort="Balanced"
          busy={disabled}
          onSend={(text) => handleSend(text)}
          onAttach={() => onOpenConnect?.()}
          onDictate={() => "Audit my content strategy and generate 5 viral hooks."}
          background="#130826"
          color="#ffffff"
          menuBackground="#1b0e36"
          sparkColor="#A855F7"
          sparkBoost={1}
          width={840}
          radius={18}
          maxRows={6}
          className="w-full shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-purple-900/40 focus-within:border-[#A855F7]"
        />
        <p className="mt-2 text-center text-[11px] text-purple-300/60 font-medium tracking-wide">
          ContentMind
        </p>
      </div>
    </div>
  );
}
