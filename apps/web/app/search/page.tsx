"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { SaveCard, SaveCardSkeleton } from "@/components/SaveCard";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/api";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ["search", submitted],
    queryFn: () => api.searchSaves(submitted),
    enabled: submitted.length > 0,
  });

  const loading = isLoading || isFetching;

  return (
    <div className="mx-auto max-w-[920px] px-8 py-12 relative z-10">
      <div className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-text3 mb-2">
          semantic search
        </div>
        <h1 className="font-display text-[56px] leading-[1.04] tracking-[-0.02em] text-text mb-2">
          ask in <span className="italic text-accent">plain language</span>.
        </h1>
        <p className="text-[15px] text-text2 max-w-[560px]">
          search by meaning, not keywords. try "that ramen spot solo booths" or
          "quick weeknight dinners".
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) setSubmitted(query.trim());
        }}
        className="flex gap-3 mb-8"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "the pull-up workout w/o equipment"'
            className="w-full rounded-md border border-edge2 bg-panel px-5 py-3.5 text-[15px] text-text placeholder:text-text4 focus:border-accent focus:outline-none transition-colors"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim()}
          className="rounded-md bg-accent text-accent-ink px-6 py-3.5 text-[13px] font-mono uppercase tracking-[0.14em] hover:bg-accent-soft transition-colors disabled:opacity-40"
        >
          search
        </button>
      </form>

      {submitted && !loading && (
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-text3 mb-5">
          results for{" "}
          <span className="text-accent">{`"${submitted}"`}</span>
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SaveCardSkeleton key={i} view="list" />
          ))}
        </div>
      ) : results && results.length > 0 ? (
        <div className="space-y-2 stagger-fade">
          {results.map((save) => (
            <SaveCard key={save.id} save={save} view="list" />
          ))}
        </div>
      ) : results && results.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-[40px] text-edge2 mb-2">nothing matched.</p>
          <p className="text-[14px] text-text3">try different keywords or broader terms.</p>
        </div>
      ) : !submitted ? (
        <div className="py-16 text-center">
          <div className="font-display italic text-[42px] text-edge2 mb-3">
            ask anything.
          </div>
          <p className="text-[14px] text-text3 max-w-[420px] mx-auto">
            we embed your query as a vector and rank your library by cosine similarity.
            no exact-match required.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <Navbar />
      <SearchPage />
    </AuthGate>
  );
}
