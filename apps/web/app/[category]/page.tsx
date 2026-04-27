"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
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

  return (
    <div className="mx-auto max-w-[1320px] px-8 py-10 relative z-10">
      <div className="mb-8">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-text3 hover:text-text2 transition-colors"
        >
          ← all saves
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-1">
          category
        </div>
        <h1 className="font-display text-[48px] leading-[1.04] tracking-[-0.02em] text-text">
          {category?.label.toLowerCase() ?? slug}
          <span className="italic text-text2">.</span>
        </h1>
        {saves && (
          <p className="mt-2 text-[14px] text-text2">
            {saves.length} {saves.length === 1 ? "save" : "saves"}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SaveCardSkeleton key={i} />
          ))}
        </div>
      ) : !saves || saves.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-[42px] text-edge2 mb-2">empty.</p>
          <p className="text-[14px] text-text3">
            no saves in this category yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 stagger-fade">
          {saves.map((save) => (
            <SaveCard key={save.id} save={save} />
          ))}
        </div>
      )}
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
