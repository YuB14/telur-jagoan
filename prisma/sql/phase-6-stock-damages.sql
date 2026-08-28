DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_damage_type') THEN
    CREATE TYPE "stock_damage_type" AS ENUM ('BROKEN', 'ROTTEN', 'EXPIRED', 'LOST', 'OTHER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "stock_damages" (
  "id" UUID PRIMARY KEY,
  "damage_number" VARCHAR(50) NOT NULL UNIQUE,
  "product_id" UUID NOT NULL REFERENCES "products"("id"),
  "inventory_batch_id" UUID NOT NULL REFERENCES "inventory_batches"("id"),
  "damage_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "damage_type" "stock_damage_type" NOT NULL,
  "quantity" DECIMAL(14, 3) NOT NULL,
  "unit_cost" DECIMAL(14, 2) NOT NULL,
  "loss_amount" DECIMAL(14, 2) NOT NULL,
  "notes" TEXT,
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "stock_damages_product_id_damage_date_idx" ON "stock_damages" ("product_id", "damage_date");
CREATE INDEX IF NOT EXISTS "stock_damages_inventory_batch_id_idx" ON "stock_damages" ("inventory_batch_id");
CREATE INDEX IF NOT EXISTS "stock_damages_created_by_idx" ON "stock_damages" ("created_by");

ALTER TABLE "stock_damages"
  DROP CONSTRAINT IF EXISTS "stock_damages_quantity_money_check";
ALTER TABLE "stock_damages"
  ADD CONSTRAINT "stock_damages_quantity_money_check"
  CHECK ("quantity" > 0 AND "unit_cost" >= 0 AND "loss_amount" >= 0);

-- Normalize existing products to the simplified Kg unit model. Existing stock remains unchanged.
UPDATE "products"
SET "base_unit_name" = 'Kg'
WHERE "base_unit_name" <> 'Kg';

UPDATE "product_units"
SET "unit_name" = 'Kg',
    "conversion_to_base" = 1,
    "is_base_unit" = TRUE,
    "is_active" = TRUE
WHERE "is_base_unit" = TRUE;
