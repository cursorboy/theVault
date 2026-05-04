"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "feed" },
  { href: "/search", label: "search" },
  { href: "/reminders", label: "reminders" },
  { href: "/memory", label: "memory" },
  { href: "/settings", label: "settings" },
];

export function Navbar() {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-50 border-b border-edge bg-vault/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-3">
        <Link href="/" className="group flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-icon.png"
            alt=""
            className="h-9 w-auto object-contain transition-transform group-hover:-rotate-3"
          />
          <span className="font-display text-[20px] tracking-tight text-text leading-none">
            <span className="italic text-text2 mr-1">the</span>Vault
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const active = path === href || (href !== "/" && path.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase font-mono transition-colors ${
                  active
                    ? "text-accent bg-[rgba(30,77,84,0.08)] border border-[rgba(30,77,84,0.18)]"
                    : "text-text3 hover:text-text2 hover:bg-panel border border-transparent"
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
