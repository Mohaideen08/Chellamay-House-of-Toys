-- ============================================================
-- Chellamay House of Toys � Supabase Database Schema
-- Run these statements in the Supabase SQL Editor
-- ============================================================
-- NOTE: Role-based access is handled in the React app (AuthContext.js)
-- by checking the user email against the ADMIN_EMAILS list.
-- No profiles table or trigger is needed.
-- ============================================================

-- -------------------------------------------------------------
-- 1. BRANCHES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO branches (name) VALUES ('Main Branch') ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------
-- 2. DEALERS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealers (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL,
  phone       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 3. CATEGORIES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 4. PRODUCTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                 SERIAL         PRIMARY KEY,
  name               TEXT           NOT NULL,
  category_id        INTEGER        REFERENCES categories(id) ON DELETE SET NULL,
  barcode            TEXT,
  item_code          TEXT           UNIQUE,
  hsn                TEXT,
  mrp                DECIMAL(12,2)  NOT NULL CHECK (mrp >= 0),
  purchase_price     DECIMAL(12,2)  CHECK (purchase_price >= 0),
  sales_price        DECIMAL(12,2)  NOT NULL CHECK (sales_price >= 0),
  gst_enabled        BOOLEAN        NOT NULL DEFAULT FALSE,
  sgst_percent       DECIMAL(5,2),
  cgst_percent       DECIMAL(5,2),
  cess_percent       DECIMAL(5,2),
  opening_quantity   INTEGER        NOT NULL DEFAULT 0 CHECK (opening_quantity >= 0),
  current_quantity   INTEGER        NOT NULL DEFAULT 0,
  branch_quantities  JSONB          NOT NULL DEFAULT '{}',
  dealer_id          INTEGER        REFERENCES dealers(id) ON DELETE SET NULL,
  branch_id          INTEGER        REFERENCES branches(id) ON DELETE SET NULL,
  created_by         UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email   TEXT,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Add branch_quantities column to existing tables (safe to run multiple times)
ALTER TABLE products ADD COLUMN IF NOT EXISTS branch_quantities JSONB NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by_email TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS final_price DECIMAL(12,2) CHECK (final_price >= 0);

-- -------------------------------------------------------------
-- 5. BILLS  (bill header)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id              SERIAL         PRIMARY KEY,
  bill_number     TEXT           NOT NULL UNIQUE,
  customer_name   TEXT,
  customer_phone  TEXT,
  total_amount    DECIMAL(12,2)  NOT NULL DEFAULT 0,
  discount        DECIMAL(12,2)  NOT NULL DEFAULT 0,
  net_amount      DECIMAL(12,2)  NOT NULL DEFAULT 0,
  created_by      UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 6. BILL_ITEMS  (bill line items)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bill_items (
  id           SERIAL         PRIMARY KEY,
  bill_id      INTEGER        NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id   INTEGER        REFERENCES products(id) ON DELETE SET NULL,
  quantity     INTEGER        NOT NULL CHECK (quantity > 0),
  mrp          DECIMAL(12,2),
  sales_price  DECIMAL(12,2),
  discount     DECIMAL(12,2)  NOT NULL DEFAULT 0,
  total        DECIMAL(12,2)  NOT NULL,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 7. RETURNS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS returns (
  id             SERIAL      PRIMARY KEY,
  product_id     INTEGER     REFERENCES products(id) ON DELETE SET NULL,
  quantity       INTEGER     NOT NULL CHECK (quantity > 0),
  reason         TEXT,
  return_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  restocked      BOOLEAN     NOT NULL DEFAULT FALSE,
  restocked_at   TIMESTAMPTZ
);

-- Migration (run if table already exists):
-- ALTER TABLE returns ADD COLUMN IF NOT EXISTS restocked BOOLEAN NOT NULL DEFAULT FALSE;
-- ALTER TABLE returns ADD COLUMN IF NOT EXISTS restocked_at TIMESTAMPTZ;

-- Add branch_id to returns (run in Supabase SQL Editor):
ALTER TABLE returns ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL;

-- -------------------------------------------------------------
-- 8. RESTOCK LOGS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restock_logs (
  id           SERIAL      PRIMARY KEY,
  product_id   INTEGER     REFERENCES products(id) ON DELETE SET NULL,
  qty_added    INTEGER     NOT NULL CHECK (qty_added > 0),
  qty_before   INTEGER     NOT NULL,
  qty_after    INTEGER     NOT NULL,
  notes        TEXT,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS)
-- -------------------------------------------------------------
ALTER TABLE branches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users full access" ON branches      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access" ON dealers       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access" ON categories    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access" ON products      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access" ON bills         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access" ON bill_items    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access" ON returns       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users full access" ON restock_logs  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -------------------------------------------------------------
-- 10. USEFUL INDEXES
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_dealer      ON products(dealer_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill      ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product   ON bill_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bills_created_at     ON bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_returns_created_at   ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restock_created_at   ON restock_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restock_product_id   ON restock_logs(product_id);

-- -------------------------------------------------------------
-- 11. MIGRATIONS – run these in Supabase SQL Editor if the
--     sales / sale_items tables already exist
-- -------------------------------------------------------------
-- ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name  TEXT;
-- ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
-- ALTER TABLE sales ADD COLUMN IF NOT EXISTS branch_id      INTEGER REFERENCES branches(id) ON DELETE SET NULL;
