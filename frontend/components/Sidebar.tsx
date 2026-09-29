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
    <div className={compact ? "space-y-2" : "space-y-2 w-full"}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void submit()}
        placeholder="Brand name (e.g. Acme Coffee)"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none"
      />
      <button
        onClick={() => void submit()}
        disabled={!name.trim() || busy}
        className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
      >
        {busy ? "Creating…" : "Create brand"}
      </button>
    </div>
  );
}

function HealthDot({ ok, label }: { ok: boolean | null; label: string }) {
  const color =
    ok === null ? "bg-zinc-600" : ok ? "bg-emerald-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
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
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-zinc-800/60 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">Followers</div>
        <div className="text-sm font-semibold">
          {stats.followers !== null ? fmt(stats.followers) : "—"}
        </div>
      </div>
      <div className="rounded-lg bg-zinc-800/60 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">Posts seen</div>
        <div className="text-sm font-semibold">{fmt(stats.post_count)}</div>
      </div>
      <div className="rounded-lg bg-zinc-800/60 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">Likes</div>
        <div className="text-sm font-semibold">{fmt(stats.total_likes)}</div>
      </div>
      <div className="rounded-lg bg-zinc-800/60 px-2.5 py-2">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500">Views</div>
        <div className="text-sm font-semibold">{fmt(stats.total_views)}</div>
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
}: {
  brands: Brand[];
  activeBrand: Brand | null;
  health: Health | null;
  onSelect: (brand: Brand) => void;
  onCreate: (name: string, description: string) => Promise<void> | void;
  onConnect: () => void;
  refreshKey: number;
}) {
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <div className="text-sm font-semibold">BrandPulse</div>
            <div className="text-[11px] text-zinc-500">Grok × Hindsight</div>
          </div>
        </div>
      </div>

      <div className="scroll-slim flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600">
          Brands
        </div>
        {brands.length === 0 && (
          <p className="mb-3 px-1 text-xs text-zinc-600">No brands yet.</p>
        )}
        <div className="space-y-1">
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => onSelect(brand)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                activeBrand?.id === brand.id
                  ? "bg-sky-600/20 text-sky-200"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <div className="truncate">{brand.name}</div>
              {brand.platforms.length > 0 && (
                <div className="text-[10px] text-zinc-500">
                  {brand.platforms.join(" · ")}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-3 border-t border-zinc-800 pt-3">
          <CreateBrandForm onCreate={onCreate} compact />
        </div>

        {activeBrand && (
          <>
            <StatsCards key={`${activeBrand.id}-${refreshKey}`} brandId={activeBrand.id} />
            <button
              onClick={onConnect}
              className="mt-3 w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              ⚙️ Connections & data
            </button>
          </>
        )}
      </div>

      <div className="space-y-1 border-t border-zinc-800 px-4 py-3">
        <HealthDot ok={health ? health.hindsight : null} label="Hindsight memory" />
        <HealthDot ok={health ? health.grok_configured : null} label="Grok API key" />
        <HealthDot
          ok={health ? health.scheduler : null}
          label="Auto-collector"
        />
      </div>
    </aside>
  );
}
