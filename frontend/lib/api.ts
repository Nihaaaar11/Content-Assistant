/** Typed API client for the BrandPulse backend. */

import type { Brand, ChatTurn, Health, PostOut, Stats } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (err: any) {
    throw new Error(
      `Failed to connect to backend (${API_URL}): ${err?.message || "Server unreachable"}`
    );
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* not json */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ---- health ----
export function getHealth(): Promise<Health> {
  return request<Health>("/api/health");
}

// ---- brands ----
export function listBrands(): Promise<Brand[]> {
  return request<Brand[]>("/api/brands");
}

export function createBrand(name: string, description = ""): Promise<Brand> {
  return request<Brand>("/api/brands", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

// ---- connections ----
export function connectPlatform(
  brandId: number,
  platform: string,
  handle: string,
  credentials: Record<string, string>
): Promise<{ ok: boolean; message: string }> {
  return request(`/api/brands/${brandId}/connect`, {
    method: "POST",
    body: JSON.stringify({ platform, handle, credentials }),
  });
}

export function disconnectPlatform(
  brandId: number,
  platform: string
): Promise<{ ok: boolean }> {
  return request(`/api/brands/${brandId}/connect/${platform}`, {
    method: "DELETE",
  });
}

// ---- ingestion ----
export function ingestNow(brandId: number): Promise<{ ok: boolean; new_posts: number; refreshed: number; errors: string[] }> {
  return request(`/api/brands/${brandId}/ingest`, { method: "POST" });
}

export function ingestManual(
  brandId: number,
  csvText: string
): Promise<{ ok: boolean; new_posts: number }> {
  return request(`/api/brands/${brandId}/ingest/manual`, {
    method: "POST",
    body: JSON.stringify({ csv_text: csvText }),
  });
}

export function runDigest(brandId: number): Promise<{ digest: string }> {
  return request(`/api/brands/${brandId}/digest`, { method: "POST" });
}

// ---- stats & posts ----
export function getStats(brandId: number): Promise<Stats> {
  return request<Stats>(`/api/brands/${brandId}/stats`);
}

export function getPosts(brandId: number, limit = 20): Promise<PostOut[]> {
  return request<PostOut[]>(`/api/brands/${brandId}/posts?limit=${limit}`);
}

// ---- chat via SSE ----
export interface StreamHandlers {
  onTool: (status: string) => void;
  onToken: (text: string) => void;
  onError: (message: string) => void;
  onDone: () => void;
}

export async function streamChat(
  brandId: number,
  message: string,
  history: ChatTurn[],
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id: brandId, message, history }),
      signal,
    });
  } catch (err: any) {
    if (err.name === "AbortError") return;
    handlers.onError(
      `Failed to connect to backend server at ${API_URL}. Please check if the FastAPI backend is running.`
    );
    return;
  }
  if (!res.ok || !res.body) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* not json */
    }
    handlers.onError(detail);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      let event = "message";
      let data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (!data) continue;
      try {
        const payload = JSON.parse(data);
        if (event === "token") handlers.onToken(payload.text ?? "");
        else if (event === "tool") handlers.onTool(payload.status ?? "");
        else if (event === "error") handlers.onError(payload.message ?? "Unknown error");
        else if (event === "done") handlers.onDone();
      } catch {
        /* malformed frame — skip */
      }
    }
  }
  handlers.onDone();
}
