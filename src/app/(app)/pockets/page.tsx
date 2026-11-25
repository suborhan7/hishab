import type { Metadata } from "next";
import { createPocket } from "@/app/actions/pockets";
import { Icon } from "@/components/icons";
import { PocketCard } from "@/components/pocket-card";
import { PocketFields } from "@/components/pocket-fields";
import { PageTitle, SectionTitle } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { listPockets } from "@/lib/data";

export const metadata: Metadata = { title: "Pockets" };

export default async function PocketsPage() {
  const { t } = await getI18n();
  const all = await listPockets({ includeArchived: true });
  const active = all.filter((p) => !p.archived);
  const archived = all.filter((p) => p.archived);

  return (
    <>
      <PageTitle title={t("pockets.title")} />
      <div className="grid gap-3 sm:grid-cols-2">
        {active.map((p) => (
          <PocketCard key={p.id} pocket={p} />
        ))}
      </div>

      <details className="card mt-5 p-4">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-accent">
          <Icon name="plus" /> {t("pockets.add")}
        </summary>
        <form action={createPocket} className="mt-4 space-y-4">
          <PocketFields />
          <button className="btn-primary w-full">{t("common.save")}</button>
        </form>
      </details>

      {archived.length > 0 && (
        <>
          <SectionTitle>{t("pockets.archived")}</SectionTitle>
          <div className="grid gap-3 opacity-75 sm:grid-cols-2">
            {archived.map((p) => (
              <PocketCard key={p.id} pocket={p} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
