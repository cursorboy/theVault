"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Feed" },
  { href: "/search", label: "Search" },
  { href: "/settings", label: "Settings" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-50 border-b border-vault-border bg-vault-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-vault-gold/40 bg-vault-gold/10 text-vault-gold transition-all group-hover:bg-vault-gold/20 group-hover:border-vault-gold/60">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" fill="currentColor" opacity="0.6"/>
              <rect x="8" y="1" width="5" height="5" fill="currentColor"/>
              <rect x="1" y="8" width="5" height="5" fill="currentColor"/>
              <rect x="8" y="8" width="5" height="5" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>
          <span
            className="font-display text-lg font-semibold tracking-wide text-vault-text"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            ReelVault
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const active = path === href || (href !== "/" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded px-3 py-1.5 text-xs tracking-widest uppercase transition-all ${
                  active
                    ? "bg-vault-gold/15 text-vault-gold-bright"
                    : "text-vault-muted hover:text-vault-text hover:bg-vault-surface"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
