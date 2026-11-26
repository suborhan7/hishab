import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { latestBalanceFromReceipts, listPockets, listReconciliations, listTransactions } from "@/lib/data";
import { Icon } from "@/components/icons";
import { PocketCard } from "@/components/pocket-card";
import { TxList } from "@/components/tx-list";
import { Alert, SectionTitle } from "@/components/ui";

export default async function HomePage() {
  const { t, money, dateTime } = await getI18n();
  const [allPockets, recent, [lastCheck], receipt] = await Promise.all([
    listPockets({ includeArchived: true }),
    listTransactions({}, { limit: 8 }),
    listReconciliations(1),
    latestBalanceFromReceipts(),
  ]);
  const pockets = allPockets.filter((p) => !p.archived);
  // Archived pockets still hold money in bKash, so they count in the total.
  const total = allPockets.reduce((s, p) => s + p.balance, 0);
  const negativePersonal = pockets.filter((p) => p.kind === "personal" && p.balance < 0);

  return (
    <div>
      {negativePersonal.map((p) => (
        <Alert key={p.id} tone="danger" icon="alert" className="mb-4">
          {t("warn.personalNegative", { amount: money(p.balance) })}
        </Alert>
      ))}

      <section className="rounded-3xl bg-accent p-5 text-accent-fg">
        <p className="text-sm opacity-85">{t("home.totalInApp")}</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">{money(total)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {lastCheck ? (
            <>
              <span className="opacity-85">{t("home.lastCheck")}:</span>
              <span className="rounded-full bg-accent-fg/15 px-2.5 py-0.5 font-medium">
                {lastCheck.actualBalance === lastCheck.expectedBalance
                  ? t("home.matched")
                  : t("home.mismatch", { amount: money(Math.abs(lastCheck.actualBalance - lastCheck.expectedBalance)) })}
              </span>
              <span className="opacity-75">{dateTime(lastCheck.createdAt)}</span>
            </>
          ) : (
            <span className="opacity-85">{t("home.neverChecked")}</span>
          )}
          <Link href="/reconcile" className="ml-auto font-semibold underline underline-offset-4">
            {t("home.checkNow")}
          </Link>
        </div>
        {receipt && receipt.balance !== total && (
          <p className="mt-2 text-xs opacity-80">{t("home.receiptBalance", { amount: money(receipt.balance) })}</p>
        )}
      </section>

      <SectionTitle
        action={
          <Link href="/pockets" className="text-sm font-medium text-accent">
            {t("common.viewAll")}
          </Link>
        }
      >
        {t("home.pockets")}
      </SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {pockets.map((p) => (
          <PocketCard key={p.id} pocket={p} />
        ))}
      </div>

      <SectionTitle
        action={
          <Link href="/history" className="text-sm font-medium text-accent">
            {t("common.viewAll")}
          </Link>
        }
      >
        {t("home.recent")}
      </SectionTitle>
      <TxList rows={recent} />

      <Link href="/add" className="btn-primary mt-6 hidden w-full md:flex">
        <Icon name="plus" /> {t("add.title")}
      </Link>
    </div>
  );
}
