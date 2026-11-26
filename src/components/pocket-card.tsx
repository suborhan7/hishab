import Link from "next/link";
import { getI18n } from "@/i18n/server";
import type { PocketWithBalance } from "@/lib/data";
import { pocketColor } from "./ui";

/** Pocket balance card (server component). */
export async function PocketCard({ pocket }: { pocket: PocketWithBalance }) {
  const { t, money } = await getI18n();
  const negative = pocket.balance < 0;
  return (
    <Link
      href={`/pockets/${pocket.id}`}
      className="card relative block overflow-hidden p-4 pl-5 transition hover:bg-surface-2"
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: pocketColor(pocket.color) }} />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{pocket.name}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{t(`kind.${pocket.kind}`)}</span>
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${negative ? "text-danger" : ""}`}>
        {money(pocket.balance)}
      </div>
      <div className="mt-1 flex gap-3 text-xs text-muted tabular-nums">
        <span>
          {t("common.in")} {money(pocket.totalIn)}
        </span>
        <span>
          {t("common.out")} {money(pocket.totalOut)}
        </span>
        {pocket.totalFees > 0 && (
          <span>
            {t("common.fee")} {money(pocket.totalFees)}
          </span>
        )}
      </div>
    </Link>
  );
}
