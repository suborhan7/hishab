import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePocket, setPocketArchived, updatePocket } from "@/app/actions/pockets";
import { ConfirmButton } from "@/components/confirm-button";
import { Icon } from "@/components/icons";
import { PocketFields } from "@/components/pocket-fields";
import { TxList } from "@/components/tx-list";
import { Alert, PageTitle, SectionTitle, Stat } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getPocket, listTransactions } from "@/lib/data";
import { toDateInput } from "@/lib/dates";
import { Tournament } from "./tournament";

export default async function PocketPage({ params, searchParams }: PageProps<"/pockets/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const pocket = await getPocket(Number(id));
  if (!pocket) notFound();
  const { t, money } = await getI18n();
  const txs = await listTransactions({ pocketId: pocket.id }, { limit: 100 });

  const today = toDateInput();
  const monthStart = `${today.slice(0, 8)}01`;

  return (
    <>
      <PageTitle
        backHref="/pockets"
        title={pocket.kind === "partner" ? t("ledger.title", { name: pocket.name }) : pocket.name}
        subtitle={`${t(`kind.${pocket.kind}`)}${pocket.archived ? ` · ${t("pockets.archived")}` : ""}`}
      />

      {sp.error === "inuse" && (
        <Alert tone="warn" icon="alert" className="mb-4">
          {t("pockets.cantDelete")}
        </Alert>
      )}
      {pocket.kind === "personal" && pocket.balance < 0 && (
        <Alert tone="danger" icon="alert" className="mb-4">
          {t("warn.personalNegative", { amount: money(pocket.balance) })}
        </Alert>
      )}

      {pocket.kind === "partner" ? (
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t("ledger.received")} value={money(pocket.totalIn)} tone="ok" />
          <Stat label={t("ledger.paidOut")} value={money(pocket.totalOut)} />
          <Stat label={t("ledger.feesCharged")} value={money(pocket.totalFees)} tone="warn" />
          <Stat
            label={
              pocket.balance >= 0
                ? t("ledger.remaining", { name: pocket.name })
                : t("ledger.overpaid", { name: pocket.name })
            }
            value={money(Math.abs(pocket.balance))}
            tone={pocket.balance >= 0 ? "accent" : "danger"}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label={t("common.balance")}
            value={money(pocket.balance)}
            tone={pocket.balance < 0 ? "danger" : "accent"}
            className="col-span-2 sm:col-span-1"
          />
          <Stat label={t("pockets.received")} value={money(pocket.totalIn)} />
          <Stat label={t("pockets.paidOut")} value={money(pocket.totalOut)} />
          <Stat label={t("common.fees")} value={money(pocket.totalFees)} />
        </div>
      )}
      {pocket.openingBalance !== 0 && (
        <p className="mt-2 text-xs text-muted">
          {t("pockets.opening")}: {money(pocket.openingBalance)}
        </p>
      )}

      {pocket.kind === "partner" && (
        <>
          <SectionTitle>{t("ledger.statement")}</SectionTitle>
          <form action={`/pockets/${pocket.id}/statement`} className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label className="label" htmlFor="from">
                {t("common.from")}
              </label>
              <input id="from" name="from" type="date" defaultValue={monthStart} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="to">
                {t("common.to")}
              </label>
              <input id="to" name="to" type="date" defaultValue={today} className="field" />
            </div>
            <button className="btn-primary">
              <Icon name="share" /> {t("ledger.makeStatement")}
            </button>
          </form>
        </>
      )}

      {pocket.kind === "tournament" && <Tournament pocket={pocket} />}

      <SectionTitle
        action={
          <Link href={`/history?pocket=${pocket.id}`} className="text-sm font-medium text-accent">
            {t("common.viewAll")}
          </Link>
        }
      >
        {t("pockets.transactions")}
      </SectionTitle>
      <TxList rows={txs} showPocket={false} />

      <details className="card mt-6 p-4">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <Icon name="edit" /> {t("pockets.edit")}
        </summary>
        <form action={updatePocket.bind(null, pocket.id)} className="mt-4 space-y-4">
          <PocketFields pocket={pocket} />
          <button className="btn-primary w-full">{t("common.save")}</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <form action={setPocketArchived.bind(null, pocket.id, !pocket.archived)}>
            <button className="btn-ghost">{pocket.archived ? t("pockets.unarchive") : t("pockets.archive")}</button>
          </form>
          <form action={deletePocket.bind(null, pocket.id)}>
            <ConfirmButton>
              <Icon name="trash" /> {t("common.delete")}
            </ConfirmButton>
          </form>
        </div>
      </details>
    </>
  );
}
