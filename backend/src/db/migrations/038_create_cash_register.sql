-- 038: cash register — debit ledger entries + receptionist view scope setting

-- Cash debit entries: record money taken OUT of the daily collection
CREATE TABLE IF NOT EXISTS cash_debits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_debits_date ON cash_debits(date);

-- Default setting: receptionists can see the full monthly view
INSERT INTO settings (key, value, description)
VALUES (
  'cash_receptionist_view_scope',
  '"monthly"',
  'How much of the cash register the receptionist can see: daily | weekly | monthly'
)
ON CONFLICT (key) WHERE branch_id IS NULL DO NOTHING;
