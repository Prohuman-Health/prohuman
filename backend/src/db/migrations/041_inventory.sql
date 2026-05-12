-- 041: inventory management
-- Track consumables and equipment, stock levels, and transactions

CREATE TYPE inventory_category AS ENUM (
  'consumable', 'equipment', 'medication', 'linen', 'stationery', 'other'
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(120)     NOT NULL,
  category       inventory_category NOT NULL DEFAULT 'consumable',
  unit           VARCHAR(30)      NOT NULL DEFAULT 'units',  -- e.g. 'rolls', 'bottles', 'pairs'
  current_stock  NUMERIC(10,2)    NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock      NUMERIC(10,2)    NOT NULL DEFAULT 5,        -- low-stock threshold
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE inventory_tx_type AS ENUM ('restock', 'use', 'adjustment', 'wastage');

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID              NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type        inventory_tx_type NOT NULL,
  quantity    NUMERIC(10,2)     NOT NULL,   -- positive = stock in, negative = stock out
  stock_after NUMERIC(10,2)     NOT NULL,   -- denormalised snapshot
  notes       TEXT,
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_tx_item    ON inventory_transactions(item_id, created_at DESC);
CREATE INDEX idx_inv_low_stock  ON inventory_items(current_stock) WHERE is_active = TRUE;
