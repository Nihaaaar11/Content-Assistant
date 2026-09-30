"use client";

import { useState } from "react";

import { connectPlatform, ingestManual, ingestNow, runDigest } from "@/lib/api";
import type { Brand } from "@/lib/types";

type Tab = "connect" | "paste" | "actions";

export default function ConnectPanel({
  brand,
  onClose,
}: {
  brand: Brand;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("connect");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="scroll-slim h-full w-full max-w-md overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{brand.name} — data setup</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 flex gap-1 rounded-lg bg-zinc-800/60 p-1 text-sm">
          {(
            [
              ["connect", "Connect"],
              ["paste", "Paste data"],
              ["actions", "Actions"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-md px-3 py-1.5 transition ${tab === key ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {notice && (
          <div
            className={`mb-4 rounded-lg px-3 py-2 text-xs ${notice.kind === "ok"
                ? "bg-purple-950/60 border border-[#A855F7]/40 text-purple-200"
                : "bg-purple-950/90 border border-red-500/50 text-red-300"
              }`}
          >
            {notice.text}
          </div>
        )}

        {tab === "connect" && <ConnectTab brand={brand} setNotice={setNotice} />}
        {tab === "paste" && <PasteTab brand={brand} setNotice={setNotice} />}
        {tab === "actions" && <ActionsTab brand={brand} setNotice={setNotice} />}
      </div>
    </div>
  );
}

function ConnectTab({
  brand,
  setNotice,
}: {
  brand: Brand;
  setNotice: (n: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  return (
    <div className="space-y-4">
      <YouTubeForm
        brand={brand}
        setNotice={setNotice}
        alreadyConnected={(brand.platforms || []).includes("youtube")}
      />
      <InstagramForm
        brand={brand}
        setNotice={setNotice}
        alreadyConnected={(brand.platforms || []).includes("instagram")}
      />
    </div>
  );
}

function YouTubeForm({
  brand,
  setNotice,
  alreadyConnected,
}: {
  brand: Brand;
  setNotice: (n: { kind: "ok" | "err"; text: string } | null) => void;
  alreadyConnected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [handle, setHandle] = useState("");

  const connect = async () => {
    try {
      await connectPlatform(brand.id, "youtube", handle, apiKey ? { api_key: apiKey } : {});
      setNotice({ kind: "ok", text: "YouTube connected (uses .env keys when left blank)." });
      setOpen(false);
      window.location.reload();
    } catch (e) {
      setNotice({ kind: "err", text: String(e) });
    }
  };

  return (
    <div className="rounded-xl border border-purple-950/60 bg-[#140a24]/60 p-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-medium text-white">
          YouTube {alreadyConnected && <span className="text-[#A855F7] font-semibold">· connected</span>}
        </div>
        <button onClick={() => setOpen(!open)} className="text-xs text-[#A855F7] font-medium">
          {open ? "Hide" : "Setup"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Leave fields blank to use the server&apos;s configured keys. API key = public data;
        OAuth (env) = your channel&apos;s full stats.
      </p>
      {open && (
        <div className="mt-3 space-y-2">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="Channel handle, e.g. @acmecoffee"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="YouTube API key (optional)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <button
            onClick={() => void connect()}
            className="w-full rounded-lg bg-[#A855F7] px-3 py-2 text-sm font-medium hover:bg-[#9333EA] transition shadow-md shadow-[#A855F7]/20"
          >
            Connect YouTube
          </button>
        </div>
      )}
    </div>
  );
}

function InstagramForm({
  brand,
  setNotice,
  alreadyConnected,
}: {
  brand: Brand;
  setNotice: (n: { kind: "ok" | "err"; text: string } | null) => void;
  alreadyConnected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");

  const connect = async () => {
    try {
      const creds: Record<string, string> = {};
      if (token) creds.access_token = token;
      if (userId) creds.user_id = userId;
      await connectPlatform(brand.id, "instagram", "", creds);
      setNotice({ kind: "ok", text: "Instagram connected." });
      setOpen(false);
      window.location.reload();
    } catch (e) {
      setNotice({ kind: "err", text: String(e) });
    }
  };

  return (
    <div className="rounded-xl border border-purple-950/60 bg-[#140a24]/60 p-4">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-medium text-white">
          Instagram {alreadyConnected && <span className="text-[#A855F7] font-semibold">· connected</span>}
        </div>
        <button onClick={() => setOpen(!open)} className="text-xs text-[#A855F7] font-medium">
          {open ? "Hide" : "Setup"}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        Needs a Meta app token (instagram_basic + instagram_manage_insights) and the IG
        professional account ID. Blank fields fall back to server .env values.
      </p>
      {open && (
        <div className="mt-3 space-y-2">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Access token (optional)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Instagram user ID "
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
          <button
            onClick={() => void connect()}
            className="w-full rounded-lg bg-[#A855F7] px-3 py-2 text-sm font-medium hover:bg-[#9333EA] transition shadow-md shadow-[#A855F7]/20"
          >
            Connect Instagram
          </button>
        </div>
      )}
    </div>
  );
}

function PasteTab({
  brand,
  setNotice,
}: {
  brand: Brand;
  setNotice: (n: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [csv, setCsv] = useState("");

  const submit = async () => {
    try {
      const res = await ingestManual(brand.id, csv);
      setNotice({ kind: "ok", text: `Ingested ${res.new_posts} post(s).` });
      setCsv("");
    } catch (e) {
      setNotice({ kind: "err", text: String(e) });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Paste rows as CSV. Columns:{" "}
        <code className="text-zinc-400">
          post_id, caption, published_at, likes, comments, views
        </code>{" "}
        (platform/url/shares/saves/reach optional).
      </p>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={9}
        placeholder={`post_id,caption,published_at,likes,comments,views\np1,Launch reel,2024-03-15,320,41,12000`}
        className="scroll-slim w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs"
      />
      <button
        onClick={() => void submit()}
        disabled={!csv.trim()}
        className="w-full rounded-lg bg-[#A855F7] px-3 py-2 text-sm font-medium hover:bg-[#9333EA] transition shadow-md shadow-[#A855F7]/20 disabled:opacity-40"
      >
        Ingest rows
      </button>
    </div>
  );
}

function ActionsTab({
  brand,
  setNotice,
}: {
  brand: Brand;
  setNotice: (n: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const collect = async () => {
    setBusy("collect");
    try {
      const res = await ingestNow(brand.id);
      setNotice({
        kind: "ok",
        text: `Collected: ${res.new_posts} new, ${res.refreshed} updated.${res.errors.length ? ` Warnings: ${res.errors.join("; ")}` : ""
          }`,
      });
    } catch (e) {
      setNotice({ kind: "err", text: String(e) });
    } finally {
      setBusy(null);
    }
  };

  const digest = async () => {
    setBusy("digest");
    try {
      const res = await runDigest(brand.id);
      setNotice({ kind: "ok", text: `Digest saved to memory:\n${res.digest.slice(0, 300)}…` });
    } catch (e) {
      setNotice({ kind: "err", text: String(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Collection also runs automatically every COLLECTION_INTERVAL_HOURS (default 6), and a
        deeper digest is written daily into memory.
      </p>
      <button
        onClick={() => void collect()}
        disabled={busy !== null}
        className="w-full rounded-lg bg-[#A855F7] px-3 py-2 text-sm font-medium hover:bg-[#9333EA] transition shadow-md shadow-[#A855F7]/20 disabled:opacity-40"
      >
        {busy === "collect" ? "Collecting…" : "Collect now"}
      </button>
      <button
        onClick={() => void digest()}
        disabled={busy !== null}
        className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-40"
      >
        {busy === "digest" ? "Writing digest…" : "Run daily digest now"}
      </button>
    </div>
  );
}
