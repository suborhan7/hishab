import Link from "next/link";
import { MORE_LINKS } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { PageTitle } from "@/components/ui";
import { getI18n } from "@/i18n/server";

/** Phone-only menu for the screens that do not fit in the bottom bar. */
export default async function MorePage() {
  const { t } = await getI18n();
  return (
    <>
      <PageTitle title={t("nav.more")} />
      <ul className="card divide-y divide-line">
        {MORE_LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-3 px-4 py-4 text-lg font-medium hover:bg-surface-2">
              <Icon name={l.icon} className="size-6 text-accent" />
              <span className="flex-1">{t(l.label)}</span>
              <Icon name="right" className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
