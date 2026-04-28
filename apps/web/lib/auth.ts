"use client";
import { api, setToken, getToken } from "./api";

const VERIFY_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("auth_timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export async function initAuthFromUrl(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    try {
      await withTimeout(api.verifyToken(urlToken), VERIFY_TIMEOUT_MS);
      setToken(urlToken);
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
      return true;
    } catch {
      return false;
    }
  }

  const stored = getToken();
  if (stored) {
    try {
      await withTimeout(api.verifyToken(stored), VERIFY_TIMEOUT_MS);
      return true;
    } catch {
      // api unreachable or token invalid → drop it and show onboarding
      try {
        localStorage.removeItem("rv_token");
      } catch {}
      return false;
    }
  }
  return false;
}

export function logout(): void {
  try {
    localStorage.removeItem("rv_token");
  } catch {}
  if (typeof window !== "undefined") window.location.reload();
}
