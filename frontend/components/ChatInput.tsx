"use client";

import { useState } from "react";

export default function ChatInput({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (message: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");

  const submit = async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    await onSend(text);
  };

  return (
    <div className="border-t border-zinc-800 px-6 py-4">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder={
            disabled ? "Select or create a brand first…" : "Ask about your content strategy…"
          }
          disabled={disabled}
          className="scroll-slim max-h-40 min-h-[46px] flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={() => void submit()}
          disabled={disabled || !value.trim()}
          className="h-[46px] rounded-xl bg-sky-600 px-5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-600">
        Enter to send · Shift+Enter for a new line · Every exchange is remembered
      </p>
    </div>
  );
}
