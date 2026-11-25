/**
 * Read-side data access. All queries go through here so pages stay thin.
 * Every exported function assumes the caller already checked auth.
 */
import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import {
  pockets,
  players,
  reconciliations,
  transactions,
  type Direction,
  type Pocket,
  type Transaction,
  type TxType,
} from "@/db/schema";

export type PocketWithBalance = Pocket & {
  balance: number;
  totalIn: number;
  totalOut: number;
  totalFees: number;
};

const num = (v: unknown) => Number(v ?? 0);

/** Create the three starting pockets the first time the app runs. */
export async function ensureDefaultPockets(): Promise<void> {
  const db = await getDb();
  const existing = await db.select({ id: pockets.id }).from(pockets).limit(1);
  if (existing.length) return;
  await db.insert(pockets).values([
    { name: "Personal", kind: "personal", color: "teal", sortOrder: 0 },
    { name: "Khobaib", kind: "partner", color: "amber", sortOrder: 1 },
    { name: "Tournament", kind: "tournament", color: "violet", sortOrder: 2 },
  ]);
}

/** Totals per pocket, optionally limited to transactions before `until`. */
async function pocketTotals(until?: Date) {
  const db = await getDb();
  const timeFilter = until ? lt(transactions.occurredAt, until) : undefined;

  const flows = await db
    .select({
      pocketId: transactions.pocketId,
      direction: transactions.direction,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(timeFilter)
    .groupBy(transactions.pocketId, transactions.direction);

  const feePocket = sql<number>`coalesce(${transactions.feePocketId}, ${transactions.pocketId})`;
  const fees = await db
    .select({ pocketId: feePocket, total: sql<string>`coalesce(sum(${transactions.fee}), 0)` })
    .from(transactions)
    .where(timeFilter)
    .groupBy(feePocket);

  const map = new Map<number, { in: number; out: number; fees: number }>();
  const get = (id: number) => {
    let m = map.get(id);
    if (!m) map.set(id, (m = { in: 0, out: 0, fees: 0 }));
    return m;
  };
  for (const f of flows) get(num(f.pocketId))[f.direction] += num(f.total);
  for (const f of fees) get(num(f.pocketId)).fees += num(f.total);
  return map;
}

export async function listPockets(opts: { includeArchived?: boolean } = {}): Promise<PocketWithBalance[]> {
  await ensureDefaultPockets();
  const db = await getDb();
  const rows = await db
    .select()
    .from(pockets)
    .where(opts.includeArchived ? undefined : eq(pockets.archived, false))
    .orderBy(asc(pockets.sortOrder), asc(pockets.id));
  const totals = await pocketTotals();
  return rows.map((p) => {
    const t = totals.get(p.id) ?? { in: 0, out: 0, fees: 0 };
    return {
      ...p,
      totalIn: t.in,
      totalOut: t.out,
      totalFees: t.fees,
      balance: p.openingBalance + t.in - t.out - t.fees,
    };
  });
}

export async function getPocket(id: number): Promise<PocketWithBalance | null> {
  const all = await listPockets({ includeArchived: true });
  return all.find((p) => p.id === id) ?? null;
}

/** Balance of one pocket just before `date` (for statement opening balance). */
export async function pocketBalanceBefore(pocket: Pocket, date: Date): Promise<number> {
  const t = (await pocketTotals(date)).get(pocket.id) ?? { in: 0, out: 0, fees: 0 };
  return pocket.openingBalance + t.in - t.out - t.fees;
}

export type TxFilters = {
  q?: string;
  pocketId?: number;
  type?: TxType;
  direction?: Direction;
  person?: string;
  from?: Date;
  to?: Date;
  hasFee?: boolean;
  playerId?: number;
  category?: string;
};

function filterWhere(f: TxFilters): SQL | undefined {
  const conds: (SQL | undefined)[] = [];
  if (f.pocketId) {
    conds.push(
      f.hasFee
        ? sql`coalesce(${transactions.feePocketId}, ${transactions.pocketId}) = ${f.pocketId}`
        : eq(transactions.pocketId, f.pocketId),
    );
  }
  if (f.type) conds.push(eq(transactions.type, f.type));
  if (f.direction) conds.push(eq(transactions.direction, f.direction));
  if (f.person) conds.push(ilike(transactions.person, `%${f.person}%`));
  if (f.from) conds.push(gte(transactions.occurredAt, f.from));
  if (f.to) conds.push(lt(transactions.occurredAt, f.to));
  if (f.hasFee) conds.push(sql`${transactions.fee} > 0`);
  if (f.playerId) conds.push(eq(transactions.playerId, f.playerId));
  if (f.category) conds.push(eq(transactions.category, f.category));
  if (f.q) {
    const like = `%${f.q}%`;
    conds.push(
      or(
        ilike(transactions.person, like),
        ilike(transactions.phone, like),
        ilike(transactions.trxId, like),
        ilike(transactions.note, like),
      ),
    );
  }
  const real = conds.filter(Boolean) as SQL[];
  return real.length ? and(...real) : undefined;
}

export type TxRow = Transaction & { pocketName: string };

export async function listTransactions(
  f: TxFilters = {},
  opts: { limit?: number; offset?: number; order?: "asc" | "desc" } = {},
): Promise<TxRow[]> {
  const db = await getDb();
  const order = opts.order === "asc" ? asc : desc;
  const rows = await db
    .select({ tx: transactions, pocketName: pockets.name })
    .from(transactions)
    .innerJoin(pockets, eq(pockets.id, transactions.pocketId))
    .where(filterWhere(f))
    .orderBy(order(transactions.occurredAt), order(transactions.id))
    .limit(opts.limit ?? 200)
    .offset(opts.offset ?? 0);
  return rows.map((r) => ({ ...r.tx, pocketName: r.pocketName }));
}

/** In / out / fee sums for a filter (used by history, ledger and summary). */
export async function sumTransactions(f: TxFilters = {}) {
  const db = await getDb();
  const [r] = await db
    .select({
      totalIn: sql<string>`coalesce(sum(case when ${transactions.direction} = 'in' then ${transactions.amount} else 0 end), 0)`,
      totalOut: sql<string>`coalesce(sum(case when ${transactions.direction} = 'out' then ${transactions.amount} else 0 end), 0)`,
      fees: sql<string>`coalesce(sum(${transactions.fee}), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(filterWhere(f));
  return { totalIn: num(r?.totalIn), totalOut: num(r?.totalOut), fees: num(r?.fees), count: num(r?.count) };
}

export async function getTransaction(id: number): Promise<TxRow | null> {
  const db = await getDb();
  const [r] = await db
    .select({ tx: transactions, pocketName: pockets.name })
    .from(transactions)
    .innerJoin(pockets, eq(pockets.id, transactions.pocketId))
    .where(eq(transactions.id, id));
  return r ? { ...r.tx, pocketName: r.pocketName } : null;
}

/** Existing transactions with the same bKash TrxID (case-insensitive). */
export async function findByTrxId(trxId: string, excludeId?: number) {
  const clean = trxId.trim().toUpperCase();
  if (!clean) return [];
  const db = await getDb();
  const rows = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      occurredAt: transactions.occurredAt,
      person: transactions.person,
      pocketName: pockets.name,
    })
    .from(transactions)
    .innerJoin(pockets, eq(pockets.id, transactions.pocketId))
    .where(sql`upper(${transactions.trxId}) = ${clean}`);
  return rows.filter((r) => r.id !== excludeId);
}

/** Distinct people the user has typed before, for autocomplete. */
export async function listPeople(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ person: transactions.person })
    .from(transactions)
    .where(isNotNull(transactions.person))
    .orderBy(asc(transactions.person))
    .limit(500);
  return rows.map((r) => r.person!).filter(Boolean);
}

/** Per-month numbers for the summary page. */
export async function monthBreakdown(from: Date, to: Date) {
  const db = await getDb();
  const range = and(gte(transactions.occurredAt, from), lt(transactions.occurredAt, to));
  const byPocket = await db
    .select({
      pocketId: transactions.pocketId,
      direction: transactions.direction,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      fees: sql<string>`coalesce(sum(${transactions.fee}), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(range)
    .groupBy(transactions.pocketId, transactions.direction);
  const byType = await db
    .select({
      type: transactions.type,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      fees: sql<string>`coalesce(sum(${transactions.fee}), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(range)
    .groupBy(transactions.type);
  return {
    byPocket: byPocket.map((r) => ({ ...r, total: num(r.total), fees: num(r.fees), count: num(r.count) })),
    byType: byType.map((r) => ({ ...r, total: num(r.total), fees: num(r.fees), count: num(r.count) })),
  };
}

/** Fee totals grouped by month (last 12 months) and by type. */
export async function feeBreakdown() {
  const db = await getDb();
  const month = sql<string>`to_char(${transactions.occurredAt} at time zone 'Asia/Dhaka', 'YYYY-MM')`;
  const byMonth = await db
    .select({ month, total: sql<string>`sum(${transactions.fee})`, count: sql<string>`count(*)` })
    .from(transactions)
    .where(sql`${transactions.fee} > 0`)
    .groupBy(month)
    .orderBy(desc(month))
    .limit(12);
  const byType = await db
    .select({ type: transactions.type, total: sql<string>`sum(${transactions.fee})`, count: sql<string>`count(*)` })
    .from(transactions)
    .where(sql`${transactions.fee} > 0`)
    .groupBy(transactions.type);
  return {
    byMonth: byMonth.map((r) => ({ month: r.month, total: num(r.total), count: num(r.count) })),
    byType: byType.map((r) => ({ type: r.type, total: num(r.total), count: num(r.count) })),
  };
}

export type PlayerWithPaid = typeof players.$inferSelect & { bkashPaid: number; totalPaid: number };

export async function listPlayers(pocketId: number): Promise<PlayerWithPaid[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(players)
    .where(eq(players.pocketId, pocketId))
    .orderBy(asc(players.name));
  if (!rows.length) return [];
  const paid = await db
    .select({ playerId: transactions.playerId, total: sql<string>`sum(${transactions.amount})` })
    .from(transactions)
    .where(and(inArray(transactions.playerId, rows.map((r) => r.id)), eq(transactions.direction, "in")))
    .groupBy(transactions.playerId);
  const paidMap = new Map(paid.map((p) => [num(p.playerId), num(p.total)]));
  return rows.map((p) => {
    const bkashPaid = paidMap.get(p.id) ?? 0;
    return { ...p, bkashPaid, totalPaid: bkashPaid + p.cashPaid };
  });
}

export async function listReconciliations(limit = 20) {
  const db = await getDb();
  return db.select().from(reconciliations).orderBy(desc(reconciliations.createdAt)).limit(limit);
}

export async function latestBalanceFromReceipts(): Promise<{ balance: number; at: Date } | null> {
  const db = await getDb();
  const [r] = await db
    .select({ balance: transactions.balanceAfter, at: transactions.occurredAt })
    .from(transactions)
    .where(isNotNull(transactions.balanceAfter))
    .orderBy(desc(transactions.occurredAt))
    .limit(1);
  return r && r.balance !== null ? { balance: r.balance, at: r.at } : null;
}
