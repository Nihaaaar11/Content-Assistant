"use client";

import { useEffect, useState } from "react";
import { LiquidGlassCard } from "./ui/LiquidGlassCard";
import { getStats } from "@/lib/api";
import type { Brand, Health, Stats } from "@/lib/types";

export function CreateBrandForm({
  onCreate,
  compact = false,
}: {
  onCreate: (name: string, description: string) => Promise<Brand | null> | void;
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
        placeholder="Brand / Account Name..."
        className="w-full rounded-xl border border-slate-700/60 bg-[#121622] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition"
      />
      <button
        onClick={() => void submit()}
        disabled={!name.trim() || busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-40 cursor-pointer"
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
    <div className="mt-3">
      <LiquidGlassCard glassSize="sm">
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
        </div>
      </LiquidGlassCard>
    </div>
  );
}

const QUICK_TOPICS = [
  { label: "Cross-Platform Growth Audit", prompt: "Audit my performance across Instagram, YouTube, and connected socials." },
  { label: "Reel & Short Video Hooks", prompt: "Give me 5 viral video hooks for my next Reels and Shorts based on past top metrics." },
  { label: "Multi-Platform Content Plan", prompt: "Build a 7-day multi-platform posting calendar for my brand." },
  { label: "Engagement & Reach Strategy", prompt: "How can I double my overall engagement rate across platforms?" },
  { label: "Hashtag & Caption Optimization", prompt: "What caption structure and hashtag sets will maximize reach for my content?" },
];

export default function Sidebar({
  brands,
  activeBrand,
  health,
  activeTab,
  onSelectTab,
  onSelectBrand,
  onCreateBrand,
  onConnect,
  refreshKey,
  collapsed,
  onToggleCollapse,
  onNewChat,
  onQuickPrompt,
}: {
  brands: Brand[];
  activeBrand: Brand | null;
  health: Health | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onSelectBrand: (brand: Brand) => void;
  onCreateBrand: (name: string, description: string) => Promise<any> | void;
  onConnect: () => void;
  refreshKey?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNewChat?: () => void;
  onQuickPrompt: (prompt: string) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);

  if (collapsed) {
    return (
      <aside className="flex w-16 flex-col items-center justify-between border-r border-slate-800/60 bg-[#0c0e17] py-4 z-40 transition-all">
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
          >
            ☰
          </button>

          <button
            onClick={onNewChat}
            title="New session"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white transition cursor-pointer text-lg"
          >
            +
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <span className="text-[10px] text-slate-500 font-mono">v1.0</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 flex-col justify-between border-r border-slate-800/60 bg-[#0c0e17] p-4 z-40 transition-all overflow-y-auto scroll-slim">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-tr from-blue-500 to-purple-600 text-white font-bold shadow-md shadow-blue-500/20">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-100 text-sm tracking-tight font-sans">ContentMind</span>
                <span className="rounded-full bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-bold text-blue-300">AI</span>
              </div>
              <p className="text-[11px] text-slate-400">Growth Analyst</p>
            </div>
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              ◀
            </button>
          )}
        </div>

        {/* Navigation Mode Switcher (Chat vs Spark) */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#141826] p-1 border border-slate-800/80">
          <button
            onClick={() => onSelectTab("chat")}
            className={`rounded-lg py-1.5 text-xs font-medium transition cursor-pointer ${
              activeTab === "chat"
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => onSelectTab("spark")}
            className={`rounded-lg py-1.5 text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === "spark"
                ? "bg-purple-600 text-white shadow-xs font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Spark</span>
            <span className="text-[9px] bg-purple-400/30 px-1 rounded-sm text-purple-200">BETA</span>
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 px-4 py-2.5 text-xs font-semibold text-slate-200 shadow-xs transition active:scale-[0.98] cursor-pointer"
        >
          <span>✏️</span>
          <span>New session</span>
        </button>

        {/* Main Content Modules */}
        <div className="space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Modules
          </div>

          <button
            onClick={() => onQuickPrompt("Analyze my Instagram growth trends, post metrics, and follower engagement rate.")}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition text-left cursor-pointer"
          >
            <span>📱</span>
            <span>Instagram Growth</span>
          </button>

          <button
            onClick={() => onSelectTab("analytics")}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition text-left cursor-pointer ${
              activeTab === "analytics" ? "bg-blue-600/20 text-blue-300 font-semibold" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <span>📊</span>
            <span>YouTube Shorts &amp; Analytics</span>
          </button>

          <button
            onClick={() => onQuickPrompt("Generate a 7-day viral video script outline for my Reels and Shorts.")}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition text-left cursor-pointer"
          >
            <span>🎬</span>
            <span>Reels &amp; Video Scripts</span>
          </button>

          <button
            onClick={onConnect}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition text-left cursor-pointer"
          >
            <span>⚙️</span>
            <span>Connect Platforms &amp; Data</span>
          </button>
        </div>

        {/* Connected Brands */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Connected Brands
            </span>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 transition cursor-pointer"
            >
              + Add
            </button>
          </div>

          {showAddForm && (
            <div className="p-2 rounded-xl bg-[#141826] border border-slate-800">
              <CreateBrandForm
                compact
                onCreate={async (n, d) => {
                  const b = await onCreateBrand(n, d);
                  setShowAddForm(false);
                  return b;
                }}
              />
            </div>
          )}

          <div className="space-y-1 max-h-36 overflow-y-auto scroll-slim">
            {brands.length === 0 ? (
              <p className="px-2 text-xs text-slate-500 italic">No brands created yet.</p>
            ) : (
              brands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => onSelectBrand(b)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer ${
                    activeBrand?.id === b.id
                      ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <span className="truncate">{b.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">#{b.id}</span>
                </button>
              ))
            )}
          </div>

          {activeBrand && <StatsCards brandId={activeBrand.id} key={`${activeBrand.id}-${refreshKey}`} />}
        </div>

        {/* Quick Strategy Topics */}
        <div className="space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Quick Strategy Topics
          </div>
          {QUICK_TOPICS.map((t) => (
            <button
              key={t.label}
              onClick={() => onQuickPrompt(t.prompt)}
              className="w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition cursor-pointer"
            >
              • {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* System Status Indicators */}
      <div className="pt-4 border-t border-slate-800/60 space-y-1.5">
        <HealthDot
          ok={health ? Boolean(health.grok_configured || health.gemini_configured) : null}
          label={health?.gemini_configured ? "Gemini 3.5 API Active" : "LLM API Configured"}
        />
        <HealthDot ok={health?.hindsight ?? false} label="Hindsight Vector Memory" />
      </div>
    </aside>
  );
}
