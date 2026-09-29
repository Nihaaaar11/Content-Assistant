"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChatInput from "@/components/ChatInput";
import ChatWindow, { type ActivityState } from "@/components/ChatWindow";
import Sidebar, { CreateBrandForm } from "@/components/Sidebar";
import ConnectPanel from "@/components/ConnectPanel";
import { listBrands, createBrand, getHealth } from "@/lib/api";
import type { Brand, ChatTurn, Health } from "@/lib/types";

export default function Home() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [activity, setActivity] = useState<ActivityState>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refreshBrands = useCallback(async () => {
    try {
      const list = await listBrands();
      setBrands(list);
      setActiveBrand((current) =>
        current ? list.find((b) => b.id === current.id) ?? list[0] ?? null : list[0] ?? null
      );
    } catch {
      /* backend down — sidebar handles health display */
    }
  }, []);

  useEffect(() => {
    refreshBrands();
    const t = setInterval(async () => {
      try {
        setHealth(await getHealth());
      } catch {
        setHealth(null);
      }
    }, 10_000);
    getHealth().then(setHealth).catch(() => setHealth(null));
    return () => clearInterval(t);
  }, [refreshBrands]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, activity]);

  const handleCreateBrand = async (name: string, description: string) => {
    const brand = await createBrand(name, description);
    await refreshBrands();
    setActiveBrand(brand);
  };

  const sendMessage = async (message: string) => {
    if (!activeBrand || activity !== null) return;

    const history: ChatTurn[] = turns.map((t) => ({
      role: t.role,
      content: t.content,
    }));

    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setActivity({ label: "Recalling Instagram memories & insights..." });

    let assistant = "";
    let started = false;

    const { streamChat } = await import("@/lib/api");
    await streamChat(activeBrand.id, message, history, {
      onTool: (status) => {
        if (!started) setActivity({ label: status });
      },
      onToken: (text) => {
        if (!started) {
          started = true;
          setActivity(null);
        }
        assistant += text;
        setTurns((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return [...prev.slice(0, -1), { role: "assistant", content: assistant }];
          }
          return [...prev, { role: "assistant", content: assistant }];
        });
      },
      onError: (msg) => {
        setActivity(null);
        setTurns((prev) => [...prev, { role: "assistant", content: `⚠️ ${msg}` }]);
      },
      onDone: () => setActivity(null),
    });
  };

  const disabled = !activeBrand || activity !== null;

  return (
    <main className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <Sidebar
        brands={brands}
        activeBrand={activeBrand}
        health={health}
        onSelect={(b) => {
          setActiveBrand(b);
          setTurns([]);
        }}
        onCreate={handleCreateBrand}
        onConnect={() => setShowConnect(true)}
        refreshKey={turns.length}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <section className="flex flex-1 flex-col overflow-hidden bg-zinc-950">
        {/* Gemini/ChatGPT Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/60 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                title="Open sidebar"
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  InstaPulse AI
                </h1>
                {activeBrand && (
                  <span className="flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                    <span>📷</span>
                    <span>{activeBrand.name}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                Instagram Professional Growth Agent · Grok 4 &amp; Hindsight Memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Grok 4 Engine Active</span>
            </div>

            {activeBrand && (
              <button
                onClick={() => setShowConnect(true)}
                className="flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-white shadow-sm"
              >
                <span>⚙️</span>
                <span>Data Setup</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        {!activeBrand ? (
          <div className="flex flex-1 items-center justify-center p-6 bg-radial-glow">
            <div className="max-w-md w-full rounded-3xl border border-zinc-800/80 bg-zinc-900/70 p-8 text-center shadow-2xl backdrop-blur-xl">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-3xl shadow-lg shadow-rose-500/20">
                ✨
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">Add Your Instagram Account</h2>
              <p className="mb-6 text-xs text-zinc-400 leading-relaxed">
                Connect your Instagram Professional account or brand profile. InstaPulse AI will analyze your Reels, posts, and metrics to craft data-backed growth strategies.
              </p>
              <CreateBrandForm onCreate={handleCreateBrand} />
            </div>
          </div>
        ) : (
          <>
            <ChatWindow
              brandName={activeBrand.name}
              turns={turns}
              activity={activity}
              onSelectSuggestion={(prompt) => void sendMessage(prompt)}
            />
            <ChatInput disabled={disabled} onSend={sendMessage} />
          </>
        )}
      </section>

      {showConnect && activeBrand && (
        <ConnectPanel brand={activeBrand} onClose={() => setShowConnect(false)} />
      )}
    </main>
  );
}

