"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SaveCard, SaveCardSkeleton } from "@/components/SaveCard";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";

const CHANNELS = [
  { label: "iMessage", sub: "+1 786 213 9361", ok: true },
  { label: "Instagram", sub: "@you", ok: true },
  { label: "TikTok", sub: "reconnect", ok: false },
];

function FeedPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [view, setView] = useState<"grid" | "cozy" | "list">("grid");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.listCategories,
  });

  const { data: saves, isLoading } = useQuery({
    queryKey: ["saves", selectedCategory],
    queryFn: () => api.listSaves({ category_id: selectedCategory ?? undefined, limit: 200 }),
  });

  const activeCat = selectedCategory
    ? categories?.find((c) => c.id === selectedCategory)
    : null;

  const cols = view === "list" ? 1 : view === "cozy" ? 5 : 4;

  return (
    <div className="mx-auto flex max-w-[1320px] gap-0 relative z-10">
      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 border-r border-edge bg-vault min-h-[calc(100vh-57px)] sticky top-[57px]">
        <div className="p-5 flex flex-col gap-1 h-[calc(100vh-57px)] overflow-auto">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 px-2 mb-2 mt-1">
            categories
          </div>

          <SidebarItem
            label="all"
            count={saves?.length}
            active={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
          />
          {categories?.map((cat) => {
            const count = saves?.filter((s) => s.category_id === cat.id).length ?? 0;
            return (
              <SidebarItem
                key={cat.id}
                label={cat.label.toLowerCase()}
                count={count}
                active={selectedCategory === cat.id}
                onClick={() =>
                  setSelectedCategory(cat.id === selectedCategory ? null : cat.id)
                }
              />
            );
          })}

          <div className="h-5" />
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 px-2 mb-2">
            your stuff
          </div>
          <SidebarLink href="/search" label="search" />
          <SidebarLink href="/settings" label="settings" />

          {/* channel status */}
          <div className="mt-auto rounded-md bg-panel border border-edge p-3 flex flex-col gap-1.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-text3 mb-1">
              connected to
            </div>
            {CHANNELS.map((ch) => (
              <div key={ch.label} className="flex items-center gap-2 text-[11px]">
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ background: ch.ok ? "var(--ok)" : "var(--warn)" }}
                />
                <span className="text-text2 flex-1">{ch.label}</span>
                <span className="font-mono text-[9px] text-text4">{ch.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 px-10 py-9">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-1">
              your library {activeCat ? `→ ${activeCat.label.toLowerCase()}` : ""}
            </div>
            <h1 className="font-display text-[44px] leading-[1.04] tracking-[-0.02em] text-text">
              everything <span className="italic text-accent">worth</span> remembering.
            </h1>
            {saves && (
              <p className="mt-2 text-[14px] text-text2">
                {saves.length} {saves.length === 1 ? "save" : "saves"}
                {saves.length > 0 ? " · ur last one was just now" : ""}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-panel border border-edge2 rounded p-1">
              {(["grid", "cozy", "list"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setView(d)}
                  className={`px-3 py-1 rounded font-mono text-[11px] transition-colors ${
                    view === d
                      ? "bg-accent text-accent-ink"
                      : "text-text3 hover:text-text2"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <SaveCardSkeleton key={i} view={view === "list" ? "list" : "grid"} />
            ))}
          </div>
        ) : !saves || saves.length === 0 ? (
          <EmptyState />
        ) : view === "list" ? (
          <div className="space-y-2 stagger-fade">
            {saves.map((save) => (
              <SaveCard key={save.id} save={save} view="list" />
            ))}
          </div>
        ) : (
          <div
            className="grid gap-4 stagger-fade"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {saves.map((save) => (
              <SaveCard key={save.id} save={save} view="grid" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SidebarItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-[13px] transition-all border ${
        active
          ? "bg-[rgba(30,77,84,0.08)] text-accent border-[rgba(30,77,84,0.18)]"
          : "text-text2 hover:text-text hover:bg-panel border-transparent"
      }`}
    >
      <span className="flex-1">{label}</span>
      {typeof count === "number" && (
        <span className="font-mono text-[10px] text-text3">{count}</span>
      )}
    </button>
  );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded px-2.5 py-1.5 text-[13px] text-text2 hover:text-text hover:bg-panel transition-colors"
    >
      {label}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="font-display text-[64px] leading-none text-edge2 mb-4">
        empty.
      </p>
      <p className="text-[14px] text-text2 max-w-[360px]">
        send a tiktok or instagram url via imessage to save your first reel.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <Navbar />
      <FeedPage />
    </AuthGate>
  );
}
