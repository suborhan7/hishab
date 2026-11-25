"use server";
/** Actions for pockets, tournament settings, players and reconciliation. */
import { eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { POCKET_KINDS, players, pockets, reconciliations, transactions, type PocketKind } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { listPockets } from "@/lib/data";
import { parseAmount } from "@/lib/money";
import { POCKET_COLORS } from "@/components/ui";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const kindOf = (v: string | null): PocketKind => (POCKET_KINDS.includes(v as PocketKind) ? (v as PocketKind) : "other");
const colorOf = (v: string | null) => (POCKET_COLORS.includes(v as never) ? v! : "teal");

export async function createPocket(fd: FormData) {
  await requireAuth();
  const name = str(fd, "name");
  if (!name) return;
  const db = await getDb();
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${pockets.sortOrder}), 0)` }).from(pockets);
  const [row] = await db
    .insert(pockets)
    .values({
      name,
      kind: kindOf(str(fd, "kind")),
      color: colorOf(str(fd, "color")),
      openingBalance: parseAmount(str(fd, "openingBalance")) ?? 0,
      sortOrder: Number(max) + 1,
    })
    .returning({ id: pockets.id });
  revalidatePath("/", "layout");
  redirect(`/pockets/${row.id}`);
}

export async function updatePocket(id: number, fd: FormData) {
  await requireAuth();
  const name = str(fd, "name");
  if (!name) return;
  const db = await getDb();
  await db
    .update(pockets)
    .set({
      name,
      kind: kindOf(str(fd, "kind")),
      color: colorOf(str(fd, "color")),
      openingBalance: parseAmount(str(fd, "openingBalance")) ?? 0,
    })
    .where(eq(pockets.id, id));
  revalidatePath("/", "layout");
}

export async function setPocketArchived(id: number, archived: boolean) {
  await requireAuth();
  const db = await getDb();
  await db.update(pockets).set({ archived }).where(eq(pockets.id, id));
  revalidatePath("/", "layout");
}

/** Deletes a pocket only if no transaction uses it (otherwise shows a hint). */
export async function deletePocket(id: number) {
  await requireAuth();
  const db = await getDb();
  const used = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(or(eq(transactions.pocketId, id), eq(transactions.feePocketId, id)))
    .limit(1);
  if (used.length) redirect(`/pockets/${id}?error=inuse`);
  await db.delete(pockets).where(eq(pockets.id, id));
  revalidatePath("/", "layout");
  redirect("/pockets");
}

export async function updateTournamentSettings(pocketId: number, fd: FormData) {
  await requireAuth();
  const db = await getDb();
  await db
    .update(pockets)
    .set({
      settings: {
        jerseyFee: parseAmount(str(fd, "jerseyFee")) ?? 0,
        vendorPrice: parseAmount(str(fd, "vendorPrice")) ?? 0,
        vendorName: str(fd, "vendorName") ?? undefined,
      },
    })
    .where(eq(pockets.id, pocketId));
  revalidatePath(`/pockets/${pocketId}`);
}

export async function savePlayer(pocketId: number, fd: FormData) {
  await requireAuth();
  const name = str(fd, "name");
  if (!name) return;
  const values = {
    pocketId,
    name,
    phone: str(fd, "phone"),
    jerseyNumber: str(fd, "jerseyNumber"),
    jerseySize: str(fd, "jerseySize"),
    cashPaid: parseAmount(str(fd, "cashPaid")) ?? 0,
  };
  const db = await getDb();
  const id = Number(fd.get("id"));
  if (id) await db.update(players).set(values).where(eq(players.id, id));
  else await db.insert(players).values(values);
  revalidatePath(`/pockets/${pocketId}`);
}

export async function deletePlayer(pocketId: number, id: number) {
  await requireAuth();
  const db = await getDb();
  await db.delete(players).where(eq(players.id, id));
  revalidatePath(`/pockets/${pocketId}`);
}

export type ReconcileState = { actual?: number; expected?: number; error?: boolean };

/** Saves a balance check: the real bKash balance vs. the sum of all pockets. */
export async function reconcile(_prev: ReconcileState, fd: FormData): Promise<ReconcileState> {
  await requireAuth();
  const actual = parseAmount(str(fd, "actual"));
  if (actual === null) return { error: true };
  const all = await listPockets({ includeArchived: true });
  const expected = all.reduce((s, p) => s + p.balance, 0);
  const db = await getDb();
  await db.insert(reconciliations).values({ actualBalance: actual, expectedBalance: expected, note: str(fd, "note") });
  revalidatePath("/", "layout");
  return { actual, expected };
}
