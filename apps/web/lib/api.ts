const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rv_token");
}

export function setToken(token: string): void {
  localStorage.setItem("rv_token", token);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Types
export interface Save {
  id: string;
  platform: "tiktok" | "instagram";
  source_url: string;
  thumbnail_url: string | null;
  duration_secs: number | null;
  title: string | null;
  summary: string | null;
  transcript: string | null;
  tags: string[] | null;
  action_items: string[] | null;
  category_id: number | null;
  cluster_id: string | null;
  status: string;
  created_at: string | null;
}

export interface Category {
  id: number;
  slug: string;
  label: string;
}

export interface Reminder {
  id: string;
  save_id: string | null;
  body: string | null;
  note: string | null;
  fire_at: string;
  recur: string | null;
  status: string;
  save_title?: string | null;
}

export interface Memory {
  id: string;
  kind: string;
  content: string;
  importance: number;
  created_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  source_save_id: string | null;
  source_conversation_id: string | null;
}

export interface MemoryStats {
  total_memories: number;
  memories_by_kind: Record<string, number>;
  saves_count: number;
  conversations_count: number;
  last_30_days: { saves: number; conversations: number; memories_added: number };
}

export interface UserInfo {
  id: string;
  phone: string;
  timezone: string;
  digest_enabled: boolean;
  digest_day: number;
  digest_hour: number;
}

export interface DigestSettings {
  digest_enabled: boolean;
  digest_day: number;
  digest_hour: number;
  timezone: string;
}

// API calls
export const api = {
  verifyToken: (token: string) =>
    apiFetch<UserInfo>(`/auth/verify?token=${encodeURIComponent(token)}`),

  requestLoginCode: (phone: string) =>
    apiFetch<{ ok: boolean; expires_in_seconds: number }>("/auth/request-code", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),

  verifyLoginCode: (phone: string, code: string) =>
    apiFetch<{ ok: boolean; token: string }>("/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),

  listSaves: (params?: { category_id?: number; cluster_id?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.category_id != null) q.set("category_id", String(params.category_id));
    if (params?.cluster_id) q.set("cluster_id", params.cluster_id);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return apiFetch<Save[]>(`/api/saves?${q}`);
  },

  getSave: (id: string) => apiFetch<Save>(`/api/saves/${id}`),
  deleteSave: (id: string) => apiFetch<void>(`/api/saves/${id}`, { method: "DELETE" }),

  searchSaves: (q: string) =>
    apiFetch<Save[]>(`/api/saves/search?q=${encodeURIComponent(q)}`),

  listCategories: () => apiFetch<Category[]>("/api/categories"),

  listReminders: (status?: string) =>
    apiFetch<Reminder[]>(`/api/reminders${status ? `?status=${status}` : ""}`),
  recentReminders: (limit = 20) =>
    apiFetch<Reminder[]>(`/api/reminders/recent?limit=${limit}`),
  createReminder: (body: {
    save_id?: string;
    body?: string;
    note?: string;
    fire_at: string;
    recur?: string;
  }) =>
    apiFetch<Reminder>("/api/reminders", { method: "POST", body: JSON.stringify(body) }),
  snoozeReminder: (id: string, minutes = 60) =>
    apiFetch<Reminder>(`/api/reminders/${id}/snooze?minutes=${minutes}`, {
      method: "POST",
    }),
  doneReminder: (id: string) =>
    apiFetch<Reminder>(`/api/reminders/${id}/done`, { method: "POST" }),
  cancelReminder: (id: string) =>
    apiFetch<void>(`/api/reminders/${id}`, { method: "DELETE" }),

  listMemories: (kind?: string) =>
    apiFetch<Memory[]>(`/api/memories${kind ? `?kind=${kind}` : ""}`),
  forgetMemory: (id: string) =>
    apiFetch<void>(`/api/memories/${id}`, { method: "DELETE" }),
  memoryStats: () => apiFetch<MemoryStats>("/api/memories/stats"),

  getDigest: () => apiFetch<DigestSettings>("/api/digest"),
  updateDigest: (body: Partial<DigestSettings>) =>
    apiFetch<DigestSettings>("/api/digest", { method: "PATCH", body: JSON.stringify(body) }),

  joinWaitlist: (input: { phone: string; name?: string; source?: string }) =>
    apiFetch<{
      ok: boolean;
      position: number;
      already_on_list: boolean;
      joined_at: string | null;
    }>("/api/waitlist", {
      method: "POST",
      body: JSON.stringify({
        phone: input.phone,
        name: input.name,
        source: input.source ?? "web",
      }),
    }),
  waitlistCount: () => apiFetch<{ count: number }>("/api/waitlist/count"),
};
