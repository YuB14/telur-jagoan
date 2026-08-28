DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
    CREATE TYPE "sale_status" AS ENUM ('COMPLETED', 'CANCELLED', 'REFUNDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_return_reason') THEN
    CREATE TYPE "sale_return_reason" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'CUSTOMER_CHANGED_MIND', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_refund_method') THEN
    CREATE TYPE "sale_refund_method" AS ENUM ('CASH_REFUND');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
    CREATE TYPE "return_status" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "sales" (
  "id" UUID PRIMARY KEY,
  "sale_number" VARCHAR(50) NOT NULL UNIQUE,
  "sale_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "customer_id" UUID NOT NULL REFERENCES "customers"("id"),
  "cashier_id" UUID NOT NULL REFERENCES "users"("id"),
  "cash_session_id" UUID NOT NULL REFERENCES "cash_sessions"("id"),
  "subtotal" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "discount_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "grand_total" DECIMAL(14, 2) NOT NULL,
  "amount_paid" DECIMAL(14, 2) NOT NULL,
  "change_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "total_cost" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "gross_profit" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "status" "sale_status" NOT NULL DEFAULT 'COMPLETED',
  "print_count" INTEGER NOT NULL DEFAULT 0,
  "last_printed_at" TIMESTAMPTZ(6),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sale_items" (
  "id" UUID PRIMARY KEY,
  "sale_id" UUID NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
  "product_id" UUID NOT NULL REFERENCES "products"("id"),
  "product_unit_id" UUID NOT NULL REFERENCES "product_units"("id"),
  "product_name_snapshot" VARCHAR(150) NOT NULL,
  "unit_name_snapshot" VARCHAR(30) NOT NULL,
  "quantity" DECIMAL(14, 3) NOT NULL,
  "conversion_to_base" DECIMAL(14, 4) NOT NULL,
  "base_quantity" DECIMAL(14, 3) NOT NULL,
  "unit_price" DECIMAL(14, 2) NOT NULL,
  "discount_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "subtotal" DECIMAL(14, 2) NOT NULL,
  "cost_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "profit_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sale_payments" (
  "id" UUID PRIMARY KEY,
  "sale_id" UUID NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
  "payment_method_id" UUID NOT NULL REFERENCES "payment_methods"("id"),
  "amount" DECIMAL(14, 2) NOT NULL,
  "reference_number" VARCHAR(100),
  "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sale_batch_allocations" (
  "id" UUID PRIMARY KEY,
  "sale_item_id" UUID NOT NULL REFERENCES "sale_items"("id") ON DELETE CASCADE,
  "inventory_batch_id" UUID NOT NULL REFERENCES "inventory_batches"("id"),
  "quantity" DECIMAL(14, 3) NOT NULL,
  "unit_cost" DECIMAL(14, 2) NOT NULL,
  "total_cost" DECIMAL(14, 2) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sale_returns" (
  "id" UUID PRIMARY KEY,
  "return_number" VARCHAR(50) NOT NULL UNIQUE,
  "sale_id" UUID NOT NULL REFERENCES "sales"("id"),
  "return_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "reason" "sale_return_reason" NOT NULL,
  "total_amount" DECIMAL(14, 2) NOT NULL,
  "refund_method" "sale_refund_method" NOT NULL DEFAULT 'CASH_REFUND',
  "status" "return_status" NOT NULL DEFAULT 'COMPLETED',
  "approved_by" UUID NOT NULL REFERENCES "users"("id"),
  "notes" TEXT,
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sale_return_items" (
  "id" UUID PRIMARY KEY,
  "sale_return_id" UUID NOT NULL REFERENCES "sale_returns"("id") ON DELETE CASCADE,
  "sale_item_id" UUID NOT NULL REFERENCES "sale_items"("id"),
  "product_id" UUID NOT NULL REFERENCES "products"("id"),
  "quantity" DECIMAL(14, 3) NOT NULL,
  "unit_price" DECIMAL(14, 2) NOT NULL,
  "subtotal" DECIMAL(14, 2) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "sales_customer_id_idx" ON "sales" ("customer_id");
CREATE INDEX IF NOT EXISTS "sales_cashier_id_sale_date_idx" ON "sales" ("cashier_id", "sale_date");
CREATE INDEX IF NOT EXISTS "sales_cash_session_id_idx" ON "sales" ("cash_session_id");
CREATE INDEX IF NOT EXISTS "sales_status_idx" ON "sales" ("status");
CREATE INDEX IF NOT EXISTS "sale_items_sale_id_idx" ON "sale_items" ("sale_id");
CREATE INDEX IF NOT EXISTS "sale_items_product_id_idx" ON "sale_items" ("product_id");
CREATE INDEX IF NOT EXISTS "sale_items_product_unit_id_idx" ON "sale_items" ("product_unit_id");
CREATE INDEX IF NOT EXISTS "sale_payments_sale_id_idx" ON "sale_payments" ("sale_id");
CREATE INDEX IF NOT EXISTS "sale_payments_payment_method_id_idx" ON "sale_payments" ("payment_method_id");
CREATE INDEX IF NOT EXISTS "sale_payments_created_by_idx" ON "sale_payments" ("created_by");
CREATE INDEX IF NOT EXISTS "sale_batch_allocations_sale_item_id_idx" ON "sale_batch_allocations" ("sale_item_id");
CREATE INDEX IF NOT EXISTS "sale_batch_allocations_inventory_batch_id_idx" ON "sale_batch_allocations" ("inventory_batch_id");
CREATE INDEX IF NOT EXISTS "sale_returns_sale_id_idx" ON "sale_returns" ("sale_id");
CREATE INDEX IF NOT EXISTS "sale_returns_approved_by_idx" ON "sale_returns" ("approved_by");
CREATE INDEX IF NOT EXISTS "sale_returns_created_by_idx" ON "sale_returns" ("created_by");
CREATE INDEX IF NOT EXISTS "sale_return_items_sale_return_id_idx" ON "sale_return_items" ("sale_return_id");
CREATE INDEX IF NOT EXISTS "sale_return_items_sale_item_id_idx" ON "sale_return_items" ("sale_item_id");
CREATE INDEX IF NOT EXISTS "sale_return_items_product_id_idx" ON "sale_return_items" ("product_id");

ALTER TABLE "sales"
  DROP CONSTRAINT IF EXISTS "sales_money_check";
ALTER TABLE "sales"
  ADD CONSTRAINT "sales_money_check"
  CHECK ("subtotal" >= 0 AND "discount_amount" >= 0 AND "tax_amount" >= 0 AND "grand_total" >= 0 AND "amount_paid" >= 0 AND "change_amount" >= 0);

ALTER TABLE "sale_items"
  DROP CONSTRAINT IF EXISTS "sale_items_quantity_money_check";
ALTER TABLE "sale_items"
  ADD CONSTRAINT "sale_items_quantity_money_check"
  CHECK ("quantity" > 0 AND "conversion_to_base" > 0 AND "base_quantity" > 0 AND "unit_price" >= 0 AND "discount_amount" >= 0 AND "subtotal" >= 0);

ALTER TABLE "sale_payments"
  DROP CONSTRAINT IF EXISTS "sale_payments_amount_check";
ALTER TABLE "sale_payments"
  ADD CONSTRAINT "sale_payments_amount_check"
  CHECK ("amount" > 0);

ALTER TABLE "sale_batch_allocations"
  DROP CONSTRAINT IF EXISTS "sale_batch_allocations_quantity_check";
ALTER TABLE "sale_batch_allocations"
  ADD CONSTRAINT "sale_batch_allocations_quantity_check"
  CHECK ("quantity" > 0 AND "unit_cost" >= 0 AND "total_cost" >= 0);

ALTER TABLE "sale_returns"
  DROP CONSTRAINT IF EXISTS "sale_returns_total_amount_check";
ALTER TABLE "sale_returns"
  ADD CONSTRAINT "sale_returns_total_amount_check"
  CHECK ("total_amount" > 0);

ALTER TABLE "sale_return_items"
  DROP CONSTRAINT IF EXISTS "sale_return_items_quantity_money_check";
ALTER TABLE "sale_return_items"
  ADD CONSTRAINT "sale_return_items_quantity_money_check"
  CHECK ("quantity" > 0 AND "unit_price" >= 0 AND "subtotal" > 0);
