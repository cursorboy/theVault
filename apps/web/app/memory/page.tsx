"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Navbar } from "@/components/Navbar";
import { AuthGate } from "@/components/AuthGate";
import { api, type Memory } from "@/lib/api";

const KINDS = [
  { slug: "all", label: "all" },
  { slug: "fact", label: "facts" },
  { slug: "preference", label: "preferences" },
  { slug: "goal", label: "goals" },
  { slug: "project", label: "projects" },
  { slug: "trait", label: "traits" },
  { slug: "relationship", label: "people" },
];

const KIND_TINT: Record<string, string> = {
  fact: "rgba(122, 78, 46, 0.18)",
  preference: "rgba(122, 138, 78, 0.18)",
  goal: "rgba(184, 116, 58, 0.18)",
  project: "rgba(138, 100, 120, 0.18)",
  trait: "rgba(168, 90, 90, 0.18)",
  relationship: "rgba(92, 138, 110, 0.18)",
};

const KIND_INK: Record<string, string> = {
  fact: "#7a4e2e",
  preference: "#5a6a3e",
  goal: "#a8642a",
  project: "#7a4e6a",
  trait: "#984040",
  relationship: "#3d6a4e",
};

function MemoryPage() {
  const qc = useQueryClient();
  const [activeKind, setActiveKind] = useState("all");

  const { data: memories, isLoading } = useQuery({
    queryKey: ["memories", activeKind],
    queryFn: () => api.listMemories(activeKind === "all" ? undefined : activeKind),
  });

  const { data: stats } = useQuery({
    queryKey: ["memoryStats"],
    queryFn: api.memoryStats,
  });

  const forget = useMutation({
    mutationFn: api.forgetMemory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memories"] });
      qc.invalidateQueries({ queryKey: ["memoryStats"] });
    },
  });

  const counts = useMemo(() => {
    const total = stats?.total_memories ?? 0;
    return { all: total, ...(stats?.memories_by_kind ?? {}) };
  }, [stats]);

  return (
    <div className="mx-auto max-w-[1320px] px-8 py-10 relative z-10">
      <div className="mb-9">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-2">
          what i remember
        </div>
        <h1 className="font-display text-[52px] leading-[1.04] tracking-[-0.02em] text-text">
          things i've picked up <span className="italic text-accent">about you</span>.
        </h1>
        <p className="text-[15px] text-text2 mt-2">
          {stats?.total_memories ?? "—"} little notes so far. tap any to forget. nothing leaves your vault.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-10">
        {/* memories list */}
        <main>
          {/* filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {KINDS.map((k) => {
              const isActive = activeKind === k.slug;
              const count = counts[k.slug as keyof typeof counts] ?? 0;
              return (
                <button
                  key={k.slug}
                  onClick={() => setActiveKind(k.slug)}
                  className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] tracking-[0.06em] border transition-colors ${
                    isActive
                      ? "bg-text text-ink border-text"
                      : "bg-transparent text-text2 border-edge2 hover:border-accent hover:text-accent"
                  }`}
                >
                  {k.label}
                  {typeof count === "number" && count > 0 ? (
                    <span className={`ml-1.5 ${isActive ? "opacity-60" : "opacity-50"}`}>
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-md" />
              ))}
            </div>
          ) : !memories || memories.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-edge2 rounded-md">
              <p className="font-display text-[34px] text-edge2 mb-1">empty.</p>
              <p className="text-[13px] text-text3">
                no {activeKind === "all" ? "memories" : activeKind + "s"} yet. theVault learns
                from chats + saves over time.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 stagger-fade">
              {memories.map((m) => (
                <MemoryRow
                  key={m.id}
                  memory={m}
                  onForget={() => forget.mutate(m.id)}
                  forgetting={forget.isPending}
                />
              ))}
            </div>
          )}
        </main>

        {/* sidebar: profile + stats */}
        <aside className="border-l border-edge pl-10 space-y-7 sticky top-24 self-start">
          <section>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-3">
              your profile
            </div>
            <ProfileCard memories={memories ?? []} />
          </section>

          <section>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-3">
              the last 30 days
            </div>
            <div className="space-y-0">
              <StatRow label="reels saved" value={stats?.last_30_days?.saves ?? 0} />
              <StatRow label="chats with me" value={stats?.last_30_days?.conversations ?? 0} />
              <StatRow
                label="new things i learned"
                value={stats?.last_30_days?.memories_added ?? 0}
              />
            </div>
          </section>

          <section>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-3">
              privacy
            </div>
            <div className="rounded-md bg-panel border border-edge p-4 text-[13px] leading-[1.55] text-text2">
              none of this leaves your vault. forget any memory and it's gone, no copies.
              wipe everything from <a href="/settings" className="text-accent underline-offset-2 hover:underline">settings</a>{" "}
              anytime.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MemoryRow({
  memory,
  onForget,
  forgetting,
}: {
  memory: Memory;
  onForget: () => void;
  forgetting: boolean;
}) {
  const tint = KIND_TINT[memory.kind] ?? "rgba(0,0,0,0.04)";
  const ink = KIND_INK[memory.kind] ?? "var(--text2)";
  const ago = memory.created_at
    ? formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })
    : "";
  return (
    <div className="flex items-start gap-4 px-5 py-4 rounded-md bg-panel border border-edge">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border border-edge"
            style={{ backgroundColor: tint, color: ink }}
          >
            {memory.kind}
          </span>
          {memory.importance >= 8 && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
              high
            </span>
          )}
        </div>
        <p className="text-[15px] leading-[1.45] text-text">{memory.content}</p>
        <p className="text-[11px] text-text3 mt-1.5 font-mono tracking-[0.04em]">
          learned {ago} · accessed {memory.access_count}×
        </p>
      </div>
      <button
        disabled={forgetting}
        onClick={onForget}
        className="flex-shrink-0 font-mono text-[11px] tracking-[0.06em] px-3 py-1.5 rounded-full border border-edge2 text-text3 hover:text-err hover:border-err transition-colors disabled:opacity-40"
      >
        forget
      </button>
    </div>
  );
}

function ProfileCard({ memories }: { memories: Memory[] }) {
  // pull simple summary slots from memories
  const find = (re: RegExp) =>
    memories.find((m) => re.test(m.content.toLowerCase()))?.content;

  const name = find(/\b(?:name is|i'?m|my name)\b/i)?.split(/\b(?:name is|i'?m|my name)\b/i)[1]?.trim()?.replace(/[.,].*/, "");
  const lives = find(/\b(?:live|based|from)\b/i);
  const into = memories
    .filter((m) => ["preference", "trait", "project", "goal"].includes(m.kind))
    .slice(0, 3)
    .map((m) => m.content);

  return (
    <div className="rounded-md bg-panel border border-edge p-5 text-[13px] leading-[1.7] text-text2">
      <div className="grid grid-cols-[80px_1fr] gap-y-1 gap-x-3">
        <span className="text-text3">name</span>
        <span className="text-text font-medium">{name ?? "not set yet"}</span>
        <span className="text-text3">about</span>
        <span className="text-text font-medium">{lives ?? "—"}</span>
      </div>
      {into.length > 0 && (
        <>
          <div className="border-t border-edge mt-4 pt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-text3 mb-2">
            into
          </div>
          <ul className="space-y-1.5 list-none">
            {into.map((t, i) => (
              <li key={i} className="text-[13px] text-text">
                · {t}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-edge text-[13px]">
      <span className="text-text2">{label}</span>
      <span className="font-mono font-medium text-text">{value}</span>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <Navbar />
      <MemoryPage />
    </AuthGate>
  );
}
