CREATE TABLE IF NOT EXISTS "expense_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(30) NOT NULL UNIQUE,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "expense_number" VARCHAR(50) NOT NULL UNIQUE,
  "expense_category_id" UUID NOT NULL REFERENCES "expense_categories"("id"),
  "expense_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "amount" DECIMAL(14,2) NOT NULL,
  "payment_method_id" UUID NOT NULL REFERENCES "payment_methods"("id"),
  "description" TEXT NOT NULL,
  "receipt_url" TEXT,
  "cash_movement_id" UUID UNIQUE REFERENCES "cash_movements"("id") ON DELETE SET NULL,
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "expenses_amount_check" CHECK ("amount" >= 0)
);

ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "receipt_url" TEXT,
  ADD COLUMN IF NOT EXISTS "cash_movement_id" UUID,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_cash_movement_id_fkey'
  ) THEN
    ALTER TABLE "expenses"
      ADD CONSTRAINT "expenses_cash_movement_id_fkey"
      FOREIGN KEY ("cash_movement_id") REFERENCES "cash_movements"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "expenses_cash_movement_id_key" ON "expenses" ("cash_movement_id");
CREATE INDEX IF NOT EXISTS "expenses_expense_category_id_idx" ON "expenses" ("expense_category_id");
CREATE INDEX IF NOT EXISTS "expenses_payment_method_id_idx" ON "expenses" ("payment_method_id");
CREATE INDEX IF NOT EXISTS "expenses_created_by_idx" ON "expenses" ("created_by");
CREATE INDEX IF NOT EXISTS "expenses_expense_date_idx" ON "expenses" ("expense_date");
CREATE INDEX IF NOT EXISTS "expenses_deleted_at_idx" ON "expenses" ("deleted_at");

INSERT INTO "expense_categories" ("id", "code", "name", "description")
SELECT gen_random_uuid(), 'EXP-OTHER', 'Lain-lain', 'Kategori default untuk pengeluaran umum.'
WHERE NOT EXISTS (
  SELECT 1 FROM "expense_categories" WHERE "code" = 'EXP-OTHER'
);

CREATE TABLE IF NOT EXISTS "other_incomes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "income_number" VARCHAR(50) NOT NULL UNIQUE,
  "income_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "income_type" VARCHAR(100) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "payment_method_id" UUID NOT NULL REFERENCES "payment_methods"("id"),
  "description" TEXT NOT NULL,
  "cash_movement_id" UUID UNIQUE REFERENCES "cash_movements"("id") ON DELETE SET NULL,
  "created_by" UUID NOT NULL REFERENCES "users"("id"),
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "other_incomes_amount_check" CHECK ("amount" >= 0)
);

ALTER TABLE "other_incomes"
  ADD COLUMN IF NOT EXISTS "cash_movement_id" UUID,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'other_incomes_cash_movement_id_fkey'
  ) THEN
    ALTER TABLE "other_incomes"
      ADD CONSTRAINT "other_incomes_cash_movement_id_fkey"
      FOREIGN KEY ("cash_movement_id") REFERENCES "cash_movements"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "other_incomes_cash_movement_id_key" ON "other_incomes" ("cash_movement_id");
CREATE INDEX IF NOT EXISTS "other_incomes_payment_method_id_idx" ON "other_incomes" ("payment_method_id");
CREATE INDEX IF NOT EXISTS "other_incomes_created_by_idx" ON "other_incomes" ("created_by");
CREATE INDEX IF NOT EXISTS "other_incomes_income_date_idx" ON "other_incomes" ("income_date");
CREATE INDEX IF NOT EXISTS "other_incomes_deleted_at_idx" ON "other_incomes" ("deleted_at");
