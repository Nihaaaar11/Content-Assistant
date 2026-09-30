"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ChatInput from "@/components/ChatInput";
import ChatWindow, { type ActivityState } from "@/components/ChatWindow";
import Sidebar from "@/components/Sidebar";
import ConnectPanel from "@/components/ConnectPanel";
import AnalyticsView from "@/components/AnalyticsView";
import SparkView from "@/components/SparkView";
import StaggeredMenu, { type StaggeredMenuItem, type StaggeredMenuSocialItem } from "@/components/StaggeredMenu";
import { listBrands, createBrand, getHealth, streamChat } from "@/lib/api";
import type { Brand, ChatTurn, Health } from "@/lib/types";

export default function Home() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [activity, setActivity] = useState<ActivityState>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat"); // "chat" | "spark" | "analytics"
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refreshBrands = useCallback(async () => {
    try {
      const list = await listBrands();
      setBrands(list);
      if (list.length > 0) {
        setActiveBrand((current) =>
          current ? list.find((b) => b.id === current.id) ?? list[0] : list[0]
        );
      }
    } catch {
      /* backend starting */
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

  const handleCreateBrand = async (name: string, description = ""): Promise<Brand | null> => {
    try {
      const brand = await createBrand(name, description);
      await refreshBrands();
      setActiveBrand(brand);
      return brand;
    } catch {
      return null;
    }
  };

  const handleNewChat = () => {
    setTurns([]);
    setActivity(null);
    setActiveTab("chat");
  };

  const sendMessage = async (message: string) => {
    if (activity !== null || !message.trim()) return;

    setActiveTab("chat");
    let targetBrand: Brand | null = activeBrand;

    // Auto-create or select fallback brand if none selected yet
    if (!targetBrand) {
      if (brands.length > 0) {
        targetBrand = brands[0];
        setActiveBrand(targetBrand);
      } else {
        const created = await handleCreateBrand("Default Brand", "Auto-created workspace");
        targetBrand = created || { id: 1, name: "Default Brand", description: "", platforms: [] };
        setActiveBrand(targetBrand);
      }
    }

    if (!targetBrand) return;

    const history: ChatTurn[] = turns.map((t) => ({
      role: t.role,
      content: t.content,
    }));

    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setActivity({ label: "Recalling brand memories & analyzing metrics..." });

    let assistant = "";
    let started = false;

    await streamChat(targetBrand.id, message, history, {
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
        setTurns((prev) => [...prev, { role: "assistant", content: msg }]);
      },
      onDone: () => setActivity(null),
    });
  };

  const isStreaming = activity !== null;

  const menuItems: StaggeredMenuItem[] = [
    {
      label: "Chat",
      ariaLabel: "Go to chat session",
      onClick: () => setActiveTab("chat"),
    },
    {
      label: "Spark",
      ariaLabel: "Open Spark Idea Engine",
      onClick: () => setActiveTab("spark"),
    },
    {
      label: "Analytics",
      ariaLabel: "View Growth Analytics",
      onClick: () => setActiveTab("analytics"),
    },
    {
      label: "Connections",
      ariaLabel: "Manage Connected Platforms & Data",
      onClick: () => setShowConnect(true),
    },
    {
      label: "New Chat",
      ariaLabel: "Start a new chat session",
      onClick: handleNewChat,
    },
  ];

  const socialItems: StaggeredMenuSocialItem[] = [
    { label: "YouTube", link: "https://youtube.com" },
    { label: "Instagram", link: "https://instagram.com" },
    { label: "X", link: "https://x.com" },
    { label: "LinkedIn", link: "https://linkedin.com" },
    { label: "GitHub", link: "https://github.com" },
  ];

  return (
    <main className="relative flex h-screen overflow-hidden bg-[#090514] text-white font-sans">
      <StaggeredMenu
        position="right"
        isFixed={true}
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor="#ffffff"
        openMenuButtonColor="#A855F7"
        changeMenuColorOnOpen={true}
        colors={["#2e1065", "#581c87", "#7e22ce", "#A855F7"]}
        accentColor="#A855F7"
      />

      <Sidebar
        brands={brands}
        activeBrand={activeBrand}
        health={health}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === "connect") {
            setShowConnect(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onSelectBrand={(b) => {
          setActiveBrand(b);
          setTurns([]);
        }}
        onCreateBrand={handleCreateBrand}
        onConnect={() => setShowConnect(true)}
        refreshKey={turns.length}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        onNewChat={handleNewChat}
        onQuickPrompt={sendMessage}
      />

      <section className="flex flex-1 flex-col overflow-hidden bg-[#090514]">
        {/* Gemini ContentMind Header Bar */}
        <header className="flex h-14 items-center justify-between border-b border-purple-950/60 bg-[#090514] px-6">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                title="Expand sidebar"
                className="rounded-lg px-2.5 py-1 text-purple-300/70 hover:bg-purple-950 hover:text-white transition cursor-pointer text-xs font-medium"
              >
                Menu
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-white">ContentMind</span>
              {activeBrand && (
                <span className="rounded-full bg-[#A855F7]/10 border border-[#A855F7]/25 px-2.5 py-0.5 text-xs font-medium text-purple-300">
                  {activeBrand.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mr-28">
            <button
              onClick={() => setShowConnect(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#140a24] hover:bg-purple-950 border border-purple-900/40 px-3.5 py-1.5 text-xs font-medium text-purple-200 transition shadow-xs cursor-pointer"
            >
              <span>Connections &amp; data</span>
            </button>

            <button
              onClick={handleNewChat}
              title="New session"
              className="rounded-lg px-2.5 py-1 text-purple-300/70 hover:bg-purple-950 hover:text-white transition cursor-pointer text-xs font-medium"
            >
              New Chat
            </button>
          </div>
        </header>

        {/* Tab Content Rendering */}
        {activeTab === "spark" ? (
          <SparkView onAskAI={sendMessage} />
        ) : activeTab === "analytics" ? (
          <AnalyticsView brand={activeBrand} onAskAI={sendMessage} />
        ) : (
          <ChatWindow
            brandName={activeBrand ? activeBrand.name : "ContentMind"}
            turns={turns}
            activity={activity}
            onSelectSuggestion={(prompt) => void sendMessage(prompt)}
          />
        )}

        {/* Floating Input Bar */}
        <ChatInput
          disabled={isStreaming}
          onSend={sendMessage}
          onOpenConnect={() => setShowConnect(true)}
        />
      </section>

      {showConnect && (
        <ConnectPanel
          brand={activeBrand || brands[0] || { id: 1, name: "Default Brand", description: "", platforms: [] }}
          onClose={() => setShowConnect(false)}
        />
      )}
    </main>
  );
}
