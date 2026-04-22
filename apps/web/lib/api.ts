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
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
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
  save_id: string;
  fire_at: string;
  recur: string | null;
  status: string;
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

  listReminders: () => apiFetch<Reminder[]>("/api/reminders"),
  createReminder: (body: { save_id: string; fire_at: string; recur?: string }) =>
    apiFetch<Reminder>("/api/reminders", { method: "POST", body: JSON.stringify(body) }),
  cancelReminder: (id: string) =>
    apiFetch<void>(`/api/reminders/${id}`, { method: "DELETE" }),

  getDigest: () => apiFetch<DigestSettings>("/api/digest"),
  updateDigest: (body: Partial<DigestSettings>) =>
    apiFetch<DigestSettings>("/api/digest", { method: "PATCH", body: JSON.stringify(body) }),
};
