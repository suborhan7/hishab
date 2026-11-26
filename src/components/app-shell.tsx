"use client";
/**
 * Navigation chrome.
 * - Phone: slim top bar + bottom tab bar with a big raised "+" button.
 * - Laptop (md+): left sidebar with a prominent "Add transaction" button.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n";
import { Icon, type IconName } from "./icons";
import { Logo } from "./logo";
import { PreferenceToggles } from "./preference-toggles";

type NavItem = { href: string; label: MessageKey; icon: IconName };

const PRIMARY: NavItem[] = [
  { href: "/", label: "nav.home", icon: "home" },
  { href: "/history", label: "nav.history", icon: "list" },
  { href: "/pockets", label: "nav.pockets", icon: "wallet" },
  { href: "/more", label: "nav.more", icon: "more" },
];

const SECONDARY: NavItem[] = [
  { href: "/reconcile", label: "nav.reconcile", icon: "scale" },
  { href: "/summary", label: "nav.summary", icon: "chart" },
  { href: "/fees", label: "nav.fees", icon: "receipt" },
  { href: "/settings", label: "nav.settings", icon: "gear" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/more") return ["/more", ...SECONDARY.map((s) => s.href)].some((h) => pathname.startsWith(h));
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (laptop) */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-line bg-surface p-4 md:flex">
        <Link href="/" className="mb-4 flex items-center gap-2.5 px-2">
          <Logo className="size-9" />
          <span className="text-xl font-bold">{t("app.name")}</span>
        </Link>
        <Link href="/add" className="btn-primary mb-3 w-full">
          <Icon name="plus" /> {t("add.title")}
        </Link>
        {[...PRIMARY.filter((p) => p.href !== "/more"), ...SECONDARY].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
              isActive(pathname, item.href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Icon name={item.icon} />
            {t(item.label)}
          </Link>
        ))}
        <div className="mt-auto px-1">
          <PreferenceToggles />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar (phone) */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="size-8" />
            <span className="text-lg font-bold">{t("app.name")}</span>
          </Link>
          <PreferenceToggles />
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-32 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>

      {/* Bottom tab bar (phone) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end">
          {PRIMARY.slice(0, 2).map((item) => (
            <TabLink key={item.href} item={item} active={isActive(pathname, item.href)} label={t(item.label)} />
          ))}
          <Link
            href="/add"
            aria-label={t("add.title")}
            className="-mt-6 mb-1 flex flex-col items-center gap-1 text-xs font-semibold text-accent"
          >
            <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-fg shadow-lg ring-4 ring-bg">
              <Icon name="plus" className="size-8" />
            </span>
            {t("nav.add")}
          </Link>
          {PRIMARY.slice(2).map((item) => (
            <TabLink key={item.href} item={item} active={isActive(pathname, item.href)} label={t(item.label)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function TabLink({ item, active, label }: { item: NavItem; active: boolean; label: string }) {
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center gap-1 px-1 py-2.5 text-center text-[11px] leading-tight font-medium ${
        active ? "text-accent" : "text-muted"
      }`}
    >
      <Icon name={item.icon} className="size-6" />
      <span className="line-clamp-1">{label}</span>
    </Link>
  );
}

export { SECONDARY as MORE_LINKS };
