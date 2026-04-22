"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SaveCard, SaveCardSkeleton } from "@/components/SaveCard";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";

function CategoryPage() {
  const params = useParams<{ category: string }>();
  const slug = decodeURIComponent(params.category);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: api.listCategories,
  });

  const category = categories?.find((c) => c.slug === slug);

  const { data: saves, isLoading } = useQuery({
    queryKey: ["saves", category?.id],
    queryFn: () => api.listSaves({ category_id: category?.id }),
    enabled: !!category,
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
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-xs text-vault-muted hover:text-vault-text transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
          All saves
        </Link>
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-vault-muted">Category</p>
        <h1
          className="text-3xl font-bold text-vault-text"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {category?.label ?? slug}
        </h1>
        {saves && (
          <p className="mt-1 text-xs text-vault-muted">
            {saves.length} {saves.length === 1 ? "video" : "videos"}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SaveCardSkeleton key={i} />
          ))}
        </div>
      ) : saves?.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-vault-muted text-sm">No saves in this category yet.</p>
        </div>
      ) : clustered ? (
        <div className="space-y-8 stagger-fade">
          {Object.entries(clustered).map(([clusterId, clusterSaves]) => (
            <div key={clusterId}>
              {clusterId !== "__none__" && clusterSaves.length > 1 && (
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-vault-border" />
                  <span className="text-[10px] uppercase tracking-widest text-vault-gold/60">Cluster</span>
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
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <Navbar />
      <CategoryPage />
    </AuthGate>
  );
}
