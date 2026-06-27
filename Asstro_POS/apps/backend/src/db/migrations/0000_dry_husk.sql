CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'partial', 'paid', 'void', 'refunded', 'complimentary');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('open', 'cooking', 'served', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_capture_mode" AS ENUM('MANUAL', 'INTEGRATED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'QRIS', 'EWALLET', 'BANK_TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('BCA_EDC', 'MANDIRI_EDC', 'MIDTRANS', 'XENDIT', 'STRIPE', 'ADYEN', 'VERIFONE', 'INGENICO');--> statement-breakpoint
CREATE TYPE "public"."petty_cash_status" AS ENUM('ON_PROCESS', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."debt_status" AS ENUM('UNPAID', 'PARTIAL', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."merge_status" AS ENUM('UNMERGED', 'MERGED');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('IN_PURCHASE', 'IN_TRANSFER', 'OUT_SALE', 'OUT_TRANSFER', 'OUT_SPOILAGE', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."uom_type" AS ENUM('KG', 'GRAM', 'LITER', 'ML', 'PCS', 'BOX', 'KARUNG', 'KARTON', 'PACK', 'BOTOL', 'EKOR');--> statement-breakpoint
CREATE TABLE "event_journal" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"device_id" varchar(26) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_products" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"product_id" varchar(26) NOT NULL,
	"sale_price" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "product_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"category_id" varchar(26) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"base_price" integer NOT NULL,
	"is_fnb" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "pos_shifts" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"device_id" varchar(26) NOT NULL,
	"cashier_id" varchar(26) NOT NULL,
	"opened_at" timestamp NOT NULL,
	"closed_at" timestamp,
	"starting_cash" numeric(15, 2) NOT NULL,
	"expected_ending_cash" numeric(15, 2),
	"actual_ending_cash" numeric(15, 2),
	"difference" numeric(15, 2),
	"difference_reason" text,
	"status" varchar(10) DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"operator_id" varchar(26) NOT NULL,
	"manager_id" varchar(26),
	"event_type" varchar(50) NOT NULL,
	"reference_id" varchar(100) NOT NULL,
	"reason" varchar(255) NOT NULL,
	"payload_hash" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"order_id" varchar(26),
	"invoice_number" varchar(50) NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax_rate" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"service_rate" integer DEFAULT 0 NOT NULL,
	"service_amount" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"grand_total" integer DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"notes" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"order_id" varchar(26) NOT NULL,
	"product_id" varchar(26) NOT NULL,
	"sku_snapshot" varchar(50) NOT NULL,
	"name_snapshot" varchar(150) NOT NULL,
	"base_price_snapshot" integer NOT NULL,
	"qty" integer NOT NULL,
	"notes" varchar(255),
	"is_voided" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"operator_id" varchar(26) NOT NULL,
	"table_label" varchar(50) NOT NULL,
	"customer_name" varchar(100),
	"guest_count" integer DEFAULT 1 NOT NULL,
	"status" "order_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"invoice_id" varchar(26) NOT NULL,
	"operator_id" varchar(26) NOT NULL,
	"method" "payment_method" NOT NULL,
	"capture_mode" "payment_capture_mode" DEFAULT 'MANUAL' NOT NULL,
	"provider" "payment_provider",
	"amount_paid" integer NOT NULL,
	"change_amount" integer DEFAULT 0 NOT NULL,
	"reference_number" varchar(100),
	"approval_code" varchar(50),
	"rrn" varchar(50),
	"trace_number" varchar(50),
	"batch_number" varchar(50),
	"settlement_metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petty_cash_kasir" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"requester_name" varchar(150) NOT NULL,
	"requester_division" varchar(100) NOT NULL,
	"notes" varchar(255) NOT NULL,
	"cashier_issued_id" varchar(26) NOT NULL,
	"amount_requested" integer NOT NULL,
	"issued_at" timestamp NOT NULL,
	"status" "petty_cash_status" DEFAULT 'ON_PROCESS' NOT NULL,
	"cashier_resolved_id" varchar(26),
	"amount_returned" integer DEFAULT 0,
	"has_receipt" boolean DEFAULT false,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wms_financial_configs" (
	"branch_id" varchar(100) PRIMARY KEY NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"service_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"ap_limit_rate" numeric(5, 2) DEFAULT '50' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_wallet_accounts" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"region_id" varchar(100) NOT NULL,
	"branch_id" varchar(100) NOT NULL,
	"managed_by" varchar(50) NOT NULL,
	"type" varchar(50) NOT NULL,
	"bank_name" varchar(100),
	"account_number" varchar(100),
	"account_holder" varchar(100),
	"account_name" varchar(100) NOT NULL,
	"binding" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wms_wallet_ledgers" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"transaction_id" varchar(100) NOT NULL,
	"account_id" varchar(100) NOT NULL,
	"branch_id" varchar(100) NOT NULL,
	"mutation_type" varchar(10) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" varchar(100),
	"operator_id" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_processed_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_global_categories" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "item_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_global_products" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"category_id" varchar(50) NOT NULL,
	"base_uom" "uom_type" NOT NULL,
	"status" "item_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_regional_items" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"region_id" varchar(50) NOT NULL,
	"branch_id" varchar(50),
	"local_name" varchar(255) NOT NULL,
	"local_category" varchar(255),
	"uom" varchar(50) NOT NULL,
	"purchase_price" numeric(12, 2) NOT NULL,
	"margin" numeric(5, 2) DEFAULT '0' NOT NULL,
	"selling_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"global_id" varchar(50),
	"merge_status" "merge_status" DEFAULT 'UNMERGED' NOT NULL,
	"status" "item_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_outlet_balance_mutations" (
	"id" text PRIMARY KEY NOT NULL,
	"outlet_id" text NOT NULL,
	"mutation_type" text NOT NULL,
	"amount" numeric NOT NULL,
	"balance_after" numeric NOT NULL,
	"reference_id" text,
	"notes" text,
	"proof_of_transfer" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_outlet_balances" (
	"outlet_id" text PRIMARY KEY NOT NULL,
	"balance" numeric DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"receiving_id" text NOT NULL,
	"amount" numeric NOT NULL,
	"status" text DEFAULT 'SUCCESS' NOT NULL,
	"deposit_amount" numeric DEFAULT '0' NOT NULL,
	"external_amount" numeric DEFAULT '0' NOT NULL,
	"payment_method" text,
	"funding_source" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"proof_of_transfer" text,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_receiving" (
	"id" text PRIMARY KEY NOT NULL,
	"region_id" text NOT NULL,
	"branch_id" text,
	"transaction_type" text NOT NULL,
	"source_entity" text NOT NULL,
	"invoice_number" text,
	"total_amount" numeric NOT NULL,
	"payment_status" text DEFAULT 'UNPAID' NOT NULL,
	"total_payment" numeric DEFAULT '0' NOT NULL,
	"due_date" timestamp,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"received_at" timestamp NOT NULL,
	"proof_of_transaction" text,
	"payment_method" text,
	"funding_source" text,
	"mutation_type" text,
	"target_region_id" text,
	"loan_status" text,
	"return_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_receiving_items" (
	"id" text PRIMARY KEY NOT NULL,
	"receiving_id" text NOT NULL,
	"regional_item_id" text NOT NULL,
	"item_name" text NOT NULL,
	"uom" text NOT NULL,
	"qty" numeric NOT NULL,
	"price" numeric NOT NULL,
	"subtotal" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wms_vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"region_id" text NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"phone" text,
	"address" text,
	"bank_name" text,
	"bank_account_name" text,
	"bank_account_number" text,
	"certifications" jsonb,
	"contract_file_url" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"company_id" varchar(26) NOT NULL,
	"region_id" varchar(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "companies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"device_token" varchar(255) NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "devices_device_token_unique" UNIQUE("device_token")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "regions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"branch_id" varchar(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"pin" varchar(6),
	"role" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "event_journal" ADD CONSTRAINT "event_journal_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_products" ADD CONSTRAINT "branch_products_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_products" ADD CONSTRAINT "branch_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petty_cash_kasir" ADD CONSTRAINT "petty_cash_kasir_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petty_cash_kasir" ADD CONSTRAINT "petty_cash_kasir_cashier_issued_id_users_id_fk" FOREIGN KEY ("cashier_issued_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petty_cash_kasir" ADD CONSTRAINT "petty_cash_kasir_cashier_resolved_id_users_id_fk" FOREIGN KEY ("cashier_resolved_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wms_global_products" ADD CONSTRAINT "wms_global_products_category_id_wms_global_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."wms_global_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wms_regional_items" ADD CONSTRAINT "wms_regional_items_global_id_wms_global_products_id_fk" FOREIGN KEY ("global_id") REFERENCES "public"."wms_global_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;