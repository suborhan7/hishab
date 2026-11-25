/** Small shared presentational pieces (server- and client-safe). */
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export function PageTitle({
  title,
  backHref,
  actions,
  subtitle,
}: {
  title: ReactNode;
  backHref?: string;
  actions?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="no-print mb-5 flex items-start gap-3">
      {backHref && (
        <Link
          href={backHref}
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface"
          aria-label="Back"
        >
          <Icon name="left" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl leading-tight font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

const tones = {
  danger: "bg-danger-soft text-danger border-danger/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  ok: "bg-ok-soft text-ok border-ok/30",
  info: "bg-accent-soft text-accent border-accent/30",
};

export function Alert({
  tone = "info",
  icon,
  children,
  className = "",
}: {
  tone?: keyof typeof tones;
  icon?: IconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}>
      {icon && <Icon name={icon} className="mt-0.5 size-5 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  tone,
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "ok" | "danger" | "warn" | "accent";
  className?: string;
}) {
  const color =
    tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "accent" ? "text-accent" : "";
  return (
    <div className={`card p-4 ${className}`}>
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-7 mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export const POCKET_COLORS = ["teal", "amber", "violet", "rose", "sky", "lime"] as const;

export function pocketColor(color: string) {
  return `var(--p-${POCKET_COLORS.includes(color as never) ? color : "teal"})`;
}
