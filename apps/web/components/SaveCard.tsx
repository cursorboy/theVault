"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Save } from "@/lib/api";

interface Props {
  save: Save;
  view?: "grid" | "list";
}

const CAT_LABEL: Record<string, string> = {};

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "tt",
  instagram: "ig",
};

export function SaveCard({ save, view = "grid" }: Props) {
  const isProcessing = !["done", "failed"].includes(save.status);
  const timeAgo = save.created_at
    ? formatDistanceToNow(new Date(save.created_at), { addSuffix: false })
    : "";

  if (view === "grid") {
    return (
      <Link
        href={`/save/${save.id}`}
        className="group flex flex-col gap-3 cursor-pointer"
      >
        {/* Thumbnail */}
        <div className="relative overflow-hidden rounded-md border border-edge bg-panel transition-all duration-200 group-hover:border-edge2 group-hover:-translate-y-0.5 group-hover:shadow-md aspect-[9/14]">
          {save.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={save.thumbnail_url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-edge to-edge2">
              <div className="text-text4">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 8l6 4-6 4V8z" fill="currentColor" opacity="0.5" />
                </svg>
              </div>
            </div>
          )}

          {/* platform pill */}
          <span
            className={`absolute top-2 left-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] px-1.5 py-1 rounded text-white`}
            style={{
              background: save.platform === "tiktok" ? "var(--tt)" : "var(--ig)",
            }}
          >
            {PLATFORM_LABEL[save.platform] ?? save.platform}
          </span>

          {/* duration */}
          {save.duration_secs ? (
            <span className="absolute bottom-2 right-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/55 text-white/90 backdrop-blur-sm">
              {Math.floor(save.duration_secs / 60)}:
              {String(save.duration_secs % 60).padStart(2, "0")}
            </span>
          ) : null}

          {/* status dot */}
          {isProcessing && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-warn animate-pulse" />
          )}
        </div>

        {/* meta */}
        <div className="flex flex-col gap-1 px-0.5">
          <h3 className="text-[13px] leading-[1.35] text-text font-medium line-clamp-2 group-hover:text-accent transition-colors">
            {save.title || (isProcessing ? "processing" : "untitled")}
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            {save.tags?.[0] && (
              <>
                <span className="text-text3 uppercase tracking-[0.06em]">
                  {save.tags[0]}
                </span>
                <span className="text-text4">·</span>
              </>
            )}
            <span className="text-text3">{timeAgo} ago</span>
          </div>
        </div>
      </Link>
    );
  }

  // list view
  return (
    <Link
      href={`/save/${save.id}`}
      className="group flex items-center gap-4 rounded-md border border-edge bg-vault hover:bg-panel hover:border-edge2 transition-all p-3"
    >
      <div className="relative flex-shrink-0 h-14 w-14 overflow-hidden rounded border border-edge bg-panel">
        {save.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={save.thumbnail_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text4">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 3h10v10H3V3zm2.5 2.5l4 2.5-4 2.5V5.5z" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] text-text font-medium line-clamp-1 group-hover:text-accent transition-colors">
          {save.title || (isProcessing ? "processing" : "untitled")}
        </h3>
        {save.summary && (
          <p className="mt-0.5 line-clamp-1 text-[12px] text-text2">
            {save.summary}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-text3">
          <span className="uppercase tracking-[0.08em]">
            {PLATFORM_LABEL[save.platform] ?? save.platform}
          </span>
          {save.tags?.slice(0, 3).map((tag) => (
            <span key={tag}>· {tag}</span>
          ))}
        </div>
      </div>

      <span className="flex-shrink-0 font-mono text-[10px] text-text4">
        {timeAgo}
      </span>
    </Link>
  );
}

export function SaveCardSkeleton({ view = "grid" }: { view?: "grid" | "list" }) {
  if (view === "grid") {
    return (
      <div className="flex flex-col gap-3">
        <div className="skeleton aspect-[9/14] rounded-md" />
        <div className="space-y-1.5 px-0.5">
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-edge bg-vault p-3">
      <div className="flex gap-4">
        <div className="skeleton h-14 w-14 flex-shrink-0 rounded" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-full" />
        </div>
      </div>
    </div>
  );
}
