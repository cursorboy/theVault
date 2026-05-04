"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "tiktok",
  instagram: "instagram",
};

function SaveDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [reminderDate, setReminderDate] = useState("");

  const { data: save, isLoading } = useQuery({
    queryKey: ["save", params.id],
    queryFn: () => api.getSave(params.id),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.listCategories,
  });

  const { data: reminders } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => api.listReminders(),
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
      <div className="mx-auto max-w-[1280px] px-8 py-10 space-y-5">
        <div className="skeleton h-5 w-1/4" />
        <div className="skeleton h-12 w-2/3" />
        <div className="skeleton h-72 w-full rounded-md" />
      </div>
    );
  }

  if (!save) {
    return (
      <div className="mx-auto max-w-[1280px] px-8 py-16 text-center text-text3">
        save not found.
      </div>
    );
  }

  const category = categories?.find((c) => c.id === save.category_id);
  const saveReminders =
    reminders?.filter((r) => r.save_id === params.id && r.status === "pending") ?? [];

  return (
    <div className="mx-auto max-w-[1320px] px-8 py-8 relative z-10">
      {/* breadcrumb */}
      <div className="flex items-center gap-3 text-[12px] text-text3 mb-6">
        <button
          onClick={() => router.back()}
          className="hover:text-text2 transition-colors"
        >
          your library
        </button>
        <span className="text-text4">→</span>
        {category && (
          <>
            <span>{category.label.toLowerCase()}</span>
            <span className="text-text4">→</span>
          </>
        )}
        <span className="text-text font-medium truncate">
          {save.title || "untitled"}
        </span>
        <div className="flex-1" />
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-1 rounded border platform-${save.platform}`}
        >
          {PLATFORM_LABEL[save.platform] ?? save.platform}
        </span>
      </div>

      {/* main grid */}
      <div className="grid grid-cols-[420px_1fr] gap-0 border border-edge rounded-md bg-vault overflow-hidden">
        {/* left: thumb + meta */}
        <div className="p-7 border-r border-edge flex flex-col gap-5">
          <div className="relative overflow-hidden rounded-md aspect-[9/14] bg-edge">
            {save.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={save.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 8l6 4-6 4V8z" fill="currentColor" opacity="0.5" />
                </svg>
              </div>
            )}
            {/* play overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-black/55 backdrop-blur-md border border-white/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="white">
                  <path d="M5 3l8 5-8 5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={save.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-edge2 bg-panel text-text text-[12px] hover:border-accent hover:text-accent transition-colors"
            >
              open original →
            </a>
            <button
              onClick={() => deleteSave.mutate()}
              className="px-3 py-2.5 rounded border border-edge2 bg-panel text-text2 hover:text-err hover:border-err transition-colors"
              title="delete save"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 4h10M5 4V2.5a1 1 0 011-1h4a1 1 0 011 1V4M6 7v5M10 7v5M3 4l1 9.5a1 1 0 001 1h6a1 1 0 001-1L13 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* meta block */}
          <div className="flex flex-col gap-2.5">
            {[
              ["saved", save.created_at ? formatDistanceToNow(new Date(save.created_at), { addSuffix: true }) : "—"],
              ["type", `${save.platform} · ${save.duration_secs ? `${Math.floor(save.duration_secs / 60)}:${String(save.duration_secs % 60).padStart(2, "0")}` : "—"}`],
              ["category", category?.label.toLowerCase() ?? "—"],
              ["status", save.status],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-[13px]">
                <span className="text-text3">{k}</span>
                <span className="text-text font-medium text-right">{v}</span>
              </div>
            ))}
          </div>

          {/* tags */}
          {save.tags && save.tags.length > 0 && (
            <div>
              <div className="text-[12px] text-text3 mb-2 font-medium">tags</div>
              <div className="flex flex-wrap gap-1.5">
                {save.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-panel border border-edge text-text2"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* right: content */}
        <div className="p-8 overflow-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-2">
            the gist
          </div>
          <h1 className="font-display text-[44px] leading-[1.06] tracking-[-0.02em] text-text">
            {save.title || "untitled"}
          </h1>

          {save.summary && (
            <p className="mt-5 text-[15px] leading-[1.65] text-text2 max-w-[680px]">
              {save.summary}
            </p>
          )}

          {/* action items */}
          {save.action_items && save.action_items.length > 0 && (
            <div className="mt-7">
              <div className="text-[13px] text-text3 mb-3 font-medium">
                things to do, if you want
              </div>
              <div className="flex flex-col gap-2">
                {save.action_items.map((item, idx) => {
                  const done = checkedItems[idx];
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 px-4 rounded-md bg-vault border border-edge"
                    >
                      <button
                        onClick={() =>
                          setCheckedItems((p) => ({ ...p, [idx]: !p[idx] }))
                        }
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm transition-all border ${
                          done
                            ? "bg-accent border-accent"
                            : "bg-transparent border-edge2 hover:border-text3"
                        }`}
                      >
                        {done && (
                          <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4l2 2 4-4" stroke="var(--accent-ink)" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>
                      <span
                        className={`flex-1 text-[13px] ${
                          done ? "line-through text-text3" : "text-text"
                        }`}
                      >
                        {item}
                      </span>
                      <button className="font-mono text-[11px] px-2.5 py-1 rounded-full bg-transparent border border-edge2 text-text2 hover:border-accent hover:text-accent transition-colors">
                        remind me
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* reminders */}
          <div className="mt-7">
            <div className="text-[13px] text-text3 mb-3 font-medium">reminders</div>
            {saveReminders.length > 0 && (
              <ul className="mb-3 flex flex-col gap-2">
                {saveReminders.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between p-3 px-4 rounded-md bg-[rgba(30,77,84,0.06)] border border-[rgba(30,77,84,0.2)]"
                  >
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent mb-0.5">
                        scheduled
                      </div>
                      <div className="text-[14px] text-text">
                        {format(new Date(r.fire_at), "EEE MMM d 'at' h:mm a")}
                        {r.recur && (
                          <span className="text-text3 ml-2">· {r.recur}</span>
                        )}
                      </div>
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

            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="flex-1 rounded border border-edge2 bg-panel px-3 py-2 text-[13px] text-text focus:border-accent focus:outline-none"
              />
              <button
                disabled={!reminderDate || createReminder.isPending}
                onClick={() => {
                  if (reminderDate) {
                    createReminder.mutate(new Date(reminderDate).toISOString());
                    setReminderDate("");
                  }
                }}
                className="rounded bg-accent text-accent-ink px-4 py-2 text-[12px] font-mono uppercase tracking-[0.14em] hover:bg-accent-soft transition-colors disabled:opacity-40"
              >
                set
              </button>
            </div>
          </div>

          {/* transcript */}
          {save.transcript && (
            <div className="mt-7">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[13px] text-text3 font-medium">
                  what they actually say
                </span>
                <div className="flex-1 h-px bg-edge" />
                <button
                  onClick={() => setTranscriptOpen((p) => !p)}
                  className="font-mono text-[10px] text-text3 hover:text-accent transition-colors"
                >
                  {transcriptOpen ? "hide" : "show"}
                </button>
              </div>
              {transcriptOpen && (
                <div className="font-display italic text-[15px] leading-[1.75] text-text2 p-5 px-6 bg-panel border border-edge rounded-md max-h-[280px] overflow-auto whitespace-pre-wrap">
                  {save.transcript}
                </div>
              )}
            </div>
          )}
        </div>
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
