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
    if (!activeBrand || activity !== null) return;

    const history: ChatTurn[] = turns.map((t) => ({
      role: t.role,
      content: t.content,
    }));

    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setActivity({ label: "Recalling past content facts & analytics..." });

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

        {/* Main Content View */}
        {!activeBrand ? (
          <div className="flex flex-1 items-center justify-center p-6 bg-gemini-glow">
            <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-[#121622]/90 p-8 text-center shadow-2xl backdrop-blur-xl animate-fade-in-up">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-500 via-indigo-500 to-purple-600 text-2xl text-white shadow-lg">

                ✨
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white">Add Your Social Media Brand</h2>
              <p className="mb-6 text-xs text-slate-400 leading-relaxed">
                Connect your Instagram, YouTube, TikTok or Social Media brand profile. ContentMind AI will observe your content metrics and generate data-backed growth strategies.
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
            <ChatInput
              disabled={disabled}
              onSend={sendMessage}
              onOpenConnect={() => setShowConnect(true)}
            />
          </>
        )}
      </section>

      {showConnect && activeBrand && (
        <ConnectPanel brand={activeBrand} onClose={() => setShowConnect(false)} />
      )}
    </main>
  );
}


