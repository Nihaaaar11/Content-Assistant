"use client";

import { useEffect, useState } from "react";

import { getStats } from "@/lib/api";
import type { Brand, Health, Stats } from "@/lib/types";

export function CreateBrandForm({
  onCreate,
  compact = false,
}: {
  onCreate: (name: string, description: string) => Promise<void> | void;
  compact?: boolean;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(name.trim(), "");
      setName("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3 w-full"}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void submit()}
        placeholder="Brand / Social Account Name..."
        className="w-full rounded-xl border border-slate-700/60 bg-[#121622] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition"
      />
      <button
        onClick={() => void submit()}
        disabled={!name.trim() || busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-40"
      >
        <span>+</span>
        {busy ? "Adding..." : "Add Brand"}
      </button>
    </div>
  );
}

function HealthDot({ ok, label }: { ok: boolean | null; label: string }) {
  const color =
    ok === null ? "bg-slate-600" : ok ? "bg-emerald-400 shadow-emerald-500/40" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-400">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function StatsCards({ brandId }: { brandId: number }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    getStats(brandId)
      .then((s) => alive && setStats(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [brandId]);

  if (!stats || stats.post_count === 0) return null;

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : `${n}`;

  return (
    <div className="mt-3 rounded-xl border border-slate-800/80 bg-[#121622]/80 p-3 backdrop-blur-xs">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Cross-Platform Insights
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[#181d2c] p-2 border border-slate-800/60">
          <div className="text-[10px] uppercase font-medium text-slate-400">Audience</div>
          <div className="text-sm font-bold text-white">
            {stats.followers !== null ? fmt(stats.followers) : "—"}
          </div>
        </div>
        <div className="rounded-lg bg-[#181d2c] p-2 border border-slate-800/60">
          <div className="text-[10px] uppercase font-medium text-slate-400">Total Posts</div>
          <div className="text-sm font-bold text-white">{fmt(stats.post_count)}</div>
        </div>
        <div className="rounded-lg bg-[#181d2c] p-2 border border-slate-800/60">
          <div className="text-[10px] uppercase font-medium text-slate-400">Likes</div>
          <div className="text-sm font-bold text-blue-400">{fmt(stats.total_likes)}</div>
        </div>
        <div className="rounded-lg bg-[#181d2c] p-2 border border-slate-800/60">
          <div className="text-[10px] uppercase font-medium text-slate-400">Views &amp; Reach</div>
          <div className="text-sm font-bold text-purple-400">{fmt(stats.total_views)}</div>
        </div>
      </div>
    </div>
  );
}

const QUICK_TOPICS = [
  "Cross-Platform Growth Audit",
  "Reel & Short Video Hooks",
  "Multi-Platform Content Plan",
  "Engagement & Reach Strategy",
  "Hashtag & Caption Optimization",
];

export default function Sidebar({
  brands,
  activeBrand,
  health,
  onSelect,
  onCreate,
  onConnect,
  refreshKey,
  collapsed = false,
  onToggleCollapse,
  onNewChat,
}: {
  brands: Brand[];
  activeBrand: Brand | null;
  health: Health | null;
  onSelect: (brand: Brand) => void;
  onCreate: (name: string, description: string) => Promise<void> | void;
  onConnect: () => void;
  refreshKey: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNewChat?: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "spark">("chat");

  if (collapsed) {
    return (
      <aside className="flex w-16 shrink-0 flex-col items-center border-r border-slate-800/60 bg-[#0e1017] py-4">
        <button
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="mb-6 rounded-xl p-2.5 text-slate-400 hover:bg-slate-800/60 hover:text-white transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-blue-500 via-indigo-500 to-purple-600 text-white shadow-lg">
          ✨
        </div>

        <button
          onClick={onNewChat}
          title="New Chat"
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#1b1f2e] text-slate-200 hover:bg-blue-600 hover:text-white transition"
        >
          ✏️
        </button>

        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto w-full px-2 scroll-slim">
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              title={b.name}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold transition ${
                activeBrand?.id === b.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-[#181c28] text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {b.name.substring(0, 2).toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
          CM
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800/60 bg-[#0e1017] text-slate-200">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/40 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-blue-500 via-indigo-500 to-purple-600 text-white shadow-sm">
            ✨
          </div>
          <span className="text-lg font-medium tracking-tight text-white font-sans">ContentMind</span>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/60 hover:text-white transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Main Sidebar Scroll Container */}
      <div className="scroll-slim flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Gemini Pill Tabs */}
        <div className="flex rounded-full bg-[#181c28] p-1 text-xs">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 rounded-full py-1.5 font-medium transition ${
              activeTab === "chat"
                ? "bg-[#252b3e] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("spark")}
            className={`flex-1 rounded-full py-1.5 font-medium transition flex items-center justify-center gap-1 ${
              activeTab === "spark"
                ? "bg-[#252b3e] text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Spark</span>
            <span className="rounded bg-indigo-500/30 px-1 py-0.2 text-[9px] font-bold text-indigo-300">BETA</span>
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex w-full items-center gap-3 rounded-full bg-[#191d2a] hover:bg-[#23293b] px-4 py-2.5 text-xs font-medium text-slate-100 transition shadow-xs border border-slate-800/50 active:scale-[0.99]"
        >
          <span className="text-sm">✏️</span>
          <span>New chat</span>
        </button>

        {/* Feature Navigation */}
        <div className="space-y-0.5 text-xs text-slate-300">
          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-300 hover:bg-[#181c28] hover:text-white transition"
          >
            <span>📷</span>
            <span>Instagram Growth</span>
          </button>

          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-300 hover:bg-[#181c28] hover:text-white transition"
          >
            <span>▶️</span>
            <span>YouTube Shorts &amp; Analytics</span>
          </button>

          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-300 hover:bg-[#181c28] hover:text-white transition"
          >
            <span>🎬</span>
            <span>Reels &amp; Video Scripts</span>
          </button>

          <button
            onClick={onConnect}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-300 hover:bg-[#181c28] hover:text-white transition"
          >
            <span>⚙️</span>
            <span>Connect Platforms &amp; Data</span>
          </button>
        </div>

        {/* Section: Connected Brands */}
        <div className="pt-2 border-t border-slate-800/40">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Connected Brands
            </span>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="text-xs font-semibold text-blue-400 hover:underline"
            >
              {showCreate ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showCreate && (
            <div className="my-2 rounded-xl bg-[#141824] p-3 border border-slate-800">
              <CreateBrandForm onCreate={onCreate} compact />
            </div>
          )}

          <div className="space-y-1 mt-1">
            {brands.map((brand) => {
              const isSelected = activeBrand?.id === brand.id;
              return (
                <button
                  key={brand.id}
                  onClick={() => onSelect(brand)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                    isSelected
                      ? "bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30"
                      : "text-slate-300 hover:bg-[#181c28] hover:text-white border border-transparent"
                  }`}
                >
                  <span className="truncate">{brand.name}</span>
                  <span className="text-[10px] text-slate-500">
                    {brand.platforms.length > 0 ? brand.platforms.join("·") : "All platforms"}
                  </span>
                </button>
              );
            })}
          </div>

          {activeBrand && (
            <StatsCards key={`${activeBrand.id}-${refreshKey}`} brandId={activeBrand.id} />
          )}
        </div>

        {/* Section: Quick Strategy Topics */}
        <div className="pt-2 border-t border-slate-800/40">
          <div className="px-2 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Strategy Topics
          </div>
          <div className="space-y-0.5">
            {QUICK_TOPICS.map((title, i) => (
              <button
                key={i}
                onClick={onNewChat}
                className="w-full truncate rounded-lg px-3 py-1.5 text-left text-xs text-slate-400 hover:bg-[#181c28] hover:text-slate-200 transition"
              >
                {title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer User Profile Bar */}
      <div className="relative border-t border-slate-800/50 bg-[#0b0d13] px-3.5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs shadow-xs">
              CM
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight">Content Strategist</span>
              <span className="text-[10px] font-medium text-slate-400">Pro Account</span>
            </div>
          </div>

          <button
            onClick={() => setShowHealth((v) => !v)}
            title="System Status & Health"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ⚙️
          </button>
        </div>

        {showHealth && (
          <div className="mt-3 rounded-xl border border-slate-800 bg-[#121622] p-3 space-y-2 text-xs">
            <div className="font-semibold text-slate-300">System Status</div>
            <HealthDot ok={health ? health.hindsight : null} label="Hindsight Memory Bank" />
            <HealthDot ok={health ? health.grok_configured : null} label="Grok 4 Engine" />
            <HealthDot ok={health ? health.scheduler : null} label="Auto-Collector Pipeline" />
          </div>
        )}
      </div>
    </aside>
  );
}



