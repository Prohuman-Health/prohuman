-- 026_create_in_app_notifications.sql
-- In-app notification feed for the admin dashboard topbar
-- type values:
--   appointment_request  → mail inbox (patient requested a slot via waitlist)
--   session_completed    → notifications bell
--   session_no_show      → notifications bell
--   session_cancelled    → notifications bell
--   session_late_cancel  → notifications bell
--   session_scheduled    → notifications bell

CREATE TABLE IF NOT EXISTS in_app_notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type       VARCHAR(60) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    metadata   JSONB       NOT NULL DEFAULT '{}',
    branch_id  UUID        REFERENCES branches(id) ON DELETE SET NULL,
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inapp_notif_created  ON in_app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inapp_notif_is_read  ON in_app_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_inapp_notif_type     ON in_app_notifications(type);
