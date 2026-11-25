import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { players } from "@/db/schema";
import { TxForm } from "@/components/tx-form";
import { PageTitle } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getTransaction, listPeople, listPockets } from "@/lib/data";
import { toLocalInput } from "@/lib/dates";
import { toTaka } from "@/lib/money";

export default async function EditTxPage({ params }: PageProps<"/tx/[id]/edit">) {
  const { id } = await params;
  const tx = await getTransaction(Number(id));
  if (!tx) notFound();
  const { t } = await getI18n();
  const db = await getDb();
  const [pocketRows, playerRows, people] = await Promise.all([
    listPockets({ includeArchived: true }),
    db.select({ id: players.id, name: players.name, pocketId: players.pocketId }).from(players),
    listPeople(),
  ]);
  return (
    <>
      <PageTitle backHref={`/tx/${tx.id}`} title={t("tx.edit")} />
      <TxForm
        pockets={pocketRows.filter((p) => !p.archived || p.id === tx.pocketId).map((p) => ({ id: p.id, name: p.name, kind: p.kind }))}
        players={playerRows}
        people={people}
        initial={{
          id: tx.id,
          pocketId: tx.pocketId,
          direction: tx.direction,
          type: tx.type,
          amount: toTaka(tx.amount),
          fee: tx.fee ? toTaka(tx.fee) : "",
          feePocketId: tx.feePocketId,
          person: tx.person ?? "",
          phone: tx.phone ?? "",
          trxId: tx.trxId ?? "",
          occurredAt: toLocalInput(tx.occurredAt),
          balanceAfter: toTaka(tx.balanceAfter),
          note: tx.note ?? "",
          category: tx.category ?? "",
          playerId: tx.playerId,
          screenshot: tx.screenshot,
          source: tx.source,
        }}
      />
    </>
  );
}
