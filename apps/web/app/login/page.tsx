"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LoginPage() {
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
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* faint grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `linear-gradient(var(--edge) 1px, transparent 1px), linear-gradient(90deg, var(--edge) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse at top, black, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at top, black, transparent 70%)",
        }}
      />

      <header className="relative z-10 mx-auto w-full max-w-[1320px] px-12 py-8 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-icon.png"
            alt=""
            className="h-9 w-auto object-contain"
          />
          <span className="font-mono text-[12px] font-semibold tracking-[0.16em] uppercase text-text">
            theVault
          </span>
        </Link>
        <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded border border-edge2 text-text3">
          v0.4 · invite-only
        </span>
        <Link
          href="/"
          className="ml-auto font-mono text-[11px] uppercase tracking-[0.18em] text-text3 hover:text-accent transition-colors"
        >
          ← back
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-[440px] rounded-md bg-vault border border-edge2 shadow-2xl p-8 sm:p-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent mb-2">
            log in
          </div>
          <h2 className="font-display text-[36px] leading-[1.06] tracking-[-0.02em] text-text mb-1">
            {step === "phone" ? (
              <>
                <span className="italic text-text2">welcome</span> back.
              </>
            ) : (
              <>
                check ur <span className="italic text-accent">imessage</span>.
              </>
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
                  <span className="font-mono text-[13px] text-text3 select-none">
                    +1
                  </span>
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
                  <p className="font-mono text-[11px] tracking-[0.06em] text-err">
                    {error}
                  </p>
                  {needsWaitlist && (
                    <Link
                      href="/?waitlist=1"
                      className="self-start font-mono text-[11px] tracking-[0.14em] uppercase text-accent hover:underline"
                    >
                      join the waitlist instead →
                    </Link>
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
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  disabled={state === "submitting"}
                  className="w-full rounded-md border border-edge2 bg-panel px-5 py-3 text-[24px] text-text placeholder:text-text4 font-mono tracking-[0.4em] text-center focus:border-accent focus:outline-none transition-colors"
                  autoComplete="one-time-code"
                />
              </label>

              {error && (
                <p className="font-mono text-[11px] tracking-[0.06em] text-err">
                  {error}
                </p>
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
      </main>
    </div>
  );
}
