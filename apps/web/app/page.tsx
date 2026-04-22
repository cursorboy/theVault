"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SaveCard, SaveCardSkeleton } from "@/components/SaveCard";
import { AuthGate } from "@/components/AuthGate";
import { api, type Category } from "@/lib/api";

function FeedPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.listCategories,
  });

  const { data: saves, isLoading } = useQuery({
    queryKey: ["saves", selectedCategory],
    queryFn: () => api.listSaves({ category_id: selectedCategory ?? undefined }),
  });

  // Group by cluster
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-vault-muted">Your collection</p>
          <h1
            className="text-3xl font-bold text-vault-text"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {selectedCategory
              ? categories?.find((c) => c.id === selectedCategory)?.label ?? "Feed"
              : "All Saves"}
          </h1>
        </div>
        {saves && (
          <span className="text-xs text-vault-muted">
            {saves.length} {saves.length === 1 ? "video" : "videos"}
          </span>
        )}
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-44 flex-shrink-0">
          <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-vault-border">Categories</p>
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`block w-full rounded px-3 py-2 text-left text-xs transition-all ${
                selectedCategory === null
                  ? "bg-vault-gold/15 text-vault-gold-bright"
                  : "text-vault-muted hover:text-vault-text hover:bg-vault-surface"
              }`}
            >
              All
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`block w-full rounded px-3 py-2 text-left text-xs transition-all ${
                  selectedCategory === cat.id
                    ? "bg-vault-gold/15 text-vault-gold-bright"
                    : "text-vault-muted hover:text-vault-text hover:bg-vault-surface"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="mt-8 border-t border-vault-border pt-6">
            <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-vault-border">Quick links</p>
            <div className="space-y-0.5">
              <Link href="/search" className="block rounded px-3 py-2 text-xs text-vault-muted hover:text-vault-text hover:bg-vault-surface transition-all">
                Search
              </Link>
              <Link href="/settings" className="block rounded px-3 py-2 text-xs text-vault-muted hover:text-vault-text hover:bg-vault-surface transition-all">
                Settings
              </Link>
            </div>
          </div>
        </aside>

        {/* Feed */}
        <main className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SaveCardSkeleton key={i} />
              ))}
            </div>
          ) : saves?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="mb-3 text-5xl text-vault-border"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                Empty.
              </div>
              <p className="text-sm text-vault-muted">
                Send a TikTok or Instagram URL via iMessage to save your first video.
              </p>
            </div>
          ) : clustered && Object.keys(clustered).length > 0 ? (
            <div className="space-y-8 stagger-fade">
              {Object.entries(clustered).map(([clusterId, clusterSaves]) => (
                <div key={clusterId}>
                  {clusterId !== "__none__" && clusterSaves.length > 1 && (
                    <div className="mb-3 flex items-center gap-3">
                      <div className="h-px flex-1 bg-vault-border" />
                      <span className="text-[10px] uppercase tracking-widest text-vault-gold/60">
                        Cluster
                      </span>
                      <div className="h-px flex-1 bg-vault-border" />
                    </div>
                  )}
                  <div className="space-y-2">
                    {clusterSaves.map((save) => (
                      <SaveCard key={save.id} save={save} />
                    ))}
                  </div>
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
