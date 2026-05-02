-- 031: whatsapp_notification_rules
-- Each rule = one trigger event → one template → set of recipients
-- recipients JSONB: [{type:"patient"},{type:"doctor"},{type:"custom",phone:"+91...",label:"Reception"}]
-- conditions JSONB: {session_type_ids?:string[], branch_ids?:string[]}

CREATE TABLE IF NOT EXISTS whatsapp_notification_rules (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    trigger         whatsapp_trigger NOT NULL,
    template_id     UUID        NOT NULL REFERENCES whatsapp_templates(id) ON DELETE CASCADE,
    recipients      JSONB       NOT NULL DEFAULT '[]',
    delay_minutes   INTEGER     NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
    is_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
    conditions      JSONB       NOT NULL DEFAULT '{}',
    created_by      UUID        REFERENCES staff(id) ON DELETE SET NULL,
    updated_by      UUID        REFERENCES staff(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_rules_trigger ON whatsapp_notification_rules(trigger);
CREATE INDEX IF NOT EXISTS idx_wa_rules_enabled ON whatsapp_notification_rules(is_enabled);
