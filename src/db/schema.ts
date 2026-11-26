/**
 * Database schema (Drizzle ORM, Postgres).
 *
 * Money is stored as integer **poisha** (1 taka = 100 poisha) so that sums
 * never suffer from floating point errors. Use `src/lib/money.ts` to convert.
 *
 * Balance of a pocket =
 *     openingBalance
 *   + sum(amount of "in" transactions in the pocket)
 *   - sum(amount of "out" transactions in the pocket)
 *   - sum(fee of transactions whose feePocketId is the pocket)
 *
 * The sum of every pocket's balance should equal the real bKash balance; the
 * reconciliation screen checks exactly that.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** What a pocket is used for. Drives which extra screens a pocket gets. */
export const pocketKind = pgEnum("pocket_kind", [
  "personal", // the user's own money
  "partner", // money held for a business partner (e.g. Khobaib) — gets a ledger + statement
  "tournament", // tournament collection — gets a player / jersey list
  "other",
]);

/** Whether money came into the bKash account or left it. */
export const direction = pgEnum("direction", ["in", "out"]);

/** bKash transaction types. */
export const txType = pgEnum("tx_type", [
  "send_money",
  "received",
  "cash_in",
  "cash_out",
  "payment",
  "mobile_recharge",
  "other",
]);

export const txSource = pgEnum("tx_source", ["screenshot", "manual"]);

export type TournamentSettings = {
  /** What each player pays for a jersey (poisha). */
  jerseyFee?: number;
  /** What the vendor charges per jersey (poisha). */
  vendorPrice?: number;
  /** Vendor name, shown on the tournament screen. */
  vendorName?: string;
};

export const pockets = pgTable("pockets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: pocketKind("kind").notNull().default("other"),
  /** Balance this pocket already had when you started using the app (poisha). */
  openingBalance: bigint("opening_balance", { mode: "number" }).notNull().default(0),
  /** Accent colour for the pocket card (one of the theme palette keys). */
  color: text("color").notNull().default("teal"),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  settings: jsonb("settings").$type<TournamentSettings>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Tournament players (only used by pockets of kind "tournament"). */
export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    pocketId: integer("pocket_id")
      .notNull()
      .references(() => pockets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    jerseyNumber: text("jersey_number"),
    jerseySize: text("jersey_size"),
    /**
     * Jersey money paid in cash (outside bKash), in poisha. bKash payments are
     * linked through transactions.playerId instead, so they reconcile.
     */
    cashPaid: bigint("cash_paid", { mode: "number" }).notNull().default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("players_pocket_idx").on(t.pocketId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    pocketId: integer("pocket_id")
      .notNull()
      .references(() => pockets.id, { onDelete: "restrict" }),
    direction: direction("direction").notNull(),
    type: txType("type").notNull(),
    /** Principal amount (poisha), always positive. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    /** bKash charge (poisha). Tracked separately from the amount. */
    fee: bigint("fee", { mode: "number" }).notNull().default(0),
    /** Which pocket pays the fee. Defaults to the transaction's own pocket. */
    feePocketId: integer("fee_pocket_id").references(() => pockets.id, {
      onDelete: "set null",
    }),
    /** Who sent / received the money, as typed by the user. */
    person: text("person"),
    phone: text("phone"),
    trxId: text("trx_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    /** bKash balance shown on the receipt after this transaction (poisha). */
    balanceAfter: bigint("balance_after", { mode: "number" }),
    /** Where / why — used heavily in the partner ledger. */
    note: text("note"),
    /** Free-form category, e.g. "jersey_vendor" for tournament vendor payments. */
    category: text("category"),
    playerId: integer("player_id").references(() => players.id, { onDelete: "set null" }),
    /** Storage key of the proof screenshot (Vercel Blob URL or local path). */
    screenshot: text("screenshot"),
    source: txSource("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tx_pocket_idx").on(t.pocketId),
    index("tx_occurred_idx").on(t.occurredAt),
    // Not unique on purpose: the app warns about duplicates but lets the user override.
    index("tx_trxid_idx").on(sql`upper(${t.trxId})`),
  ],
);

/** Each time the user checks the real bKash balance against the app. */
export const reconciliations = pgTable("reconciliations", {
  id: serial("id").primaryKey(),
  actualBalance: bigint("actual_balance", { mode: "number" }).notNull(),
  expectedBalance: bigint("expected_balance", { mode: "number" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Pocket = typeof pockets.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Reconciliation = typeof reconciliations.$inferSelect;
export type TxType = (typeof txType.enumValues)[number];
export type Direction = (typeof direction.enumValues)[number];
export type PocketKind = (typeof pocketKind.enumValues)[number];
export const TX_TYPES = txType.enumValues;
export const POCKET_KINDS = pocketKind.enumValues;
