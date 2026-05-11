-- 040: internal staff messaging
-- Channels (group or direct), members, messages, per-member read positions

CREATE TABLE IF NOT EXISTS staff_channels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(80),                          -- null for DMs
  description VARCHAR(200),
  type        VARCHAR(10) NOT NULL DEFAULT 'group'  -- 'group' | 'direct'
                CHECK (type IN ('group', 'direct')),
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_channel_members (
  channel_id  UUID NOT NULL REFERENCES staff_channels(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES staff(id)          ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,                               -- for unread badge
  PRIMARY KEY (channel_id, staff_id)
);

CREATE TABLE IF NOT EXISTS staff_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID        NOT NULL REFERENCES staff_channels(id) ON DELETE CASCADE,
  sender_id   UUID        REFERENCES staff(id) ON DELETE SET NULL,
  sender_name VARCHAR(120),                              -- snapshot
  body        TEXT        NOT NULL,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_msg_channel   ON staff_messages(channel_id, created_at DESC);
CREATE INDEX idx_staff_msg_sender    ON staff_messages(sender_id);
CREATE INDEX idx_staff_chan_members  ON staff_channel_members(staff_id);

-- Seed default group channels
INSERT INTO staff_channels (name, description, type) VALUES
  ('General',        'Clinic-wide announcements and chat',    'group'),
  ('Receptionist',   'Front desk team',                       'group'),
  ('Physiotherapists','Clinical team discussions',            'group'),
  ('Admin',          'Administrative and management chat',    'group')
ON CONFLICT DO NOTHING;
