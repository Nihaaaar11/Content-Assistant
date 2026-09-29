"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import AnalyticsView from "@/components/AnalyticsView";
import SparkView from "@/components/SparkView";
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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refreshBrands = useCallback(async () => {
    try {
      const list = await listBrands();
      setBrands(list);
      setActiveBrand((current) =>
        current ? list.find((b) => b.id === current.id) ?? list[0] ?? null : list[0] ?? null
      );
    } catch {
      /* backend down — sidebar shows health state */
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

  const disabled = !activeBrand || activity !== null;

  return (
    <main className="flex h-screen overflow-hidden">
      <Sidebar
        brands={brands}
        activeBrand={activeBrand}
        health={health}
        onSelect={setActiveBrand}
        onCreate={handleCreateBrand}
        onConnect={() => setShowConnect(true)}
        refreshKey={turns.length}
      />

      <section className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold">
              BrandPulse{activeBrand ? ` — ${activeBrand.name}` : ""}
            </h1>
            <p className="text-xs text-zinc-500">
              Your AI growth analyst · remembers every post, metric and plan via Hindsight
            </p>
          </div>
          {activeBrand && (
            <button
              onClick={() => setShowConnect(true)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Connections & data
            </button>
          )}
        </header>

        {!activeBrand ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mb-4 text-5xl">📈</div>
              <h2 className="mb-2 text-xl font-semibold">Create your first brand</h2>
              <p className="mb-6 text-sm text-zinc-400">
                BrandPulse will observe its social content, remember what works, and help you
                plan with evidence.
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
            />
            <ChatInput
              disabled={disabled}
              onSend={async (message) => {
                const history: ChatTurn[] = turns.map((t) => ({
                  role: t.role,
                  content: t.content,
                }));
                setTurns((prev) => [...prev, { role: "user", content: message }]);
                setActivity({ label: "Recalling brand memories…" });

                let assistant = "";
                let started = false;

                const { streamChat } = await import("@/lib/api");
                await streamChat(
                  activeBrand.id,
                  message,
                  history,
                  {
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
                      setTurns((prev) => [
                        ...prev,
                        { role: "assistant", content: `⚠️ ${msg}` },
                      ]);
                    },
                    onDone: () => setActivity(null),
                  }
                );
              }}
            />
          </>
        )}
      </section>

      {showConnect && activeBrand && (
        <ConnectPanel
          brand={activeBrand}
          onClose={() => setShowConnect(false)}
        />
      )}
    </main>
  );
}
