DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_return_reason') THEN
    CREATE TYPE "purchase_return_reason" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'EXPIRED', 'OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_refund_method') THEN
    CREATE TYPE "purchase_refund_method" AS ENUM ('CASH_REFUND', 'DEDUCT_FROM_DEBT', 'SUPPLIER_CREDIT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE "notification_type" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'BATCH_NEAR_EXPIRY', 'SUPPLIER_DEBT_DUE', 'CASH_DIFFERENCE', 'RETURN_PENDING_APPROVAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
    CREATE TYPE "return_status" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
  END IF;
END $$;

ALTER TABLE "purchases"
  ADD COLUMN IF NOT EXISTS "supplier_name" VARCHAR(150);

UPDATE "purchases"
SET "supplier_name" = "suppliers"."name"
FROM "suppliers"
WHERE "purchases"."supplier_id" = "suppliers"."id"
  AND "purchases"."supplier_name" IS NULL;

ALTER TABLE "purchases"
  ALTER COLUMN "supplier_name" SET NOT NULL;

ALTER TABLE "purchase_payments"
  ADD COLUMN IF NOT EXISTS "receipt_url" TEXT;

CREATE TABLE IF NOT EXISTS "purchase_returns" (
  "id" UUID PRIMARY KEY,
  "return_number" VARCHAR(50) NOT NULL UNIQUE,
  "purchase_id" UUID NOT NULL REFERENCES "purchases"("id"),
  "supplier_id" UUID NOT NULL REFERENCES "suppliers"("id"),
  "return_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "reason" "purchase_return_reason" NOT NULL,
  "total_amount" DECIMAL(14, 2) NOT NULL,
  "refund_method" "purchase_refund_method" NOT NULL,
  "status" "return_status" NOT NULL DEFAULT 'COMPLETED',
  "notes" TEXT,
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "purchase_return_items" (
  "id" UUID PRIMARY KEY,
  "purchase_return_id" UUID NOT NULL REFERENCES "purchase_returns"("id") ON DELETE CASCADE,
  "purchase_item_id" UUID NOT NULL REFERENCES "purchase_items"("id"),
  "inventory_batch_id" UUID NOT NULL REFERENCES "inventory_batches"("id"),
  "product_id" UUID NOT NULL REFERENCES "products"("id"),
  "quantity" DECIMAL(14, 3) NOT NULL,
  "unit_cost" DECIMAL(14, 2) NOT NULL,
  "subtotal" DECIMAL(14, 2) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "type" "notification_type" NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "message" TEXT NOT NULL,
  "reference_type" VARCHAR(100),
  "reference_id" UUID,
  "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "purchase_returns_purchase_id_idx" ON "purchase_returns" ("purchase_id");
CREATE INDEX IF NOT EXISTS "purchase_returns_supplier_id_idx" ON "purchase_returns" ("supplier_id");
CREATE INDEX IF NOT EXISTS "purchase_returns_created_by_idx" ON "purchase_returns" ("created_by");
CREATE INDEX IF NOT EXISTS "purchase_return_items_purchase_return_id_idx" ON "purchase_return_items" ("purchase_return_id");
CREATE INDEX IF NOT EXISTS "purchase_return_items_purchase_item_id_idx" ON "purchase_return_items" ("purchase_item_id");
CREATE INDEX IF NOT EXISTS "purchase_return_items_inventory_batch_id_idx" ON "purchase_return_items" ("inventory_batch_id");
CREATE INDEX IF NOT EXISTS "purchase_return_items_product_id_idx" ON "purchase_return_items" ("product_id");
CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_created_at_idx" ON "notifications" ("user_id", "is_read", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_type_reference_type_reference_id_created_at_idx" ON "notifications" ("type", "reference_type", "reference_id", "created_at");

ALTER TABLE "purchase_returns"
  DROP CONSTRAINT IF EXISTS "purchase_returns_total_amount_check";
ALTER TABLE "purchase_returns"
  ADD CONSTRAINT "purchase_returns_total_amount_check"
  CHECK ("total_amount" > 0);

ALTER TABLE "purchase_return_items"
  DROP CONSTRAINT IF EXISTS "purchase_return_items_quantity_money_check";
ALTER TABLE "purchase_return_items"
  ADD CONSTRAINT "purchase_return_items_quantity_money_check"
  CHECK ("quantity" > 0 AND "unit_cost" >= 0 AND "subtotal" > 0);
