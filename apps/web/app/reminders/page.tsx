"use client";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AuthGate } from "@/components/AuthGate";
import { api, type Reminder } from "@/lib/api";

function RemindersPage() {
  const qc = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ["reminders", "pending"],
    queryFn: () => api.listReminders("pending"),
  });

  const { data: recent } = useQuery({
    queryKey: ["reminders", "recent"],
    queryFn: () => api.recentReminders(15),
  });

  const snooze = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      api.snoozeReminder(id, minutes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const done = useMutation({
    mutationFn: (id: string) => api.doneReminder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.cancelReminder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const grouped = useMemo(() => {
    const recurring: Reminder[] = [];
    const upcoming: Reminder[] = [];
    (pending ?? []).forEach((r) => {
      if (r.recur) recurring.push(r);
      else upcoming.push(r);
    });
    return { recurring, upcoming };
  }, [pending]);

  return (
    <div className="mx-auto max-w-[1080px] px-8 py-10 relative z-10">
      <div className="mb-9">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-2">
          / reminders
        </div>
        <h1 className="font-display italic text-[52px] leading-[1.04] tracking-[-0.02em] text-text">
          stuff u said u'd actually do.
        </h1>
        <p className="text-[15px] text-text2 mt-2">
          {grouped.upcoming.length} upcoming · {recent?.length ?? 0} recent · set in chat or here.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-md" />
          ))}
        </div>
      ) : (
        <>
          {/* upcoming */}
          <Section label="upcoming · 7 days">
            {grouped.upcoming.length === 0 ? (
              <EmptySection text="nothing on the books. text theVault to set one." />
            ) : (
              grouped.upcoming.map((r, i) => (
                <ReminderRow
                  key={r.id}
                  r={r}
                  highlight={i === 0}
                  onSnooze={(min) => snooze.mutate({ id: r.id, minutes: min })}
                  onDone={() => done.mutate(r.id)}
                  onCancel={() => cancel.mutate(r.id)}
                  busy={snooze.isPending || done.isPending || cancel.isPending}
                />
              ))
            )}
          </Section>

          {/* recurring */}
          {grouped.recurring.length > 0 && (
            <Section label="recurring">
              {grouped.recurring.map((r) => (
                <ReminderRow
                  key={r.id}
                  r={r}
                  recurring
                  onSnooze={(min) => snooze.mutate({ id: r.id, minutes: min })}
                  onDone={() => done.mutate(r.id)}
                  onCancel={() => cancel.mutate(r.id)}
                  busy={snooze.isPending || done.isPending || cancel.isPending}
                />
              ))}
            </Section>
          )}

          {/* recent */}
          {recent && recent.length > 0 && (
            <Section label="recent · done">
              {recent.map((r) => (
                <DoneRow key={r.id} r={r} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-3">
        {label}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="px-5 py-7 text-center rounded-md border border-dashed border-edge2 text-[13px] text-text3">
      {text}
    </div>
  );
}

function ReminderRow({
  r,
  highlight = false,
  recurring = false,
  onSnooze,
  onDone,
  onCancel,
  busy,
}: {
  r: Reminder;
  highlight?: boolean;
  recurring?: boolean;
  onSnooze: (minutes: number) => void;
  onDone: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const fire = new Date(r.fire_at);
  const whenWord = isToday(fire)
    ? "today"
    : isTomorrow(fire)
    ? "tomorrow"
    : format(fire, "EEE MMM d");
  const time = format(fire, "h:mm a").toLowerCase();

  const subject = r.save_title || r.body || "(no subject)";

  return (
    <div
      className={`flex items-center gap-5 p-4 px-5 rounded-md border ${
        highlight
          ? "bg-[rgba(30,77,84,0.05)] border-[rgba(30,77,84,0.22)]"
          : "bg-vault border-edge"
      }`}
    >
      <div className="w-[120px] flex-shrink-0">
        <div className="text-[15px] text-text font-medium leading-tight">{whenWord}</div>
        <div className="font-mono text-[11px] text-text3 mt-0.5">{time}</div>
      </div>
      <div className="w-px self-stretch bg-edge2" />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] text-text leading-snug">{subject}</div>
        <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-text3 tracking-[0.04em] uppercase">
          {r.save_id ? (
            <Link
              href={`/save/${r.save_id}`}
              className="hover:text-accent transition-colors"
            >
              · open save
            </Link>
          ) : (
            <span>· standalone</span>
          )}
          {recurring && r.recur && (
            <>
              <span className="text-text4">·</span>
              <span>{r.recur}</span>
            </>
          )}
          {r.note && (
            <>
              <span className="text-text4">·</span>
              <span className="normal-case font-body text-[11px] tracking-[0]">{r.note}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <SmallBtn onClick={() => onSnooze(60)} disabled={busy}>
          +1h
        </SmallBtn>
        <SmallBtn onClick={() => onSnooze(60 * 24)} disabled={busy}>
          +1d
        </SmallBtn>
        <SmallBtn onClick={onDone} disabled={busy} primary>
          done
        </SmallBtn>
        <SmallBtn onClick={onCancel} disabled={busy} danger>
          cancel
        </SmallBtn>
      </div>
    </div>
  );
}

function DoneRow({ r }: { r: Reminder }) {
  const subject = r.save_title || r.body || "(no subject)";
  const fire = new Date(r.fire_at);
  const ago = formatDistanceToNow(fire, { addSuffix: true });
  const ok = r.status === "completed" || r.status === "sent";
  return (
    <div className="flex items-center gap-4 px-5 py-2.5 rounded-md opacity-75">
      <div
        className={`h-3.5 w-3.5 rounded-sm flex-shrink-0 border ${
          ok ? "bg-accent border-accent" : "border-warn"
        }`}
      />
      <div className="font-mono text-[11px] text-text3 w-[110px]">
        {format(fire, "EEE MMM d")} · {format(fire, "h:mm a").toLowerCase()}
      </div>
      <div
        className={`flex-1 text-[13px] ${
          ok ? "line-through text-text3" : "text-text2"
        } leading-snug`}
      >
        {subject}
      </div>
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
          r.status === "completed"
            ? "text-ok"
            : r.status === "sent"
            ? "text-text3"
            : "text-warn"
        }`}
      >
        {r.status === "completed"
          ? "done"
          : r.status === "sent"
          ? "fired"
          : r.status}
      </span>
      <span className="font-mono text-[10px] text-text4 w-[70px] text-right">{ago}</span>
    </div>
  );
}

function SmallBtn({
  children,
  onClick,
  disabled,
  primary = false,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const base =
    "font-mono text-[11px] tracking-[0.06em] px-2.5 py-1.5 rounded border transition-colors disabled:opacity-40";
  const tone = primary
    ? "bg-accent text-accent-ink border-accent hover:bg-accent-soft"
    : danger
    ? "bg-transparent text-text3 border-edge2 hover:text-err hover:border-err"
    : "bg-transparent text-text2 border-edge2 hover:text-accent hover:border-accent";
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${tone}`}>
      {children}
    </button>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <Navbar />
      <RemindersPage />
    </AuthGate>
  );
}
