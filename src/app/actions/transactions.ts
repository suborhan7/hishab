"use server";
/**
 * Write-side actions for transactions. Every action checks the session first.
 */
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { TX_TYPES, transactions, type Direction, type TxType } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { findByTrxId, getTransaction } from "@/lib/data";
import { fromLocalInput } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { deleteScreenshot } from "@/lib/storage";
import type { MessageKey } from "@/i18n";

export type Duplicate = { id: number; amount: number; occurredAt: Date; person: string | null; pocketName: string };

export type TxFormState = {
  ok?: boolean;
  id?: number;
  errors?: Partial<Record<"pocketId" | "amount" | "occurredAt", MessageKey>>;
  duplicates?: Duplicate[];
  error?: MessageKey;
};

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const int = (fd: FormData, k: string) => {
  const v = Number(fd.get(k));
  return Number.isInteger(v) && v > 0 ? v : null;
};

/** Only accept storage keys this app produced (Vercel Blob URL or local upload). */
function safeScreenshotKey(v: string | null): string | null {
  if (!v) return null;
  if (/^local:[\w.-]+$/.test(v)) return v;
  try {
    const u = new URL(v);
    if (u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com")) return v;
  } catch {}
  return null;
}

function parseForm(fd: FormData) {
  const errors: TxFormState["errors"] = {};
  const pocketId = int(fd, "pocketId");
  if (!pocketId) errors.pocketId = "tx.pocketRequired";
  const amount = parseAmount(str(fd, "amount"));
  if (!amount || amount <= 0) errors.amount = "tx.amountRequired";
  const occurredAt = fromLocalInput(str(fd, "occurredAt") ?? "");
  if (!occurredAt) errors.occurredAt = "tx.dateRequired";

  const typeRaw = str(fd, "type");
  const type: TxType = TX_TYPES.includes(typeRaw as TxType) ? (typeRaw as TxType) : "other";
  const direction: Direction = str(fd, "direction") === "in" ? "in" : "out";
  const fee = Math.max(0, parseAmount(str(fd, "fee")) ?? 0);
  const balanceAfter = parseAmount(str(fd, "balanceAfter"));

  return {
    errors,
    values: {
      pocketId: pocketId!,
      direction,
      type,
      amount: amount!,
      fee,
      feePocketId: int(fd, "feePocketId"),
      person: str(fd, "person"),
      phone: str(fd, "phone"),
      trxId: str(fd, "trxId")?.toUpperCase().replace(/\s+/g, "") ?? null,
      occurredAt: occurredAt!,
      balanceAfter,
      note: str(fd, "note"),
      category: str(fd, "category"),
      playerId: int(fd, "playerId"),
      screenshot: safeScreenshotKey(str(fd, "screenshot")),
      source: str(fd, "source") === "screenshot" ? ("screenshot" as const) : ("manual" as const),
    },
  };
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/** Create or update a transaction. `id` in the form means update. */
export async function saveTransaction(_prev: TxFormState, fd: FormData): Promise<TxFormState> {
  await requireAuth();
  const { errors, values } = parseForm(fd);
  if (Object.keys(errors).length) return { errors };

  const id = int(fd, "id");
  const confirmDuplicate = fd.get("confirmDuplicate") === "1";
  if (values.trxId && !confirmDuplicate) {
    const dups = await findByTrxId(values.trxId, id ?? undefined);
    if (dups.length) return { duplicates: dups };
  }

  try {
    const db = await getDb();
    if (id) {
      const before = await getTransaction(id);
      await db.update(transactions).set(values).where(eq(transactions.id, id));
      if (before?.screenshot && before.screenshot !== values.screenshot) await deleteScreenshot(before.screenshot);
      revalidateAll();
      return { ok: true, id };
    }
    const [row] = await db.insert(transactions).values(values).returning({ id: transactions.id });
    revalidateAll();
    return { ok: true, id: row.id };
  } catch (e) {
    console.error("saveTransaction failed", e);
    return { error: "common.error" };
  }
}

export async function deleteTransaction(id: number): Promise<void> {
  await requireAuth();
  const tx = await getTransaction(id);
  if (tx) {
    const db = await getDb();
    await db.delete(transactions).where(eq(transactions.id, id));
    await deleteScreenshot(tx.screenshot);
  }
  revalidateAll();
  redirect("/history");
}

/** Live duplicate check while typing the TrxID. */
export async function checkTrxId(trxId: string, excludeId?: number): Promise<Duplicate[]> {
  await requireAuth();
  return findByTrxId(trxId, excludeId);
}

/** Remove an uploaded screenshot the user decided not to keep. */
export async function discardScreenshot(key: string): Promise<void> {
  await requireAuth();
  const safe = safeScreenshotKey(key);
  if (!safe) return;
  // Never delete a proof that is already attached to a saved transaction.
  const db = await getDb();
  const used = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.screenshot, safe)).limit(1);
  if (!used.length) await deleteScreenshot(safe);
}
