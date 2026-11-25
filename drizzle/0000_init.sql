CREATE TYPE "public"."direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."pocket_kind" AS ENUM('personal', 'partner', 'tournament', 'other');--> statement-breakpoint
CREATE TYPE "public"."tx_source" AS ENUM('screenshot', 'manual');--> statement-breakpoint
CREATE TYPE "public"."tx_type" AS ENUM('send_money', 'received', 'cash_in', 'cash_out', 'payment', 'mobile_recharge', 'other');--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"pocket_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"jersey_number" text,
	"jersey_size" text,
	"cash_paid" bigint DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pockets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" "pocket_kind" DEFAULT 'other' NOT NULL,
	"opening_balance" bigint DEFAULT 0 NOT NULL,
	"color" text DEFAULT 'teal' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliations" (
	"id" serial PRIMARY KEY NOT NULL,
	"actual_balance" bigint NOT NULL,
	"expected_balance" bigint NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"pocket_id" integer NOT NULL,
	"direction" "direction" NOT NULL,
	"type" "tx_type" NOT NULL,
	"amount" bigint NOT NULL,
	"fee" bigint DEFAULT 0 NOT NULL,
	"fee_pocket_id" integer,
	"person" text,
	"phone" text,
	"trx_id" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"balance_after" bigint,
	"note" text,
	"category" text,
	"player_id" integer,
	"screenshot" text,
	"source" "tx_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_pocket_id_pockets_id_fk" FOREIGN KEY ("pocket_id") REFERENCES "public"."pockets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pocket_id_pockets_id_fk" FOREIGN KEY ("pocket_id") REFERENCES "public"."pockets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fee_pocket_id_pockets_id_fk" FOREIGN KEY ("fee_pocket_id") REFERENCES "public"."pockets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "players_pocket_idx" ON "players" USING btree ("pocket_id");--> statement-breakpoint
CREATE INDEX "tx_pocket_idx" ON "transactions" USING btree ("pocket_id");--> statement-breakpoint
CREATE INDEX "tx_occurred_idx" ON "transactions" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "tx_trxid_idx" ON "transactions" USING btree (upper("trx_id"));