CREATE TABLE IF NOT EXISTS "product_units" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "unit_name" VARCHAR(30) NOT NULL,
  "conversion_to_base" DECIMAL(14, 4) NOT NULL,
  "selling_price" DECIMAL(14, 2) NOT NULL,
  "wholesale_price" DECIMAL(14, 2),
  "barcode" VARCHAR(100),
  "is_base_unit" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "product_units_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_units_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "product_units_conversion_to_base_check"
    CHECK ("conversion_to_base" > 0)
);

CREATE INDEX IF NOT EXISTS "product_units_product_id_idx"
  ON "product_units"("product_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_units_conversion_to_base_check'
  ) THEN
    ALTER TABLE "product_units"
      ADD CONSTRAINT "product_units_conversion_to_base_check"
      CHECK ("conversion_to_base" > 0);
  END IF;
END
$$;
