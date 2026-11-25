import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getPocket, listTransactions, pocketBalanceBefore } from "@/lib/data";
import { dayEnd, dayStart, toDateInput } from "@/lib/dates";
import { StatementActions } from "./statement-actions";

export const metadata: Metadata = { title: "Statement" };

/** Shareable statement for one pocket (mainly the partner ledger) for a date range. */
export default async function StatementPage({ params, searchParams }: PageProps<"/pockets/[id]/statement">) {
  const { id } = await params;
  const sp = await searchParams;
  const pocket = await getPocket(Number(id));
  if (!pocket) notFound();
  const { t, money, date, dateTime } = await getI18n();

  const today = toDateInput();
  const fromStr = typeof sp.from === "string" && sp.from ? sp.from : `${today.slice(0, 8)}01`;
  const toStr = typeof sp.to === "string" && sp.to ? sp.to : today;
  const from = dayStart(fromStr)!;
  const to = dayEnd(toStr)!;

  const [opening, txs] = await Promise.all([
    pocketBalanceBefore(pocket, from),
    listTransactions({ pocketId: pocket.id, from, to }, { limit: 2000, order: "asc" }),
  ]);

  // Walk the period in order to build the running balance column.
  let running = opening;
  let received = 0;
  let paid = 0;
  let fees = 0;
  const rows: { tx: (typeof txs)[number]; feeHere: number; balance: number }[] = [];
  for (const tx of txs) {
    const feeHere = (tx.feePocketId ?? tx.pocketId) === pocket.id ? tx.fee : 0;
    if (tx.direction === "in") received += tx.amount;
    else paid += tx.amount;
    fees += feeHere;
    running += (tx.direction === "in" ? tx.amount : -tx.amount) - feeHere;
    rows.push({ tx, feeHere, balance: running });
  }

  const fileName = `${pocket.name}-${fromStr}-${toStr}`;

  return (
    <>
      <PageTitle backHref={`/pockets/${pocket.id}`} title={t("stmt.title")} />
      <StatementActions fileName={fileName} title={t("stmt.for", { name: pocket.name })} />

      <article id="statement" className="card mt-4 bg-surface p-5 sm:p-7">
        <header className="border-b border-line pb-4">
          <h2 className="text-xl font-bold">{t("stmt.for", { name: pocket.name })}</h2>
          <p className="text-sm text-muted">
            {t("stmt.period", { from: date(from), to: date(new Date(to.getTime() - 1)) })}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-line py-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted">{t("stmt.opening")}</dt>
            <dd className="font-semibold tabular-nums">{money(opening)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("stmt.receivedInPeriod")}</dt>
            <dd className="font-semibold text-ok tabular-nums">{money(received)}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("stmt.paidInPeriod")}</dt>
            <dd className="font-semibold tabular-nums">
              {money(paid)}
              {fees > 0 && <span className="block text-xs font-normal text-warn">+ {t("common.fee")} {money(fees)}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("stmt.closing")}</dt>
            <dd className="text-lg font-bold text-accent tabular-nums">{money(running)}</dd>
          </div>
        </dl>

        <h3 className="mt-4 mb-2 font-semibold">{t("stmt.details")}</h3>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-muted">{t("common.noData")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-2 font-medium">{t("common.date")}</th>
                <th className="py-2 pr-2 font-medium">{t("tx.note")}</th>
                <th className="py-2 pr-2 text-right font-medium">{t("common.in")}</th>
                <th className="py-2 pr-2 text-right font-medium">{t("common.out")}</th>
                <th className="py-2 text-right font-medium">{t("stmt.running")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ tx, feeHere, balance }) => (
                <tr key={tx.id} className="align-top">
                  <td className="py-2 pr-2 whitespace-nowrap text-muted">{date(tx.occurredAt)}</td>
                  <td className="py-2 pr-2">
                    <div className="font-medium">{tx.person || t(`type.${tx.type}`)}</div>
                    {tx.note && <div className="text-xs text-muted">{tx.note}</div>}
                    {tx.trxId && <div className="font-mono text-[11px] text-muted">{tx.trxId}</div>}
                  </td>
                  <td className="py-2 pr-2 text-right text-ok tabular-nums">
                    {tx.direction === "in" ? money(tx.amount) : ""}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {tx.direction === "out" ? money(tx.amount) : ""}
                    {feeHere > 0 && <div className="text-[11px] text-warn">+{money(feeHere)}</div>}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">{money(balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <footer className="mt-5 border-t border-line pt-3 text-center text-xs text-muted">
          {t("stmt.generated", { date: dateTime(new Date()) })}
        </footer>
      </article>
    </>
  );
}
