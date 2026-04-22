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
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-10">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-vault-muted">Semantic</p>
        <h1
          className="mb-6 text-3xl font-bold text-vault-text"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Search
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) setSubmitted(query.trim());
          }}
          className="flex gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="fitness routines, pasta recipes, react hooks…"
              className="w-full rounded-lg border border-vault-border bg-vault-surface px-4 py-3 text-sm text-vault-text placeholder-vault-border focus:border-vault-gold/50 focus:outline-none focus:ring-1 focus:ring-vault-gold/20 transition-all"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim()}
            className="rounded-lg border border-vault-gold/40 bg-vault-gold/10 px-5 py-3 text-sm text-vault-gold transition-all hover:bg-vault-gold/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Search
          </button>
        </form>

        {submitted && (
          <p className="mt-3 text-xs text-vault-muted">
            Results for <span className="text-vault-text">"{submitted}"</span>
          </p>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SaveCardSkeleton key={i} />
          ))}
        </div>
      ) : results && results.length > 0 ? (
        <div className="space-y-2 stagger-fade">
          {results.map((save) => (
            <SaveCard key={save.id} save={save} />
          ))}
        </div>
      ) : results && results.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-vault-muted text-sm">No results found for "{submitted}"</p>
          <p className="mt-2 text-xs text-vault-border">Try different keywords or broader terms</p>
        </div>
      ) : !submitted ? (
        <div className="py-16 text-center">
          <p
            className="text-4xl text-vault-border mb-3"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Semantic search
          </p>
          <p className="text-sm text-vault-muted">
            Search by meaning — not just keywords. Find videos by topic, mood, or concept.
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
