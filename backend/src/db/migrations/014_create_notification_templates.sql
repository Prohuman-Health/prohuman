-- 014: notification templates (admin-editable)

CREATE TYPE notification_channel  AS ENUM ('email','sms','whatsapp','in_app');
CREATE TYPE notification_trigger  AS ENUM (
  'session_booked',
  'session_reminder_24h',
  'session_reminder_1h',
  'session_cancelled',
  'session_rescheduled',
  'waitlist_slot_available',
  'session_assigned_doctor',
  'form_pending_completion',
  'invoice_generated',
  'consent_form_request'
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger     notification_trigger NOT NULL,
  channel     notification_channel NOT NULL,
  subject     VARCHAR(255),          -- for email
  body        TEXT NOT NULL,         -- supports {{placeholders}}
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trigger, channel)
);

-- Available placeholders documented in body comments:
-- {{patient_name}}, {{doctor_name}}, {{session_date}}, {{session_time}},
-- {{session_type}}, {{branch_name}}, {{clinic_name}}, {{cancel_reason}}

INSERT INTO notification_templates (trigger, channel, subject, body) VALUES
  ('session_booked',         'email',    'Your appointment is confirmed',
   'Hi {{patient_name}}, your {{session_type}} with {{doctor_name}} is confirmed for {{session_date}} at {{session_time}} at {{branch_name}}.'),
  ('session_reminder_24h',   'sms',      NULL,
   'Reminder: You have a {{session_type}} appointment tomorrow at {{session_time}} with {{doctor_name}}.'),
  ('session_reminder_1h',    'sms',      NULL,
   'Reminder: Your appointment starts in 1 hour at {{session_time}}. See you at {{branch_name}}!'),
  ('session_cancelled',      'email',    'Your appointment has been cancelled',
   'Hi {{patient_name}}, your {{session_type}} on {{session_date}} has been cancelled.'),
  ('waitlist_slot_available','sms',      NULL,
   'Great news! A slot opened up for {{session_type}} on {{session_date}} at {{session_time}}. Reply YES to confirm within 2 hours.'),
  ('session_assigned_doctor','in_app',   NULL,
   'You have a new session: {{patient_name}} — {{session_type}} on {{session_date}} at {{session_time}}.'),
  ('form_pending_completion','in_app',   NULL,
   'Clinical form pending for {{patient_name}} ({{session_type}}, {{session_date}}).'),
  ('invoice_generated',      'email',    'Invoice from {{clinic_name}}',
   'Hi {{patient_name}}, your invoice for {{session_type}} on {{session_date}} is ready. Amount: {{amount}}.'),
  ('consent_form_request',   'email',    'Please complete your consent form',
   'Hi {{patient_name}}, please complete your consent form before your first visit: {{consent_link}}')
ON CONFLICT DO NOTHING;
