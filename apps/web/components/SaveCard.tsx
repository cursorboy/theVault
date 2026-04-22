"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Save } from "@/lib/api";

interface Props {
  save: Save;
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

export function SaveCard({ save }: Props) {
  const isProcessing = !["done", "failed"].includes(save.status);
  const timeAgo = save.created_at
    ? formatDistanceToNow(new Date(save.created_at), { addSuffix: true })
    : "";

  return (
    <Link
      href={`/save/${save.id}`}
      className="group block rounded-lg border border-vault-border bg-vault-surface p-5 transition-all duration-200 hover:border-vault-gold/30 hover:bg-vault-surface/80 hover:-translate-y-0.5 gold-glow"
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0">
          <div className="h-20 w-14 overflow-hidden rounded border border-vault-border bg-vault-bg">
            {save.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={save.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-vault-border">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4h12v12H4V4zm3 3l5 3-5 3V7z"/>
                </svg>
              </div>
            )}
          </div>
          {save.duration_secs && (
            <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] text-vault-muted">
              {Math.floor(save.duration_secs / 60)}:{String(save.duration_secs % 60).padStart(2, "0")}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <h3
              className="line-clamp-2 text-sm font-semibold leading-snug text-vault-text group-hover:text-vault-gold-bright transition-colors"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {save.title || (isProcessing ? "Processing…" : "Untitled")}
            </h3>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <div
                className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[save.status] ?? "bg-vault-muted"}`}
              />
            </div>
          </div>

          {save.summary && (
            <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-vault-muted">
              {save.summary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-widest platform-${save.platform}`}
            >
              {save.platform}
            </span>

            {save.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded border border-vault-border/60 px-1.5 py-0.5 text-[9px] text-vault-muted uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}

            {timeAgo && (
              <span className="ml-auto text-[10px] text-vault-border">{timeAgo}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function SaveCardSkeleton() {
  return (
    <div className="rounded-lg border border-vault-border bg-vault-surface p-5">
      <div className="flex gap-4">
        <div className="skeleton h-20 w-14 flex-shrink-0 rounded" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
        </div>
      </div>
    </div>
  );
}
