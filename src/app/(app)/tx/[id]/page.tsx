import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTransaction } from "@/app/actions/transactions";
import { ConfirmButton } from "@/components/confirm-button";
import { Icon } from "@/components/icons";
import { PageTitle } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getPocket, getTransaction } from "@/lib/data";
import { proofUrl } from "@/lib/proof";

export default async function TxPage({ params }: PageProps<"/tx/[id]">) {
  const { id } = await params;
  const tx = await getTransaction(Number(id));
  if (!tx) notFound();
  const { t, money, dateTime } = await getI18n();
  const feePocket = tx.feePocketId && tx.feePocketId !== tx.pocketId ? await getPocket(tx.feePocketId) : null;
  const isIn = tx.direction === "in";

  const rows: [string, React.ReactNode][] = [
    [t("tx.type"), t(`type.${tx.type}`)],
    [t("tx.pocket"), <Link key="p" href={`/pockets/${tx.pocketId}`} className="text-accent underline">{tx.pocketName}</Link>],
    [t("tx.person"), tx.person],
    [t("tx.phone"), tx.phone],
    [t("tx.trxId"), tx.trxId && <span className="font-mono">{tx.trxId}</span>],
    [t("tx.occurredAt"), dateTime(tx.occurredAt)],
    [t("tx.fee"), tx.fee > 0 ? `${money(tx.fee)}${feePocket ? ` (${feePocket.name})` : ""}` : null],
    [t("tx.balanceAfter"), tx.balanceAfter !== null ? money(tx.balanceAfter) : null],
    [t("tx.note"), tx.note],
    [t("tx.category"), tx.category === "jersey_vendor" ? t("tx.cat.jersey_vendor") : tx.category],
    ["", t(`tx.source.${tx.source}`)],
  ];

  return (
    <>
      <PageTitle
        backHref="/history"
        title={t("tx.detail")}
        actions={
          <Link href={`/tx/${tx.id}/edit`} className="btn-ghost min-h-10 px-3 text-sm">
            <Icon name="edit" /> {t("common.edit")}
          </Link>
        }
      />
      <div className="card p-5 text-center">
        <div className={`text-sm font-medium ${isIn ? "text-ok" : "text-danger"}`}>{t(`dir.${tx.direction}`)}</div>
        <div className={`mt-1 text-4xl font-bold tabular-nums ${isIn ? "text-ok" : ""}`}>
          {isIn ? "+" : "−"}
          {money(tx.amount)}
        </div>
      </div>
      <dl className="card mt-4 divide-y divide-line">
        {rows
          .filter(([, v]) => v)
          .map(([k, v], i) => (
            <div key={i} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium break-all">{v}</dd>
            </div>
          ))}
      </dl>
      {tx.screenshot && (
        <a href={proofUrl(tx.screenshot)} target="_blank" className="mt-4 block">
          <span className="label">{t("add.proof")}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proofUrl(tx.screenshot)} alt={t("add.proof")} className="max-h-[70vh] rounded-2xl border border-line" />
        </a>
      )}
      <form action={deleteTransaction.bind(null, tx.id)} className="mt-6">
        <ConfirmButton className="btn-danger w-full">
          <Icon name="trash" /> {t("common.delete")}
        </ConfirmButton>
      </form>
    </>
  );
}
