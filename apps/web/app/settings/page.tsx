"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
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
      <div className="mx-auto max-w-[820px] px-8 py-12 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[820px] px-8 py-12 relative z-10">
      <div className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-2">
          preferences
        </div>
        <h1 className="font-display text-[48px] leading-[1.04] tracking-[-0.02em] text-text">
          <span className="italic text-text2">your</span> settings.
        </h1>
      </div>

      {/* Digest */}
      <section className="mb-6 rounded-md border border-edge bg-vault p-7">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[22px] text-text">weekly digest</h2>
            <p className="text-[13px] text-text3 mt-0.5">
              get an imessage recap of your saves once a week
            </p>
          </div>
          <button
            onClick={() =>
              setForm((f) => (f ? { ...f, digest_enabled: !f.digest_enabled } : f))
            }
            className={`relative h-6 w-11 rounded-full transition-colors ${
              form.digest_enabled ? "bg-accent" : "bg-edge2"
            }`}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-panel shadow transition-transform ${
                form.digest_enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="day">
            <select
              value={form.digest_day}
              onChange={(e) =>
                setForm((f) => (f ? { ...f, digest_day: Number(e.target.value) } : f))
              }
              className="w-full rounded border border-edge2 bg-panel px-3 py-2 text-[13px] text-text focus:border-accent focus:outline-none"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="hour">
            <select
              value={form.digest_hour}
              onChange={(e) =>
                setForm((f) => (f ? { ...f, digest_hour: Number(e.target.value) } : f))
              }
              className="w-full rounded border border-edge2 bg-panel px-3 py-2 text-[13px] text-text focus:border-accent focus:outline-none"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0
                    ? "12 am"
                    : i < 12
                    ? `${i} am`
                    : i === 12
                    ? "12 pm"
                    : `${i - 12} pm`}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="timezone">
            <select
              value={form.timezone}
              onChange={(e) =>
                setForm((f) => (f ? { ...f, timezone: e.target.value } : f))
              }
              className="w-full rounded border border-edge2 bg-panel px-3 py-2 text-[13px] text-text focus:border-accent focus:outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => update.mutate(form)}
            disabled={update.isPending}
            className={`rounded px-4 py-2 text-[12px] font-mono uppercase tracking-[0.14em] transition-colors ${
              saved
                ? "bg-ok text-accent-ink"
                : "bg-accent text-accent-ink hover:bg-accent-soft"
            } disabled:opacity-40`}
          >
            {saved ? "saved" : update.isPending ? "saving" : "save"}
          </button>
        </div>
      </section>

      {/* Reminders */}
      <section className="rounded-md border border-edge bg-vault p-7">
        <div className="mb-5">
          <h2 className="font-display text-[22px] text-text">pending reminders</h2>
          <p className="text-[13px] text-text3 mt-0.5">
            stuff you said you'd actually do.
          </p>
        </div>

        {!reminders || reminders.length === 0 ? (
          <p className="text-[13px] text-text3">no pending reminders.</p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-md border border-edge bg-panel p-3 px-4"
              >
                <div>
                  <p className="text-[13px] text-text">
                    {format(new Date(r.fire_at), "EEE MMM d 'at' h:mm a")}
                  </p>
                  {r.recur && (
                    <p className="font-mono text-[10px] text-text3 mt-0.5 capitalize">
                      {r.recur}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => cancelReminder.mutate(r.id)}
                  className="font-mono text-[11px] px-3 py-1.5 rounded-full border border-edge2 text-text2 hover:text-err hover:border-err transition-colors"
                >
                  cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-1.5">
        {label}
      </div>
      {children}
    </label>
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
