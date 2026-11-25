import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageTitle, SectionTitle, Stat } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { listPockets, monthBreakdown } from "@/lib/data";
import { currentMonth, formatMonth, monthRange } from "@/lib/dates";

export const metadata: Metadata = { title: "Summary" };

/** /summary?m=2026-11 — money in / out / fees for one month. */
export default async function SummaryPage({ searchParams }: PageProps<"/summary">) {
  const sp = await searchParams;
  const now = currentMonth();
  const m = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m.split("-").map(Number) : [now.year, now.month];
  const [year, month] = m;
  const { t, lang, money, num } = await getI18n();
  const [from, to] = monthRange(year, month);
  const [pockets, data] = await Promise.all([listPockets({ includeArchived: true }), monthBreakdown(from, to)]);

  const shift = (d: number) => {
    const idx = year * 12 + (month - 1) + d;
    return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
  };
  const isCurrent = year === now.year && month === now.month;

  const totalIn = data.byPocket.filter((r) => r.direction === "in").reduce((s, r) => s + r.total, 0);
  const totalOut = data.byPocket.filter((r) => r.direction === "out").reduce((s, r) => s + r.total, 0);
  const totalFees = data.byPocket.reduce((s, r) => s + r.fees, 0);

  const perPocket = pockets
    .map((p) => {
      const rows = data.byPocket.filter((r) => Number(r.pocketId) === p.id);
      const pin = rows.find((r) => r.direction === "in")?.total ?? 0;
      const pout = rows.find((r) => r.direction === "out")?.total ?? 0;
      return { p, pin, pout, fees: rows.reduce((s, r) => s + r.fees, 0) };
    })
    .filter((r) => r.pin || r.pout || r.fees);

  const histLink = (extra: string) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const last = new Date(year, month, 0).getDate();
    return `/history?from=${year}-${pad(month)}-01&to=${year}-${pad(month)}-${pad(last)}${extra}`;
  };

  return (
    <>
      <PageTitle title={t("summary.title")} />
      <div className="card mb-4 flex items-center justify-between p-2">
        <Link href={`/summary?m=${shift(-1)}`} className="grid size-11 place-items-center rounded-xl hover:bg-surface-2" aria-label={t("summary.prev")}>
          <Icon name="left" />
        </Link>
        <span className="text-lg font-semibold">{formatMonth(year, month, lang)}</span>
        {isCurrent ? (
          <span className="size-11" />
        ) : (
          <Link href={`/summary?m=${shift(1)}`} className="grid size-11 place-items-center rounded-xl hover:bg-surface-2" aria-label={t("summary.next")}>
            <Icon name="right" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label={t("common.in")} value={money(totalIn)} tone="ok" />
        <Stat label={t("common.out")} value={money(totalOut)} />
        <Stat label={t("common.fees")} value={money(totalFees)} tone="warn" />
        <Stat label={t("summary.net")} value={money(totalIn - totalOut - totalFees, { sign: true })} tone="accent" />
      </div>

      <SectionTitle>{t("summary.byPocket")}</SectionTitle>
      {perPocket.length === 0 ? (
        <p className="card px-4 py-6 text-center text-muted">{t("common.noData")}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {perPocket.map(({ p, pin, pout, fees }) => (
            <li key={p.id}>
              <Link href={histLink(`&pocket=${p.id}`)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-right text-sm tabular-nums">
                  <span className="text-ok">+{money(pin)}</span> · <span>−{money(pout)}</span>
                  {fees > 0 && <span className="block text-xs text-warn">{t("common.fee")} {money(fees)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>{t("summary.byType")}</SectionTitle>
      {data.byType.length === 0 ? (
        <p className="card px-4 py-6 text-center text-muted">{t("common.noData")}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {data.byType
            .sort((a, b) => b.total - a.total)
            .map((r) => (
              <li key={r.type}>
                <Link href={histLink(`&type=${r.type}`)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                  <span>
                    <span className="font-medium">{t(`type.${r.type}`)}</span>
                    <span className="block text-xs text-muted">{t("common.count", { n: num(r.count) })}</span>
                  </span>
                  <span className="text-right tabular-nums">
                    {money(r.total)}
                    {r.fees > 0 && <span className="block text-xs text-warn">{t("common.fee")} {money(r.fees)}</span>}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </>
  );
}
