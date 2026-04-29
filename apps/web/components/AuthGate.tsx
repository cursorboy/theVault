"use client";
import { useEffect, useRef, useState } from "react";
import { initAuthFromUrl } from "@/lib/auth";
import { api } from "@/lib/api";

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
        <div className="flex flex-col items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-16 w-auto object-contain" />
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-edge border-t-accent" />
          <span className="font-mono text-[10px] tracking-[0.22em] text-text3 uppercase">
            loading vault
          </span>
          <button
            onClick={() => {
              try {
                localStorage.removeItem("rv_token");
              } catch {}
              window.location.reload();
            }}
            className="mt-4 font-mono text-[10px] tracking-[0.18em] uppercase text-text4 hover:text-accent transition-colors"
          >
            stuck? clear token
          </button>
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
  const [demoOpen, setDemoOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (!demoOpen && !waitlistOpen && !loginOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDemoOpen(false);
        setWaitlistOpen(false);
        setLoginOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demoOpen, waitlistOpen, loginOpen]);

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt=""
              className="h-11 w-auto object-contain"
            />
            <span className="font-mono text-[13px] font-semibold tracking-[0.16em] uppercase text-text">
              theVault
            </span>
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded border border-edge2 text-text3">
              v0.4 · invite-only
            </span>
            <div className="ml-auto">
              <button
                onClick={() => setLoginOpen(true)}
                className="font-mono text-[11px] uppercase tracking-[0.18em] px-4 py-2 rounded border border-edge2 text-text2 hover:text-accent hover:border-accent transition-colors"
              >
                log in
              </button>
            </div>
          </header>

          <div className="mt-12 lg:mt-0">
            <h1 className="font-display text-[88px] leading-[0.94] tracking-[-0.03em] text-text mb-7 max-w-[640px]">
              ur <WordRotator words={["reels", "tiktoks", "shorts"]} interval={2400} /><br />
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
              <button
                onClick={() => setWaitlistOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-md bg-accent text-accent-ink font-mono text-[12px] uppercase tracking-[0.14em] font-semibold hover:bg-accent-soft transition-colors"
              >
                join the waitlist
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={() => setDemoOpen(true)}
                className="px-5 py-3.5 rounded-md bg-transparent border border-edge2 text-text font-mono text-[12px] uppercase tracking-[0.14em] hover:border-accent hover:text-accent transition-colors"
              >
                watch demo
              </button>
            </div>
            <p className="mt-3 font-mono text-[11px] tracking-[0.06em] text-text3">
              we'll text u when ur invite is ready. nothing else, ever.
            </p>

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
          <div className="relative">
            <PhonePreview />

            {/* annotation hugs the phone's top-right; arrow curls down-left into the chat area */}
            <div className="absolute -top-20 -right-12 w-[220px] text-right pointer-events-none">
              <p className="font-display italic text-[19px] text-text3 leading-snug">
                no app install.<br />texts u back like a friend.
              </p>
              <svg
                width="160"
                height="120"
                viewBox="0 0 160 120"
                className="block ml-auto"
                style={{ marginTop: 4 }}
              >
                <path
                  d="M150 8 Q 130 50, 80 95"
                  stroke="var(--text3)"
                  strokeWidth="1.2"
                  fill="none"
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                />
                <path
                  d="M88 90 L 78 97 L 86 105"
                  stroke="var(--text3)"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* waitlist modal */}
      {waitlistOpen && (
        <WaitlistModal onClose={() => setWaitlistOpen(false)} />
      )}

      {/* login modal */}
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onJoinWaitlist={() => {
            setLoginOpen(false);
            setWaitlistOpen(true);
          }}
        />
      )}

      {/* demo modal */}
      {demoOpen && (
        <div
          onClick={() => setDemoOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
          style={{ animation: "vault_modal_in 220ms ease-out both" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[1280px] aspect-video rounded-md overflow-hidden bg-black border border-edge2 shadow-2xl"
          >
            <video
              src="/demo.mp4"
              autoPlay
              controls
              playsInline
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setDemoOpen(false)}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 flex items-center justify-center font-mono text-[14px]"
              aria-label="close demo"
            >
              ×
            </button>
          </div>
          <style jsx global>{`
            @keyframes vault_modal_in {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function LoginModal({
  onClose,
  onJoinWaitlist,
}: {
  onClose: () => void;
  onJoinWaitlist: () => void;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [needsWaitlist, setNeedsWaitlist] = useState(false);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (step === "phone" ? phoneRef : codeRef).current?.focus();
  }, [step]);

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const phoneValid = phone.replace(/\D/g, "").length >= 10;
  const codeValid = code.replace(/\D/g, "").length === 6;

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid || state === "submitting") return;
    setState("submitting");
    setError(null);
    setNeedsWaitlist(false);
    try {
      await api.requestLoginCode(phone);
      setStep("code");
      setState("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404")) {
        setNeedsWaitlist(true);
        setError("no account for that number yet.");
      } else if (msg.includes("429")) {
        setError("just sent a code, hang on a sec before retrying.");
      } else if (msg.includes("400")) {
        setError("that doesn't look like a real number.");
      } else {
        setError("couldn't send code. try again in a sec.");
      }
      setState("error");
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!codeValid || state === "submitting") return;
    setState("submitting");
    setError(null);
    try {
      const res = await api.verifyLoginCode(phone, code.replace(/\D/g, ""));
      // store token and reload — AuthGate will re-verify and let user through
      try {
        localStorage.setItem("rv_token", res.token);
      } catch {}
      window.location.href = "/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("400")) {
        if (msg.toLowerCase().includes("expired")) {
          setError("code expired. send a new one.");
          setStep("phone");
        } else if (msg.toLowerCase().includes("attempts")) {
          setError("too many tries. send a new code.");
          setStep("phone");
        } else {
          setError("wrong code. try again.");
        }
      } else if (msg.includes("404")) {
        setNeedsWaitlist(true);
        setError("no account for that number.");
      } else {
        setError("something broke. try again.");
      }
      setState("error");
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-6"
      style={{ animation: "vault_modal_in 220ms ease-out both" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[440px] rounded-md bg-vault border border-edge2 shadow-2xl p-8 sm:p-10"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full text-text3 hover:text-text border border-transparent hover:border-edge2 flex items-center justify-center text-[16px]"
          aria-label="close"
        >
          ×
        </button>

        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent mb-2">
          log in
        </div>
        <h2 className="font-display text-[36px] leading-[1.06] tracking-[-0.02em] text-text mb-1">
          {step === "phone" ? (
            <>
              <span className="italic text-text2">welcome</span> back.
            </>
          ) : (
            <>check ur <span className="italic text-accent">imessage</span>.</>
          )}
        </h2>
        <p className="text-[13px] text-text2 mb-6">
          {step === "phone"
            ? "enter ur number, we'll text u a code."
            : `we sent a 6-digit code to +1 ${phone}. expires in 10 min.`}
        </p>

        {step === "phone" ? (
          <form onSubmit={requestCode} className="flex flex-col gap-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 block mb-1.5">
                phone
              </span>
              <div className="flex items-center gap-1 px-4 rounded-md border border-edge2 bg-panel focus-within:border-accent transition-colors">
                <span className="font-mono text-[13px] text-text3 select-none">+1</span>
                <input
                  ref={phoneRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder="(555) 010 0042"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  disabled={state === "submitting"}
                  className="flex-1 bg-transparent outline-none py-3 text-[15px] text-text placeholder:text-text4 font-mono tracking-tight"
                  autoComplete="tel-national"
                />
              </div>
            </label>

            {error && (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[11px] tracking-[0.06em] text-err">{error}</p>
                {needsWaitlist && (
                  <button
                    type="button"
                    onClick={onJoinWaitlist}
                    className="self-start font-mono text-[11px] tracking-[0.14em] uppercase text-accent hover:underline"
                  >
                    join the waitlist instead →
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={state === "submitting" || !phoneValid}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-accent text-accent-ink font-mono text-[12px] uppercase tracking-[0.14em] font-semibold hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === "submitting" ? "sending" : "send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="flex flex-col gap-4">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 block mb-1.5">
                code
              </span>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={state === "submitting"}
                className="w-full rounded-md border border-edge2 bg-panel px-5 py-3 text-[24px] text-text placeholder:text-text4 font-mono tracking-[0.4em] text-center focus:border-accent focus:outline-none transition-colors"
                autoComplete="one-time-code"
              />
            </label>

            {error && (
              <p className="font-mono text-[11px] tracking-[0.06em] text-err">{error}</p>
            )}

            <button
              type="submit"
              disabled={state === "submitting" || !codeValid}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-accent text-accent-ink font-mono text-[12px] uppercase tracking-[0.14em] font-semibold hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === "submitting" ? "verifying" : "log in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
              }}
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-text3 hover:text-accent transition-colors self-start"
            >
              ← change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function WaitlistModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [position, setPosition] = useState<number | null>(null);
  const [alreadyOnList, setAlreadyOnList] = useState(false);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const phoneValid = phone.replace(/\D/g, "").length >= 10;
  const nameValid = name.trim().length >= 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    if (!phoneValid || !nameValid) return;
    setState("submitting");
    setError(null);
    try {
      const res = await api.joinWaitlist({ phone, name, source: "web" });
      setPosition(res.position);
      setAlreadyOnList(res.already_on_list);
      setJoinedAt(res.joined_at);
      setState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("400")) {
        setError("that doesn't look like a real number. double-check?");
      } else {
        setError("couldn't reach the waitlist. try again in a sec");
      }
      setState("error");
    }
  }

  function joinedAgoText(iso: string | null): string {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    const now = Date.now();
    const ms = Math.max(0, now - then);
    const min = Math.floor(ms / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day >= 1) return `${day} day${day === 1 ? "" : "s"} ago`;
    if (hr >= 1) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    if (min >= 1) return `${min} min${min === 1 ? "" : "s"} ago`;
    return "just now";
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-6"
      style={{ animation: "vault_modal_in 220ms ease-out both" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="waitlist-title"
        className="relative w-full max-w-[480px] rounded-md bg-vault border border-edge2 shadow-2xl p-8 sm:p-10"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full text-text3 hover:text-text border border-transparent hover:border-edge2 flex items-center justify-center text-[16px]"
          aria-label="close"
        >
          ×
        </button>

        {state === "success" ? (
          alreadyOnList ? (
            <div className="flex flex-col gap-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent2">
                already in
              </div>
              <h2
                id="waitlist-title"
                className="font-display text-[40px] leading-[1.04] tracking-[-0.02em] text-text"
              >
                u're already on the list.
              </h2>
              <p className="text-[14px] leading-relaxed text-text2">
                this number signed up <span className="font-mono">{joinedAgoText(joinedAt)}</span>
                {position ? <> · ur position is <span className="italic text-accent">#{position}</span></> : null}.
                no need to do anything else, we'll text u when ur invite drops.
              </p>
              <button
                onClick={onClose}
                className="self-start mt-2 px-5 py-3 rounded-md bg-accent text-accent-ink font-mono text-[12px] uppercase tracking-[0.14em] font-semibold hover:bg-accent-soft transition-colors"
              >
                got it
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
                ur in
              </div>
              <h2
                id="waitlist-title"
                className="font-display text-[44px] leading-[1.04] tracking-[-0.02em] text-text"
              >
                position <span className="italic text-accent">#{position}</span>
              </h2>
              <p className="text-[14px] leading-relaxed text-text2">
                {name.trim() ? `thanks ${name.trim().split(" ")[0]}, ` : ""}
                we'll text u at <span className="font-mono">+1 {phone}</span> when ur invite drops.
                no app install, just a link.
              </p>
              <button
                onClick={onClose}
                className="self-start mt-2 px-5 py-3 rounded-md bg-accent text-accent-ink font-mono text-[12px] uppercase tracking-[0.14em] font-semibold hover:bg-accent-soft transition-colors"
              >
                done
              </button>
            </div>
          )
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent mb-2">
                join the waitlist
              </div>
              <h2
                id="waitlist-title"
                className="font-display text-[36px] leading-[1.06] tracking-[-0.02em] text-text"
              >
                <span className="italic text-text2">save</span> ur spot.
              </h2>
              <p className="text-[13px] text-text2 mt-2">
                we'll text u when ur invite is ready. nothing else, ever.
              </p>
            </div>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 block mb-1.5">
                ur name
              </span>
              <input
                ref={firstFieldRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="alex"
                disabled={state === "submitting"}
                className="w-full rounded-md border border-edge2 bg-panel px-4 py-3 text-[15px] text-text placeholder:text-text4 focus:border-accent focus:outline-none transition-colors"
                autoComplete="given-name"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 block mb-1.5">
                phone
              </span>
              <div className="flex items-center gap-1 px-4 rounded-md border border-edge2 bg-panel focus-within:border-accent transition-colors">
                <span className="font-mono text-[13px] text-text3 select-none">+1</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="(555) 010 0042"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  disabled={state === "submitting"}
                  className="flex-1 bg-transparent outline-none py-3 text-[15px] text-text placeholder:text-text4 font-mono tracking-tight"
                  autoComplete="tel-national"
                />
              </div>
            </label>

            {error && (
              <p className="font-mono text-[11px] tracking-[0.06em] text-err">{error}</p>
            )}

            <button
              type="submit"
              disabled={state === "submitting" || !phoneValid || !nameValid}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-md bg-accent text-accent-ink font-mono text-[12px] uppercase tracking-[0.14em] font-semibold hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state === "submitting" ? "joining" : "join the waitlist"}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function WordRotator({
  words,
  interval = 2400,
}: {
  words: string[];
  interval?: number;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => (i + 1) % words.length),
      interval
    );
    return () => clearInterval(t);
  }, [interval, words.length]);

  const word = words[idx];

  return (
    <span
      key={idx}
      className="italic text-accent"
      aria-live="polite"
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {word.split("").map((char, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            animation: `vault_letter_in 540ms ${i * 38}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
            whiteSpace: "pre",
          }}
        >
          {char}
        </span>
      ))}

      <style jsx global>{`
        @keyframes vault_letter_in {
          0% {
            transform: translateY(0.45em);
            opacity: 0;
            filter: blur(5px);
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
            filter: blur(0);
          }
        }
      `}</style>
    </span>
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
          <div className="text-white text-[14px] font-medium leading-none mt-1">
            theVault
          </div>
          <div className="text-[#76767c] text-[10px] mt-1">imessage</div>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-icon.png"
              alt=""
              className="h-7 w-7 object-contain flex-shrink-0 rounded-md bg-white/5"
            />
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
