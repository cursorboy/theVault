"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Save } from "@/lib/api";

interface Props {
  save: Save;
  view?: "grid" | "list";
}

const STATUS_DOT: Record<string, string> = {
  done: "bg-emerald-500",
  pending: "bg-vault-gold animate-pulse",
  downloading: "bg-blue-400 animate-pulse",
  transcribing: "bg-blue-400 animate-pulse",
  analyzing: "bg-blue-400 animate-pulse",
  synthesizing: "bg-blue-400 animate-pulse",
  failed: "bg-red-500",
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  tiktok: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
    </svg>
  ),
  instagram: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
};

export function SaveCard({ save, view = "grid" }: Props) {
  const isProcessing = !["done", "failed"].includes(save.status);
  const timeAgo = save.created_at
    ? formatDistanceToNow(new Date(save.created_at), { addSuffix: true })
    : "";

  if (view === "grid") {
    return (
      <div className="group relative flex flex-col rounded-xl border border-vault-border bg-vault-surface overflow-hidden transition-all duration-200 hover:border-vault-gold/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-vault-gold/5">
        {/* Thumbnail */}
        <Link href={`/save/${save.id}`} className="block relative aspect-[9/14] overflow-hidden bg-vault-bg flex-shrink-0">
          {save.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={save.thumbnail_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-vault-border">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M13 11l8 5-8 5V11z" fill="currentColor" opacity="0.4"/>
                </svg>
              </div>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Duration */}
          {save.duration_secs && (
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white/80 backdrop-blur-sm">
              {Math.floor(save.duration_secs / 60)}:{String(save.duration_secs % 60).padStart(2, "0")}
            </span>
          )}

          {/* Status dot */}
          <div className={`absolute top-2 right-2 h-2 w-2 rounded-full ${STATUS_DOT[save.status] ?? "bg-vault-muted"}`} />

          {/* Platform badge */}
          <div className={`absolute top-2 left-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-widest platform-${save.platform} border backdrop-blur-sm bg-black/40`}>
            {PLATFORM_ICON[save.platform]}
            {save.platform}
          </div>
        </Link>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3">
          <Link href={`/save/${save.id}`}>
            <h3
              className="mb-1 line-clamp-2 text-xs font-semibold leading-snug text-vault-text group-hover:text-vault-gold-bright transition-colors"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {save.title || (isProcessing ? "Processing…" : "Untitled")}
            </h3>
          </Link>

          {save.tags && save.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {save.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[9px] text-vault-muted">#{tag}</span>
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between pt-2 border-t border-vault-border/40">
            <span className="text-[9px] text-vault-border">{timeAgo}</span>
            <a
              href={save.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[9px] uppercase tracking-widest transition-all platform-${save.platform} border hover:bg-white/5`}
            >
              {PLATFORM_ICON[save.platform]}
              View
            </a>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="group flex items-center gap-4 rounded-lg border border-vault-border bg-vault-surface p-4 transition-all duration-200 hover:border-vault-gold/30 hover:bg-vault-surface/80">
      <Link href={`/save/${save.id}`} className="relative flex-shrink-0">
        <div className="h-16 w-11 overflow-hidden rounded border border-vault-border bg-vault-bg">
          {save.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={save.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-vault-border">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h10v10H3V3zm2.5 2.5l4 2.5-4 2.5V5.5z"/></svg>
            </div>
          )}
        </div>
        <div className={`absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full ${STATUS_DOT[save.status] ?? "bg-vault-muted"}`} />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/save/${save.id}`}>
          <h3 className="mb-0.5 line-clamp-1 text-sm font-semibold text-vault-text group-hover:text-vault-gold-bright transition-colors" style={{ fontFamily: "var(--font-fraunces)" }}>
            {save.title || (isProcessing ? "Processing…" : "Untitled")}
          </h3>
        </Link>
        {save.summary && (
          <p className="line-clamp-1 text-xs text-vault-muted">{save.summary}</p>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          {save.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[9px] text-vault-border">#{tag}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <span className="text-[9px] text-vault-border">{timeAgo}</span>
        <a
          href={save.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 rounded border px-2 py-1 text-[9px] uppercase tracking-widest transition-all platform-${save.platform} hover:bg-white/5`}
        >
          {PLATFORM_ICON[save.platform]}
          View
        </a>
      </div>
    </div>
  );
}

export function SaveCardSkeleton({ view = "grid" }: { view?: "grid" | "list" }) {
  if (view === "grid") {
    return (
      <div className="rounded-xl border border-vault-border bg-vault-surface overflow-hidden">
        <div className="skeleton aspect-[9/14]" />
        <div className="p-3 space-y-2">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-vault-border bg-vault-surface p-4">
      <div className="flex gap-4">
        <div className="skeleton h-16 w-11 flex-shrink-0 rounded" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-full rounded" />
        </div>
      </div>
    </div>
  );
}
