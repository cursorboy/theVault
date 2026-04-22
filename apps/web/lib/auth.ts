"use client";
import { api, setToken, getToken } from "./api";

export async function initAuthFromUrl(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Check URL for ?token=
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    try {
      await api.verifyToken(urlToken);
      setToken(urlToken);
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
      return true;
    } catch {
      return false;
    }
  }

  // Check existing stored token
  const stored = getToken();
  if (stored) {
    try {
      await api.verifyToken(stored);
      return true;
    } catch {
      localStorage.removeItem("rv_token");
      return false;
    }
  }
  return false;
}
