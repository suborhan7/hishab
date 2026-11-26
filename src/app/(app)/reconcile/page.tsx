import type { Metadata } from "next";
import { PageTitle, SectionTitle, pocketColor } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { latestBalanceFromReceipts, listPockets, listReconciliations } from "@/lib/data";
import { toTaka } from "@/lib/money";
import { ReconcileForm } from "./reconcile-form";

export const metadata: Metadata = { title: "Check balance" };

export default async function ReconcilePage() {
  const { t, money, dateTime } = await getI18n();
  const [pockets, history, receipt] = await Promise.all([
    listPockets({ includeArchived: true }),
    listReconciliations(),
    latestBalanceFromReceipts(),
  ]);
  const expected = pockets.reduce((s, p) => s + p.balance, 0);

  return (
    <>
      <PageTitle title={t("rec.title")} subtitle={t("rec.intro")} />
      <ReconcileForm expected={expected} suggestion={receipt ? toTaka(receipt.balance) : ""} />

      <SectionTitle>{t("rec.byPocket")}</SectionTitle>
      <ul className="card divide-y divide-line">
        {pockets
          .filter((p) => !p.archived || p.balance !== 0)
          .map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2.5">
                <span className="size-3 rounded-full" style={{ background: pocketColor(p.color) }} />
                {p.name}
              </span>
              <span className={`font-semibold tabular-nums ${p.balance < 0 ? "text-danger" : ""}`}>{money(p.balance)}</span>
            </li>
          ))}
        <li className="flex justify-between bg-surface-2 px-4 py-3 font-bold">
          <span>{t("rec.expected")}</span>
          <span className="tabular-nums">{money(expected)}</span>
        </li>
      </ul>

      {history.length > 0 && (
        <>
          <SectionTitle>{t("rec.history")}</SectionTitle>
          <ul className="card divide-y divide-line">
            {history.map((r) => {
              const diff = r.actualBalance - r.expectedBalance;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block tabular-nums">{money(r.actualBalance)}</span>
                    <span className="block text-xs text-muted">{dateTime(r.createdAt)}</span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                      diff === 0 ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
                    }`}
                  >
                    {diff === 0 ? t("home.matched") : money(diff, { sign: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
