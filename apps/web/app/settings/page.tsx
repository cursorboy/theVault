"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data: digest, isLoading } = useQuery({
    queryKey: ["digest"],
    queryFn: api.getDigest,
  });
  const { data: reminders } = useQuery({
    queryKey: ["reminders"],
    queryFn: api.listReminders,
  });

  const [form, setForm] = useState<typeof digest | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (digest && !form) setForm(digest);
  }, [digest, form]);

  const update = useMutation({
    mutationFn: api.updateDigest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["digest"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const cancelReminder = useMutation({
    mutationFn: api.cancelReminder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  if (isLoading || !form) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-10">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-vault-muted">Preferences</p>
        <h1
          className="text-3xl font-bold text-vault-text"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Settings
        </h1>
      </div>

      {/* Digest settings */}
      <section className="mb-8 rounded-lg border border-vault-border/60 bg-vault-surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-vault-text" style={{ fontFamily: "var(--font-fraunces)" }}>
              Weekly Digest
            </h2>
            <p className="text-xs text-vault-muted mt-0.5">Get a weekly iMessage recap of your saves</p>
          </div>
          <button
            onClick={() => setForm((f) => f ? { ...f, digest_enabled: !f.digest_enabled } : f)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              form.digest_enabled ? "bg-vault-gold" : "bg-vault-border"
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                form.digest_enabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-[9px] uppercase tracking-[0.2em] text-vault-muted">Day</label>
            <select
              value={form.digest_day}
              onChange={(e) => setForm((f) => f ? { ...f, digest_day: Number(e.target.value) } : f)}
              className="w-full rounded border border-vault-border bg-vault-bg px-3 py-2 text-xs text-vault-text focus:border-vault-gold/50 focus:outline-none"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[9px] uppercase tracking-[0.2em] text-vault-muted">Hour</label>
            <select
              value={form.digest_hour}
              onChange={(e) => setForm((f) => f ? { ...f, digest_hour: Number(e.target.value) } : f)}
              className="w-full rounded border border-vault-border bg-vault-bg px-3 py-2 text-xs text-vault-text focus:border-vault-gold/50 focus:outline-none"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-[9px] uppercase tracking-[0.2em] text-vault-muted">Timezone</label>
          <select
            value={form.timezone}
            onChange={(e) => setForm((f) => f ? { ...f, timezone: e.target.value } : f)}
            className="w-full rounded border border-vault-border bg-vault-bg px-3 py-2 text-xs text-vault-text focus:border-vault-gold/50 focus:outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => update.mutate(form)}
            disabled={update.isPending}
            className={`rounded border px-4 py-2 text-xs transition-all ${
              saved
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-vault-gold/40 bg-vault-gold/10 text-vault-gold hover:bg-vault-gold/20"
            } disabled:opacity-40`}
          >
            {saved ? "Saved ✓" : update.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      {/* Pending reminders */}
      <section className="rounded-lg border border-vault-border/60 bg-vault-surface p-6">
        <h2
          className="mb-4 text-sm font-semibold text-vault-text"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Pending Reminders
        </h2>

        {!reminders || reminders.length === 0 ? (
          <p className="text-xs text-vault-muted">No pending reminders.</p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded border border-vault-border/40 px-3 py-2"
              >
                <div>
                  <p className="text-xs text-vault-text">
                    {format(new Date(r.fire_at), "EEE MMM d, yyyy 'at' h:mm a")}
                  </p>
                  {r.recur && (
                    <p className="text-[10px] text-vault-muted capitalize">{r.recur}</p>
                  )}
                </div>
                <button
                  onClick={() => cancelReminder.mutate(r.id)}
                  className="text-[10px] text-vault-border hover:text-red-400 transition-colors"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <Navbar />
      <SettingsPage />
    </AuthGate>
  );
}
