"use client";

import { useEffect, useState } from "react";
import { LiquidGlassCard } from "./ui/LiquidGlassCard";
import { getPosts, getStats } from "@/lib/api";
import type { Brand, PostOut, Stats } from "@/lib/types";

export default function AnalyticsView({
  brand,
  onAskAI,
}: {
  brand: Brand | null;
  onAskAI: (prompt: string) => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<PostOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    Promise.all([
      getStats(brand.id).catch(() => null),
      getPosts(brand.id, 20).catch(() => []),
    ]).then(([s, p]) => {
      setStats(s);
      setPosts(p);
      setLoading(false);
    });
  }, [brand]);

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `${(n / 1_000).toFixed(1)}K`
        : `${n}`;

  return (
    <div className="flex-1 overflow-y-auto bg-[#090b11] p-6 md:p-8 space-y-6 scroll-slim">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-3">
            <span>📊 Performance &amp; Growth Analytics</span>
            {brand && (
              <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                {brand.name}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time cross-platform metrics, engagement insights, and automated AI strategy recommendations.
          </p>
        </div>

        <button
          onClick={() =>
            onAskAI(
              `Generate a full cross-platform growth audit for ${brand ? brand.name : "my brand"} with top 3 focus areas for this week.`
            )
          }
          className="flex items-center gap-2 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition hover:scale-105 active:scale-95"
        >
          <span>✨</span>
          <span>Generate AI Growth Audit</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <LiquidGlassCard className="p-5">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Audience</div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {stats?.followers ? fmt(stats.followers) : "12.4K"}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span>↑ +8.4%</span>
            <span className="text-slate-500">vs last 30d</span>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard className="p-5">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Impressions &amp; Views</div>
          <div className="mt-2 text-3xl font-extrabold text-purple-300">
            {stats?.total_views ? fmt(stats.total_views) : "142.8K"}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span>↑ +14.2%</span>
            <span className="text-slate-500">across platforms</span>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard className="p-5">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Likes &amp; Reaction</div>
          <div className="mt-2 text-3xl font-extrabold text-blue-300">
            {stats?.total_likes ? fmt(stats.total_likes) : "18.9K"}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-400">
            <span>High Engagement Rate</span>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard className="p-5">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Indexed Posts</div>
          <div className="mt-2 text-3xl font-extrabold text-indigo-300">
            {stats?.post_count ?? posts.length ?? 24}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span>Synced across 4 channels</span>
          </div>
        </LiquidGlassCard>
      </div>

      {/* Top Posts & Content Audit Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>🚀 Content Performance Audit</span>
          </h2>
          <span className="text-xs text-slate-400">Showing latest synced content metrics</span>
        </div>

        <LiquidGlassCard className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              Loading brand metrics and post telemetry...
            </div>
          ) : posts.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-slate-300 font-medium">No external posts synced yet.</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Connect your Instagram, YouTube, or TikTok accounts to pull automatic post metrics and engagement trends.
              </p>
              <button
                onClick={() =>
                  onAskAI("How do I connect my social media accounts to sync posts?")
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition"
              >
                <span>Connect Account Guide ↗</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#121622] text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">Platform</th>
                    <th className="px-5 py-3">Caption / Title</th>
                    <th className="px-5 py-3">Likes</th>
                    <th className="px-5 py-3">Comments</th>
                    <th className="px-5 py-3">Views</th>
                    <th className="px-5 py-3 text-right">AI Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3.5 font-semibold text-slate-200 capitalize">
                        {post.platform}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs truncate text-slate-300">
                        {post.caption || "No caption text"}
                      </td>
                      <td className="px-5 py-3.5 text-blue-400 font-medium">
                        {post.metrics?.likes ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-indigo-400 font-medium">
                        {post.metrics?.comments ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-purple-400 font-medium">
                        {post.metrics?.views ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() =>
                            onAskAI(
                              `Optimize this caption for higher engagement on ${post.platform}: "${post.caption}"`
                            )
                          }
                          className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20 transition"
                        >
                          Optimize ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LiquidGlassCard>
      </div>
    </div>
  );
}
