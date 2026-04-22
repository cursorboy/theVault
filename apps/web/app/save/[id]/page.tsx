"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";

function SaveDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [reminderDate, setReminderDate] = useState("");

  const { data: save, isLoading } = useQuery({
    queryKey: ["save", params.id],
    queryFn: () => api.getSave(params.id),
  });

  const { data: reminders } = useQuery({
    queryKey: ["reminders"],
    queryFn: api.listReminders,
  });

  const createReminder = useMutation({
    mutationFn: (fire_at: string) =>
      api.createReminder({ save_id: params.id, fire_at }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const cancelReminder = useMutation({
    mutationFn: api.cancelReminder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const deleteSave = useMutation({
    mutationFn: () => api.deleteSave(params.id),
    onSuccess: () => router.push("/"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-4">
        <div className="skeleton h-6 w-1/3 rounded" />
        <div className="skeleton h-48 w-full rounded-lg" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
      </div>
    );
  }

  if (!save) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10 text-center text-vault-muted">
        Save not found.
      </div>
    );
  }

  const saveReminders = reminders?.filter((r) => r.save_id === params.id && r.status === "pending") ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-xs text-vault-muted hover:text-vault-text transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded border px-2 py-0.5 text-[9px] uppercase tracking-widest platform-${save.platform}`}>
            {save.platform}
          </span>
          {save.created_at && (
            <span className="text-[10px] text-vault-border">
              {format(new Date(save.created_at), "MMM d, yyyy")}
            </span>
          )}
          <span className={`ml-auto text-[10px] uppercase tracking-widest ${
            save.status === "done" ? "text-emerald-500" :
            save.status === "failed" ? "text-red-500" : "text-vault-gold"
          }`}>
            {save.status}
          </span>
        </div>
        <h1
          className="text-2xl font-bold leading-snug text-vault-text"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {save.title || "Untitled"}
        </h1>
      </div>

      {/* Thumbnail */}
      {save.thumbnail_url && (
        <div className="mb-6 overflow-hidden rounded-lg border border-vault-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={save.thumbnail_url} alt="" className="w-full object-cover max-h-64" />
        </div>
      )}

      {/* Summary */}
      {save.summary && (
        <div className="mb-6 rounded-lg border border-vault-border/60 bg-vault-surface p-5">
          <p className="text-[9px] uppercase tracking-[0.2em] text-vault-muted mb-2">Summary</p>
          <p className="text-sm leading-relaxed text-vault-text">{save.summary}</p>
        </div>
      )}

      {/* Tags */}
      {save.tags && save.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {save.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-vault-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-vault-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action items */}
      {save.action_items && save.action_items.length > 0 && (
        <div className="mb-6 rounded-lg border border-vault-border/60 bg-vault-surface p-5">
          <p className="text-[9px] uppercase tracking-[0.2em] text-vault-muted mb-3">Action items</p>
          <ul className="space-y-2">
            {save.action_items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <button
                  onClick={() => setCheckedItems((p) => ({ ...p, [idx]: !p[idx] }))}
                  className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-all ${
                    checkedItems[idx]
                      ? "border-vault-gold bg-vault-gold/20 text-vault-gold"
                      : "border-vault-border hover:border-vault-muted"
                  }`}
                >
                  {checkedItems[idx] && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                      <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
                <span
                  className={`text-sm leading-relaxed transition-all ${
                    checkedItems[idx] ? "line-through text-vault-border" : "text-vault-text"
                  }`}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transcript accordion */}
      {save.transcript && (
        <div className="mb-6 rounded-lg border border-vault-border/60 bg-vault-surface overflow-hidden">
          <button
            onClick={() => setTranscriptOpen((p) => !p)}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-vault-border/20 transition-colors"
          >
            <span className="text-[9px] uppercase tracking-[0.2em] text-vault-muted">Transcript</span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`text-vault-muted transition-transform ${transcriptOpen ? "rotate-180" : ""}`}
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          {transcriptOpen && (
            <div className="border-t border-vault-border px-5 pb-5 pt-4">
              <p className="text-xs leading-relaxed text-vault-muted whitespace-pre-wrap">{save.transcript}</p>
            </div>
          )}
        </div>
      )}

      {/* Reminders */}
      <div className="mb-6 rounded-lg border border-vault-border/60 bg-vault-surface p-5">
        <p className="text-[9px] uppercase tracking-[0.2em] text-vault-muted mb-4">Reminders</p>

        {saveReminders.length > 0 && (
          <ul className="mb-4 space-y-2">
            {saveReminders.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-vault-text">
                  {format(new Date(r.fire_at), "MMM d, yyyy 'at' h:mm a")}
                  {r.recur && <span className="ml-2 text-vault-muted">({r.recur})</span>}
                </span>
                <button
                  onClick={() => cancelReminder.mutate(r.id)}
                  className="text-vault-border hover:text-red-400 transition-colors text-[10px]"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            className="flex-1 rounded border border-vault-border bg-vault-bg px-3 py-1.5 text-xs text-vault-text focus:border-vault-gold/50 focus:outline-none"
          />
          <button
            disabled={!reminderDate || createReminder.isPending}
            onClick={() => {
              if (reminderDate) {
                createReminder.mutate(new Date(reminderDate).toISOString());
                setReminderDate("");
              }
            }}
            className="rounded border border-vault-gold/40 bg-vault-gold/10 px-3 py-1.5 text-xs text-vault-gold transition-all hover:bg-vault-gold/20 disabled:opacity-40"
          >
            Set
          </button>
        </div>
      </div>

      {/* Source + delete */}
      <div className="flex items-center justify-between">
        <a
          href={save.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-vault-muted hover:text-vault-gold transition-colors underline underline-offset-2"
        >
          View original
        </a>
        <button
          onClick={() => deleteSave.mutate()}
          className="text-xs text-vault-border hover:text-red-400 transition-colors"
        >
          Delete save
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <Navbar />
      <SaveDetail />
    </AuthGate>
  );
}
