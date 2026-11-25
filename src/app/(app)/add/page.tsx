import type { Metadata } from "next";
import { getDb } from "@/db";
import { players } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { listPeople, listPockets } from "@/lib/data";
import { PageTitle } from "@/components/ui";
import { AddScreen } from "./add-screen";
import type { TxInitial } from "@/components/tx-form";

export const metadata: Metadata = { title: "Add" };

/**
 * /add — new transaction. Query params pre-fill the manual form, e.g.
 * /add?mode=manual&pocket=3&player=7&type=received (used by tournament shortcuts).
 */
export default async function AddPage({ searchParams }: PageProps<"/add">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const { t } = await getI18n();
  const db = await getDb();
  const [pocketRows, playerRows, people] = await Promise.all([
    listPockets(),
    db.select({ id: players.id, name: players.name, pocketId: players.pocketId }).from(players),
    listPeople(),
  ]);

  const preset: TxInitial = {
    pocketId: one("pocket") ? Number(one("pocket")) : undefined,
    playerId: one("player") ? Number(one("player")) : undefined,
    type: (one("type") as TxInitial["type"]) ?? undefined,
    category: one("category"),
    person: one("person"),
  };
  if (preset.type === "received" || preset.type === "cash_in") preset.direction = "in";
  else if (preset.type) preset.direction = "out";

  return (
    <>
      <PageTitle title={t("add.title")} />
      <AddScreen
        pockets={pocketRows.map((p) => ({ id: p.id, name: p.name, kind: p.kind }))}
        players={playerRows}
        people={people}
        preset={preset}
        startManual={one("mode") === "manual"}
      />
    </>
  );
}
