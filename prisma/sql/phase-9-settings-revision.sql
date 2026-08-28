CREATE TABLE IF NOT EXISTS "store_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "store_name" VARCHAR(150) NOT NULL,
  "tagline" VARCHAR(255),
  "address" TEXT,
  "phone" VARCHAR(20),
  "whatsapp" VARCHAR(20),
  "email" VARCHAR(255),
  "logo_url" TEXT,
  "receipt_footer" TEXT,
  "tax_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'IDR',
  "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "store_settings" (
  "id",
  "store_name",
  "tagline",
  "address",
  "phone",
  "whatsapp",
  "receipt_footer",
  "currency",
  "timezone"
)
SELECT
  gen_random_uuid(),
  'Telur Jagoan',
  'Toko telur segar',
  'Alamat toko belum diatur',
  '081234567890',
  '081234567890',
  'Terima kasih sudah belanja di Telur Jagoan.',
  'IDR',
  'Asia/Jakarta'
WHERE NOT EXISTS (SELECT 1 FROM "store_settings");

UPDATE "payment_methods"
SET "is_active" = FALSE
WHERE "type" NOT IN ('CASH', 'QRIS', 'TRANSFER');

INSERT INTO "payment_methods" ("id", "code", "name", "type", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), 'CASH', 'Tunai', 'CASH', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "payment_methods" WHERE "code" = 'CASH');

INSERT INTO "payment_methods" ("id", "code", "name", "type", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), 'QRIS', 'QRIS', 'QRIS', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "payment_methods" WHERE "code" = 'QRIS');

INSERT INTO "payment_methods" ("id", "code", "name", "type", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), 'TRANSFER', 'Transfer', 'TRANSFER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "payment_methods" WHERE "code" = 'TRANSFER');
