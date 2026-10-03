"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { api, STOREFRONT_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";
import { LoadingBlock } from "@/components/ui/data";
import { NAV } from "./nav";

type Counts = Partial<Pick<DashboardStats["kpis"], "pending_orders" | "pending_reviews" | "unread_messages">>;

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-sm bg-ink-900 font-display text-xl font-bold text-white", className)}>
      F
    </span>
  );
}

function Sidebar({ counts, onNavigate }: { counts: Counts; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-cream-300 px-5">
        <BrandMark />
        <div className="leading-tight">
          <p className="font-display text-lg tracking-wide text-ink-900">FEXO</p>
          <p className="text-[11px] font-semibold tracking-wider text-ink-500 uppercase">Admin Portal</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 scroll-thin">
        {NAV.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-ink-500 uppercase">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const badge = item.badge ? counts[item.badge] : 0;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-3 rounded-sm px-3 text-sm transition-colors",
                        active ? "bg-ink-900 font-semibold text-white" : "text-ink-700 hover:bg-cream-100 hover:text-ink-900",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {!!badge && (
                        <span
                          className={cn(
                            "rounded-pill px-1.5 py-px text-[11px] font-semibold",
                            active ? "bg-white text-ink-900" : "bg-ink-900 text-white",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-cream-300 p-3">
        <a
          href={STOREFRONT_URL}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 items-center gap-3 rounded-sm px-3 text-sm text-ink-700 hover:bg-cream-100 hover:text-ink-900"
        >
          <ExternalLink className="size-4" aria-hidden />
          View storefront
        </a>
      </div>
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>({});

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  // Sidebar badge counts — refreshed on navigation so they track changes.
  useEffect(() => {
    if (!user) return;
    api
      .get<DashboardStats>("/stats/", { days: 1 })
      .then((s) =>
        setCounts({
          pending_orders: s.kpis.pending_orders,
          pending_reviews: s.kpis.pending_reviews,
          unread_messages: s.kpis.unread_messages,
        }),
      )
      .catch(() => undefined);
  }, [user, pathname]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100">
        <LoadingBlock label="Verifying session…" />
      </div>
    );
  }

  const initials = (user.full_name || user.username)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-cream-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-cream-300 bg-white lg:block">
        <Sidebar counts={counts} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="animate-fade-in absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 rounded-sm p-1 text-ink-500 hover:bg-cream-200"
            >
              <X className="size-5" />
            </button>
            <Sidebar counts={counts} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-cream-300 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="rounded-sm p-1.5 text-ink-700 hover:bg-cream-200 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className="size-2 rounded-full bg-success-500" aria-hidden />
            <span className="hidden sm:inline">Connected to FEXO API</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink-900">{user.full_name || user.username}</p>
              <p className="text-xs text-ink-500">{user.is_superuser ? "Super admin" : "Staff"}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
              {initials}
            </span>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-cream-300 px-3 text-[13px] font-semibold text-ink-700 hover:bg-cream-100"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
