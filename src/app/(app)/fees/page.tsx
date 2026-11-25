import type { Metadata } from "next";
import { TxList } from "@/components/tx-list";
import { PageTitle, SectionTitle, Stat } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { feeBreakdown, listTransactions, sumTransactions } from "@/lib/data";
import { formatMonth } from "@/lib/dates";

export const metadata: Metadata = { title: "Fees" };

/** All bKash charges (cash-out, send money…) in one place. */
export default async function FeesPage() {
  const { t, lang, money, num } = await getI18n();
  const [totals, breakdown, recent] = await Promise.all([
    sumTransactions({ hasFee: true }),
    feeBreakdown(),
    listTransactions({ hasFee: true }, { limit: 30 }),
  ]);
  return (
    <>
      <PageTitle title={t("fees.title")} />
      <Stat label={t("fees.total")} value={money(totals.fees)} tone="warn" />
      <p className="mt-2 text-sm text-muted">{t("common.count", { n: num(totals.count) })}</p>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <div>
          <SectionTitle>{t("fees.byMonth")}</SectionTitle>
          <ul className="card divide-y divide-line">
            {breakdown.byMonth.length === 0 && <li className="px-4 py-6 text-center text-muted">{t("common.noData")}</li>}
            {breakdown.byMonth.map((r) => {
              const [y, m] = r.month.split("-").map(Number);
              return (
                <li key={r.month} className="flex justify-between px-4 py-3">
                  <span>{formatMonth(y, m, lang)}</span>
                  <span className="font-medium text-warn tabular-nums">{money(r.total)}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <SectionTitle>{t("fees.byType")}</SectionTitle>
          <ul className="card divide-y divide-line">
            {breakdown.byType.length === 0 && <li className="px-4 py-6 text-center text-muted">{t("common.noData")}</li>}
            {breakdown.byType.map((r) => (
              <li key={r.type} className="flex justify-between px-4 py-3">
                <span>
                  {t(`type.${r.type}`)} <span className="text-xs text-muted">({num(r.count)})</span>
                </span>
                <span className="font-medium text-warn tabular-nums">{money(r.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SectionTitle>{t("fees.recent")}</SectionTitle>
      <TxList rows={recent} />
    </>
  );
}
