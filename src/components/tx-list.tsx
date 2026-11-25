"use client";
/** A list of transactions, each row linking to its detail page. */
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import type { TxRow } from "@/lib/data";
import { Icon } from "./icons";

export type TxListRow = Pick<
  TxRow,
  "id" | "direction" | "type" | "amount" | "fee" | "person" | "phone" | "occurredAt" | "pocketName" | "note" | "screenshot"
>;

export function TxList({ rows, showPocket = true }: { rows: TxListRow[]; showPocket?: boolean }) {
  const { t, money, dateTime } = useI18n();
  if (!rows.length) return <p className="card px-4 py-8 text-center text-muted">{t("common.noData")}</p>;
  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {rows.map((r) => {
        const isIn = r.direction === "in";
        return (
          <li key={r.id}>
            <Link href={`/tx/${r.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-full ${
                  isIn ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
                }`}
              >
                <Icon name={isIn ? "arrowDown" : "arrowUp"} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{r.person || r.phone || t(`type.${r.type}`)}</span>
                <span className="block truncate text-xs text-muted">
                  {t(`type.${r.type}`)}
                  {showPocket && ` · ${r.pocketName}`} · {dateTime(r.occurredAt)}
                  {r.screenshot && " · "}
                  {r.screenshot && <Icon name="image" className="inline size-3.5 align-[-2px]" />}
                </span>
                {r.note && <span className="block truncate text-xs text-muted">{r.note}</span>}
              </span>
              <span className="text-right">
                <span className={`block font-semibold tabular-nums ${isIn ? "text-ok" : "text-fg"}`}>
                  {isIn ? "+" : "−"}
                  {money(r.amount)}
                </span>
                {r.fee > 0 && (
                  <span className="block text-xs text-warn tabular-nums">
                    {t("common.fee")} {money(r.fee)}
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
