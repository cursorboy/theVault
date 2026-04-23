"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SaveCard, SaveCardSkeleton } from "@/components/SaveCard";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";

function FeedPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.listCategories,
  });

  const { data: saves, isLoading } = useQuery({
    queryKey: ["saves", selectedCategory],
    queryFn: () => api.listSaves({ category_id: selectedCategory ?? undefined, limit: 200 }),
  });

  const clustered = saves?.reduce<Record<string, typeof saves>>(
    (acc, save) => {
      const key = save.cluster_id ?? "__none__";
      if (!acc[key]) acc[key] = [];
      acc[key].push(save);
      return acc;
    },
    {}
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0">
          <div className="sticky top-24">
            <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-vault-border">Categories</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs transition-all ${
                  selectedCategory === null
                    ? "bg-vault-gold/15 text-vault-gold-bright"
                    : "text-vault-muted hover:text-vault-text hover:bg-vault-surface"
                }`}
              >
                <span>All saves</span>
                {saves && <span className="text-[9px] opacity-60">{saves.length}</span>}
              </button>
              {categories?.map((cat) => {
                const count = saves?.filter((s) => s.category_id === cat.id).length ?? 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs transition-all ${
                      selectedCategory === cat.id
                        ? "bg-vault-gold/15 text-vault-gold-bright"
                        : "text-vault-muted hover:text-vault-text hover:bg-vault-surface"
                    }`}
                  >
                    <span>{cat.label}</span>
                    {count > 0 && <span className="text-[9px] opacity-50">{count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border-t border-vault-border pt-6 space-y-0.5">
              <Link href="/search" className="flex items-center gap-2 rounded px-3 py-2 text-xs text-vault-muted hover:text-vault-text hover:bg-vault-surface transition-all">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/><path d="M8 8l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Search
              </Link>
              <Link href="/settings" className="flex items-center gap-2 rounded px-3 py-2 text-xs text-vault-muted hover:text-vault-text hover:bg-vault-surface transition-all">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 1v1M6 10v1M1 6h1M10 6h1M2.5 2.5l.7.7M8.8 8.8l.7.7M2.5 9.5l.7-.7M8.8 3.2l.7-.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                Settings
              </Link>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="mb-0.5 text-[10px] uppercase tracking-[0.2em] text-vault-muted">Your collection</p>
              <h1 className="text-2xl font-bold text-vault-text" style={{ fontFamily: "var(--font-fraunces)" }}>
                {selectedCategory
                  ? categories?.find((c) => c.id === selectedCategory)?.label ?? "Feed"
                  : "All Saves"}
              </h1>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-vault-border p-1">
              <button
                onClick={() => setView("grid")}
                className={`rounded p-1.5 transition-all ${view === "grid" ? "bg-vault-gold/20 text-vault-gold" : "text-vault-muted hover:text-vault-text"}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="1" y="1" width="5" height="5" rx="1"/>
                  <rect x="8" y="1" width="5" height="5" rx="1"/>
                  <rect x="1" y="8" width="5" height="5" rx="1"/>
                  <rect x="8" y="8" width="5" height="5" rx="1"/>
                </svg>
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded p-1.5 transition-all ${view === "list" ? "bg-vault-gold/20 text-vault-gold" : "text-vault-muted hover:text-vault-text"}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="1" y="2" width="12" height="2" rx="1"/>
                  <rect x="1" y="6" width="12" height="2" rx="1"/>
                  <rect x="1" y="10" width="12" height="2" rx="1"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            view === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SaveCardSkeleton key={i} view="grid" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SaveCardSkeleton key={i} view="list" />
                ))}
              </div>
            )
          ) : saves?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <p className="text-5xl text-vault-border mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>Empty.</p>
              <p className="text-sm text-vault-muted">Send a TikTok or Instagram URL via iMessage to save your first video.</p>
            </div>
          ) : clustered ? (
            <div className="space-y-10 stagger-fade">
              {Object.entries(clustered).map(([clusterId, clusterSaves]) => (
                <div key={clusterId}>
                  {clusterId !== "__none__" && clusterSaves.length > 1 && (
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-vault-border" />
                      <span className="text-[10px] uppercase tracking-widest text-vault-gold/60">Related</span>
                      <div className="h-px flex-1 bg-vault-border" />
                    </div>
                  )}
                  {view === "grid" ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {clusterSaves.map((save) => (
                        <SaveCard key={save.id} save={save} view="grid" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clusterSaves.map((save) => (
                        <SaveCard key={save.id} save={save} view="list" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </main>
      </div>
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
