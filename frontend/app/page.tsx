"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChatInput from "@/components/ChatInput";
import ChatWindow, { type ActivityState } from "@/components/ChatWindow";
import Sidebar from "@/components/Sidebar";
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
      /* backend down */
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

  const handleNewChat = () => {
    setTurns([]);
    setActivity(null);
  };

  const sendMessage = async (message: string) => {
    if (activity !== null) return;

    let currentBrand = activeBrand;
    if (!currentBrand) {
      // Auto-initialize default account if no brand created yet
      currentBrand = await createBrand("Durga Trinadh's Account", "Default social media brand");
      await refreshBrands();
      setActiveBrand(currentBrand);
    }

    const history: ChatTurn[] = turns.map((t) => ({
      role: t.role,
      content: t.content,
    }));

    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setActivity({ label: "Recalling past content facts & analytics..." });

    let assistant = "";
    let started = false;

    const { streamChat } = await import("@/lib/api");
    await streamChat(currentBrand.id, message, history, {
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

  const disabled = activity !== null;

  return (
    <main className="flex h-screen overflow-hidden bg-[#090b11] text-slate-100 font-sans">
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
        onNewChat={handleNewChat}
      />

      <section className="flex flex-1 flex-col overflow-hidden bg-[#090b11]">
        {/* Gemini Header Bar matching exact screenshot */}
        <header className="flex h-14 items-center justify-between border-b border-slate-800/40 bg-[#090b11] px-6">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                title="Expand sidebar"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-white">ContentMind</span>
              {activeBrand && (
                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-300">
                  {activeBrand.name}
                </span>
              )}
            </div>
          </div>

          {/* Right side header matching Gemini screenshot 'Get app' button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#181d2a] hover:bg-[#22283a] border border-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition shadow-xs"
            >
              <span>📥</span>
              <span>Get app</span>
            </button>

            <button
              onClick={handleNewChat}
              title="New session"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              ✏️
            </button>
          </div>
        </header>

        {/* Gemini Content View (Always active & smooth) */}
        <ChatWindow
          brandName={activeBrand ? activeBrand.name : ""}
          turns={turns}
          activity={activity}
          onSelectSuggestion={(prompt) => void sendMessage(prompt)}
        />

        <ChatInput
          disabled={disabled}
          onSend={sendMessage}
          onOpenConnect={() => setShowConnect(true)}
        />
      </section>

      {showConnect && activeBrand && (
        <ConnectPanel brand={activeBrand} onClose={() => setShowConnect(false)} />
      )}
    </main>
  );
}



