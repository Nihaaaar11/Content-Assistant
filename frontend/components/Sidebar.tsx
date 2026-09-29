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
      <div className="relative">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="Instagram Account / Brand Name..."
          className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950/70 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition"
        />
      </div>
      <button
        onClick={() => void submit()}
        disabled={!name.trim() || busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 active:scale-[0.98] disabled:opacity-40 disabled:hover:opacity-40"
      >
        <span>+</span>
        {busy ? "Creating Account..." : "Create Account"}
      </button>
    </div>
  );
}

function HealthDot({ ok, label }: { ok: boolean | null; label: string }) {
  const color =
    ok === null ? "bg-zinc-600 shadow-none" : ok ? "bg-emerald-400 shadow-emerald-500/50" : "bg-rose-500 shadow-rose-500/50";
  return (
    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
      <span className={`h-2 w-2 rounded-full shadow-sm ${color}`} />
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
    <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3 backdrop-blur-xs">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        Account Metrics
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800/50">
          <div className="text-[10px] uppercase font-medium tracking-wide text-zinc-400">Followers</div>
          <div className="text-base font-bold text-white">
            {stats.followers !== null ? fmt(stats.followers) : "—"}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800/50">
          <div className="text-[10px] uppercase font-medium tracking-wide text-zinc-400">Posts Seen</div>
          <div className="text-base font-bold text-white">{fmt(stats.post_count)}</div>
        </div>
        <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800/50">
          <div className="text-[10px] uppercase font-medium tracking-wide text-zinc-400">Total Likes</div>
          <div className="text-base font-bold text-rose-400">{fmt(stats.total_likes)}</div>
        </div>
        <div className="rounded-lg bg-zinc-900/80 p-2.5 border border-zinc-800/50">
          <div className="text-[10px] uppercase font-medium tracking-wide text-zinc-400">Reel Views</div>
          <div className="text-base font-bold text-purple-400">{fmt(stats.total_views)}</div>
        </div>
      </div>
    </div>
  );
}

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
}) {
  const [showCreate, setShowCreate] = useState(false);

  if (collapsed) {
    return (
      <aside className="flex w-16 shrink-0 flex-col items-center border-r border-zinc-800/60 bg-zinc-950/90 py-4">
        <button
          onClick={onToggleCollapse}
          title="Expand sidebar"
          className="mb-6 rounded-xl p-2 text-zinc-400 hover:bg-zinc-800/70 hover:text-white transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-rose-500/20">
          ✨
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto w-full px-2 scroll-slim">
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              title={b.name}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold transition ${
                activeBrand?.id === b.id
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {b.name.substring(0, 2).toUpperCase()}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-md shadow-rose-500/20">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">InstaPulse AI</span>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] font-medium text-zinc-400">Instagram Growth Agent</div>
          </div>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Main List */}
      <div className="scroll-slim flex-1 overflow-y-auto px-3 py-3">
        {/* New Account Button */}
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="mb-3 flex w-full items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800/70"
        >
          <span className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs">+</span>
            <span>New Instagram Account</span>
          </span>
          <span className="text-zinc-500 text-xs">{showCreate ? "▲" : "▼"}</span>
        </button>

        {showCreate && (
          <div className="mb-4 rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-3 shadow-inner">
            <CreateBrandForm onCreate={onCreate} compact />
          </div>
        )}

        <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Your Accounts
        </div>

        {brands.length === 0 && !showCreate && (
          <div className="my-2 rounded-xl border border-dashed border-zinc-800 p-4 text-center">
            <p className="text-xs text-zinc-400">No Instagram accounts added yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 text-xs font-medium text-rose-400 hover:underline"
            >
              Add your first account
            </button>
          </div>
        )}

        <div className="space-y-1">
          {brands.map((brand) => {
            const isSelected = activeBrand?.id === brand.id;
            return (
              <button
                key={brand.id}
                onClick={() => onSelect(brand)}
                className={`group flex w-full flex-col gap-0.5 rounded-xl px-3.5 py-2.5 text-left transition ${
                  isSelected
                    ? "bg-gradient-to-r from-rose-500/20 via-purple-500/15 to-transparent text-white border border-rose-500/30"
                    : "text-zinc-300 hover:bg-zinc-900/80 hover:text-white border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold">{brand.name}</span>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span>📷 Instagram</span>
                  {brand.platforms.includes("youtube") && <span>· ▶️ YouTube</span>}
                </div>
              </button>
            );
          })}
        </div>

        {activeBrand && (
          <>
            <StatsCards key={`${activeBrand.id}-${refreshKey}`} brandId={activeBrand.id} />

            <button
              onClick={onConnect}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <span>⚙️</span>
              <span>Data Setup & Connect</span>
            </button>
          </>
        )}
      </div>

      {/* Footer System Health */}
      <div className="space-y-1.5 border-t border-zinc-800/60 bg-zinc-950/40 px-4 py-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Agent System Status
        </div>
        <HealthDot ok={health ? health.hindsight : null} label="Hindsight Memory Bank" />
        <HealthDot ok={health ? health.grok_configured : null} label="Grok 4 Intelligence" />
        <HealthDot ok={health ? health.scheduler : null} label="Auto-Collector Pipeline" />
      </div>
    </aside>
  );
}

