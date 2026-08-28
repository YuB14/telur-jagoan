CREATE UNIQUE INDEX IF NOT EXISTS "cash_sessions_one_open_per_cashier_idx"
  ON "cash_sessions" ("cashier_id")
  WHERE "status" = 'OPEN';

ALTER TABLE "cash_sessions"
  DROP CONSTRAINT IF EXISTS "cash_sessions_opening_cash_check";

ALTER TABLE "cash_sessions"
  ADD CONSTRAINT "cash_sessions_opening_cash_check"
  CHECK ("opening_cash" >= 0);

ALTER TABLE "cash_movements"
  DROP CONSTRAINT IF EXISTS "cash_movements_amount_check";

ALTER TABLE "cash_movements"
  ADD CONSTRAINT "cash_movements_amount_check"
  CHECK ("amount" >= 0);
