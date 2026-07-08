CREATE TYPE "public"."order_item_status" AS ENUM('PENDING', 'COOKING', 'SERVED');--> statement-breakpoint
CREATE TYPE "public"."refund_method" AS ENUM('CASH', 'CARD', 'QRIS', 'EWALLET', 'BANK_TRANSFER');--> statement-breakpoint
CREATE TABLE "device_profiles" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"printer_settings" jsonb,
	"receipt_settings" jsonb,
	"payment_gateways" jsonb
);
--> statement-breakpoint
CREATE TABLE "pos_ledgers" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"branch_id" varchar(50) NOT NULL,
	"operator_id" varchar(50) NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_id" varchar(50),
	"source_event" varchar(50) NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"invoice_id" varchar(26) NOT NULL,
	"operator_id" varchar(26) NOT NULL,
	"refund_method" "refund_method" NOT NULL,
	"total_refund_amount" integer NOT NULL,
	"reason" varchar(255) NOT NULL,
	"items_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_coa" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"normal_balance" varchar(20) NOT NULL,
	"is_header" boolean DEFAULT false NOT NULL,
	"parent" varchar(100),
	"desc" text,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wms_coa_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "event_journal" ALTER COLUMN "id" SET DATA TYPE varchar(36);--> statement-breakpoint
ALTER TABLE "pos_shifts" ALTER COLUMN "id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "pos_shifts" ALTER COLUMN "device_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD COLUMN "expected_non_cash" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD COLUMN "actual_non_cash" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD COLUMN "non_cash_difference" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD COLUMN "reconciliation_notes" text;--> statement-breakpoint
ALTER TABLE "pos_shifts" ADD COLUMN "business_date" varchar(10) DEFAULT '1970-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "business_date" varchar(10) DEFAULT '1970-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "voided_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "refunded_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "status" "order_item_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "void_reason" varchar(50);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "business_date" varchar(10) DEFAULT '1970-01-01' NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_ledgers" ADD CONSTRAINT "pos_ledgers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_ledgers" ADD CONSTRAINT "pos_ledgers_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;