/** Shared types for API payloads and chat protocol. */

export interface Brand {
  id: number;
  name: string;
  description: string;
  platforms?: string[];
  created_at?: string;
}

export interface PostMetrics {
  likes: number;
  comments: number;
  views: number;
  shares?: number;
  saves?: number;
  reach?: number;
}

export interface PostOut {
  id: number;
  platform: string;
  post_id: string;
  url: string;
  caption: string;
  published_at: string | null;
  metrics: PostMetrics | null;
}

export interface Stats {
  post_count: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  followers: number | null;
  top_posts: {
    caption: string;
    platform: string;
    url: string;
    engagement: number;
    metrics: PostMetrics | null;
  }[];
}

export interface Health {
  status: string;
  hindsight: boolean;
  grok_configured: boolean;
  gemini_configured?: boolean;
  scheduler: boolean;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type ChatEvent =
  | { event: "tool"; data: { status: string; name?: string } }
  | { event: "token"; data: { text: string } }
  | { event: "done"; data: { finish: boolean } }
  | { event: "error"; data: { message: string } };
