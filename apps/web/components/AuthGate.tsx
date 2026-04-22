"use client";
import { useEffect, useState } from "react";
import { initAuthFromUrl, getToken } from "@/lib/auth";

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [status, setStatus] = useState<"loading" | "authed" | "unauthed">("loading");

  useEffect(() => {
    initAuthFromUrl().then((ok) => setStatus(ok ? "authed" : "unauthed"));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-vault-border border-t-vault-gold" />
          <span className="text-xs tracking-widest text-vault-muted uppercase">Loading vault…</span>
        </div>
      </div>
    );
  }

  if (status === "unauthed") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div
            className="mb-4 text-4xl font-bold text-vault-gold"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            ReelVault
          </div>
          <p className="mb-6 text-sm leading-relaxed text-vault-muted">
            Send a TikTok or Instagram URL to your ReelVault number via iMessage to get started.
          </p>
          <p className="text-xs text-vault-border">
            You&apos;ll receive a link to access your vault after your first save.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
