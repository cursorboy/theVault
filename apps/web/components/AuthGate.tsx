"use client";
import { useEffect, useState } from "react";
import { initAuthFromUrl } from "@/lib/auth";

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
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-edge border-t-accent" />
          <span className="font-mono text-[10px] tracking-[0.22em] text-text3 uppercase">loading vault</span>
        </div>
      </div>
    );
  }

  if (status === "unauthed") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-ink font-display italic text-2xl">
              V
            </div>
          </div>
          <h1 className="font-display text-5xl tracking-tight text-text mb-4">
            <span className="italic text-text2">the</span>Vault
          </h1>
          <p className="text-[15px] leading-relaxed text-text2 mb-6 max-w-[320px] mx-auto">
            an imessage assistant for everything u save. forward a tiktok or ig reel
            to get started, then u'll get a link back to ur vault.
          </p>
          <p className="font-mono text-[11px] tracking-[0.16em] text-text3 uppercase">
            invite-only · v0.4
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
