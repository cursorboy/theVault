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
          <span className="font-mono text-[10px] tracking-[0.22em] text-text3 uppercase">
            loading vault
          </span>
        </div>
      </div>
    );
  }

  if (status === "unauthed") {
    return <Onboarding />;
  }

  return <>{children}</>;
}

function Onboarding() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* faint grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `linear-gradient(var(--edge) 1px, transparent 1px), linear-gradient(90deg, var(--edge) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse at top right, black, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at top right, black, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto grid max-w-[1320px] min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT: hero */}
        <div className="px-12 py-14 lg:px-16 lg:py-16 flex flex-col">
          <header className="flex items-center gap-3 mb-auto">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-ink font-display italic text-xl">
              V
            </div>
            <span className="font-mono text-[13px] font-semibold tracking-[0.16em] uppercase text-text">
              theVault
            </span>
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded border border-edge2 text-text3">
              v0.4 · invite-only
            </span>
          </header>

          <div className="mt-12 lg:mt-0">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded border border-[rgba(30,77,84,0.28)] bg-[rgba(30,77,84,0.06)] text-accent mb-7">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              now live on imessage, ig, tiktok
            </span>

            <h1 className="font-display text-[88px] leading-[0.94] tracking-[-0.03em] text-text mb-7 max-w-[640px]">
              ur reels<br />
              <span className="italic text-text2">actually</span><br />
              go somewhere<br />
              <span className="italic text-accent">now.</span>
            </h1>

            <p className="text-[16px] leading-[1.6] text-text2 max-w-[520px] mb-9">
              forward a tiktok, an ig reel, or a tt dm. theVault transcribes it,
              summarizes it, embeds it, remembers it. then chats about it later
              like a friend who's seen everything u save.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="sms:+17862139361?body=hey vault"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-md bg-accent text-accent-ink font-mono text-[12px] uppercase tracking-[0.14em] font-semibold hover:bg-accent-soft transition-colors"
              >
                text +1 786 213 9361 to start
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <button className="px-5 py-3.5 rounded-md bg-transparent border border-edge2 text-text font-mono text-[12px] uppercase tracking-[0.14em] hover:border-accent hover:text-accent transition-colors">
                watch demo
              </button>
            </div>

            {/* trust strip */}
            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-6">
              {[
                ["247", "avg saves /user"],
                ["<2s", "reply latency"],
                ["86%", "recall accuracy"],
                ["3", "channels in one vault"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-mono text-[28px] font-medium text-accent leading-none mb-1.5">
                    {n}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-text3">
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: phone preview */}
        <div className="hidden lg:flex items-center justify-center px-12 py-16 relative bg-[radial-gradient(ellipse_at_center,rgba(30,77,84,0.05),transparent_70%)]">
          <PhonePreview />

          {/* annotation */}
          <div className="absolute top-24 right-12 max-w-[200px] text-center">
            <p className="font-display italic text-[19px] text-text3 leading-snug">
              no app install.<br />texts u back like a friend.
            </p>
            <svg width="64" height="42" viewBox="0 0 60 40" className="ml-auto mt-1">
              <path
                d="M5 5 Q 30 30, 55 30"
                stroke="var(--text3)"
                strokeWidth="1"
                fill="none"
                strokeDasharray="2 3"
              />
              <path
                d="M50 26 L 55 30 L 50 34"
                stroke="var(--text3)"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="w-[380px] h-[680px] bg-black rounded-[44px] border border-[#2a2a2a] overflow-hidden flex flex-col font-[-apple-system,'SF_Pro_Text',system-ui] shadow-[0_50px_100px_rgba(31,27,20,0.18),0_20px_40px_rgba(31,27,20,0.1)]">
      {/* status bar */}
      <div className="px-8 pt-4 pb-2 flex justify-between items-center text-white text-[14px] font-semibold">
        <span>9:41</span>
        <span className="font-mono text-[12px]">100</span>
      </div>

      {/* nav */}
      <div className="px-3 pb-3 pt-1 flex items-center gap-2 border-b border-[#1a1a1a]">
        <div className="text-[#2c8cff] text-[26px] leading-none -mt-1">‹</div>
        <div className="flex-1 flex flex-col items-center">
          <div className="w-9 h-9 rounded-md bg-accent text-accent-ink font-display italic text-[18px] flex items-center justify-center mb-1">
            V
          </div>
          <div className="text-white text-[12px] font-medium leading-none">
            theVault
          </div>
          <div className="text-[#76767c] text-[9px] mt-0.5">imessage</div>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 px-3 py-3 flex flex-col gap-1.5 overflow-hidden">
        <div className="text-center text-[10px] text-[#76767c] py-2">
          today 11:42 am
        </div>

        {/* outgoing — link card */}
        <div className="self-end max-w-[78%] p-2 rounded-[18px] bg-[#2c8cff] text-white">
          <div className="w-[180px] h-[260px] rounded-xl relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(135deg, #d2c7b2 0%, #a8957a 100%)",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,transparent,rgba(31,27,20,0.5))]" />
            <div className="absolute left-2.5 right-2.5 bottom-2 flex justify-between items-center text-[10px]">
              <span className="font-mono font-semibold bg-black/40 px-1.5 py-0.5 rounded">
                tiktok
              </span>
              <span>0:47</span>
            </div>
          </div>
          <div className="text-[10px] opacity-85 mt-1.5 px-1 font-mono">
            tiktok.com/@chefsteps
          </div>
        </div>

        {/* incoming */}
        <div className="self-start max-w-[78%] px-3 py-2 rounded-[18px] bg-[#262629] text-[#f4f4f0] text-[14px] leading-snug">
          got it, processing
        </div>

        <div className="self-end text-[10px] text-[#8a8a90] px-2 -mt-1">
          read 11:42 am
        </div>

        {/* save card */}
        <div className="self-start max-w-[88%] p-2.5 rounded-[18px] bg-[#262629] text-[#f4f4f0]">
          <div className="text-[14px] leading-snug px-1 pb-2">
            saved · one-pan miso butter salmon. lowkey the easiest weeknight
            dinner ngl
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.08] border border-white/10">
            <div className="w-7 h-7 rounded-md bg-accent text-accent-ink font-display italic text-[16px] flex items-center justify-center flex-shrink-0">
              V
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium">miso butter salmon</div>
              <div className="text-[10px] opacity-60 font-mono">
                thevault.app/save/3a89f
              </div>
            </div>
          </div>
        </div>

        <div className="self-start max-w-[78%] px-3 py-2 rounded-[18px] bg-[#262629] text-[#f4f4f0] text-[14px] leading-snug">
          want a reminder thursday since u said u meal-prep then
        </div>
      </div>

      {/* compose */}
      <div className="px-3 py-2 pb-3 border-t border-[#1a1a1a] flex items-center gap-2">
        <div className="w-7 h-7 rounded-full border border-[#333] text-[#888] text-lg flex items-center justify-center">
          +
        </div>
        <div className="flex-1 h-7 rounded-full border border-[#2a2a2a] bg-[#0a0a0a] text-[#5a5a5e] text-[12px] flex items-center px-3">
          imessage
        </div>
      </div>

      {/* home indicator */}
      <div className="h-7 flex justify-center items-end pb-2">
        <div className="w-[120px] h-[4px] rounded-full bg-white" />
      </div>
    </div>
  );
}
