import type { Metadata } from "next";
import Link from "next/link";
import { TX_TYPES, type Direction, type TxType } from "@/db/schema";
import { Icon } from "@/components/icons";
import { TxList } from "@/components/tx-list";
import { PageTitle, Stat } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { listPeople, listPockets, listTransactions, sumTransactions, type TxFilters } from "@/lib/data";
import { dayEnd, dayStart } from "@/lib/dates";

export const metadata: Metadata = { title: "History" };
const PAGE = 50;

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const { t, money, num } = await getI18n();

  const filters: TxFilters = {
    q: s("q"),
    pocketId: s("pocket") ? Number(s("pocket")) : undefined,
    type: TX_TYPES.includes(s("type") as TxType) ? (s("type") as TxType) : undefined,
    direction: s("dir") === "in" || s("dir") === "out" ? (s("dir") as Direction) : undefined,
    person: s("person"),
    from: s("from") ? (dayStart(s("from")!) ?? undefined) : undefined,
    to: s("to") ? (dayEnd(s("to")!) ?? undefined) : undefined,
  };
  const limit = Math.min(1000, Number(s("limit") ?? PAGE) || PAGE);
  const [pockets, people, rows, totals] = await Promise.all([
    listPockets({ includeArchived: true }),
    listPeople(),
    listTransactions(filters, { limit }),
    sumTransactions(filters),
  ]);
  const activeFilters = ["pocket", "type", "dir", "person", "from", "to"].filter((k) => s(k)).length;
  const moreParams = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
  moreParams.set("limit", String(limit + PAGE));

  return (
    <>
      <PageTitle title={t("history.title")} />
      <form className="space-y-3">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={s("q")}
            placeholder={t("history.searchPlaceholder")}
            className="field pl-11"
            type="search"
          />
        </div>
        <details className="card p-4" open={activeFilters > 0}>
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <Icon name="filter" /> {t("history.filters")}
            {activeFilters > 0 && (
              <span className="rounded-full bg-accent px-2 text-xs text-accent-fg">{num(activeFilters)}</span>
            )}
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pocket">
                {t("tx.pocket")}
              </label>
              <select id="pocket" name="pocket" defaultValue={s("pocket") ?? ""} className="field">
                <option value="">{t("common.all")}</option>
                {pockets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="person">
                {t("history.person")}
              </label>
              <input id="person" name="person" list="hist-people" defaultValue={s("person")} className="field" />
              <datalist id="hist-people">
                {people.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor="type">
                {t("tx.type")}
              </label>
              <select id="type" name="type" defaultValue={s("type") ?? ""} className="field">
                <option value="">{t("common.all")}</option>
                {TX_TYPES.map((tt) => (
                  <option key={tt} value={tt}>
                    {t(`type.${tt}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dir">
                {t("tx.direction")}
              </label>
              <select id="dir" name="dir" defaultValue={s("dir") ?? ""} className="field">
                <option value="">{t("common.all")}</option>
                <option value="in">{t("dir.in")}</option>
                <option value="out">{t("dir.out")}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="from">
                {t("common.from")}
              </label>
              <input id="from" name="from" type="date" defaultValue={s("from")} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="to">
                {t("common.to")}
              </label>
              <input id="to" name="to" type="date" defaultValue={s("to")} className="field" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/history" className="btn-ghost">
              {t("common.clear")}
            </Link>
            <button className="btn-primary">{t("common.apply")}</button>
          </div>
        </details>
      </form>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label={t("common.in")} value={money(totals.totalIn)} tone="ok" className="p-3 [&>div:last-child]:text-base" />
        <Stat label={t("common.out")} value={money(totals.totalOut)} className="p-3 [&>div:last-child]:text-base" />
        <Stat label={t("common.fees")} value={money(totals.fees)} tone="warn" className="p-3 [&>div:last-child]:text-base" />
      </div>
      <p className="mt-3 mb-2 text-sm text-muted">{t("history.results", { n: num(totals.count) })}</p>
      <TxList rows={rows} />
      {rows.length < totals.count && (
        <Link href={`/history?${moreParams}`} scroll={false} className="btn-ghost mt-4 w-full">
          {t("history.loadMore")}
        </Link>
      )}
    </>
  );
}
