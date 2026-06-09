"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Billing" },
  { href: "/team", label: "Team" },
  { href: "/settings/webhooks", label: "Webhooks" },
  { href: "/settings/api-keys", label: "API" },
];

interface Props {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

/** Shared authenticated shell: nav, skip link, help/support footer. */
export default function AppShell({ title, subtitle, children, actions }: Props) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cream)" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg"
        style={{ background: "var(--gold)", color: "var(--navy)" }}
      >
        Skip to main content
      </a>
      <header
        className="sticky top-0 z-40 px-4 sm:px-6 py-3"
        style={{ background: "var(--navy)", borderBottom: "1px solid rgba(201,168,76,0.2)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-display text-lg font-semibold" style={{ color: "var(--gold)" }}>
              SignToSeal
            </Link>
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: pathname.startsWith(item.href) ? "rgba(201,168,76,0.15)" : "transparent",
                    color: pathname.startsWith(item.href) ? "var(--gold)" : "rgba(250,247,240,0.7)",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(250,247,240,0.6)" }}>
            <a href="mailto:hello@signtoseal.com" className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ outlineColor: "var(--gold)" }}>
              Help
            </a>
            <span aria-hidden="true">·</span>
            <span className="truncate max-w-[160px]">{user?.email}</span>
            {actions}
          </div>
        </div>
        {(title || subtitle) && (
          <div className="max-w-7xl mx-auto mt-3">
            {title && <h1 className="font-display text-xl font-bold" style={{ color: "var(--cream)" }}>{title}</h1>}
            {subtitle && <p className="text-sm mt-0.5" style={{ color: "rgba(250,247,240,0.6)" }}>{subtitle}</p>}
          </div>
        )}
      </header>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <footer className="px-6 py-4 text-center text-xs" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
        <Link href="/terms" className="underline mr-3">Terms</Link>
        <Link href="/privacy" className="underline mr-3">Privacy</Link>
        <a href="mailto:hello@signtoseal.com" className="underline">Support</a>
      </footer>
    </div>
  );
}
