-- 017: whatsapp message directory

CREATE TYPE whatsapp_trigger AS ENUM (
  'registration',
  'appointment_confirmed',
  'appointment_reminder_24h',
  'appointment_reminder_1h',
  'post_session_exercises',
  'follow_up_weekly',
  'follow_up_biweekly',
  'follow_up_monthly',
  'follow_up_quarterly',
  'payment_pending',
  'no_show',
  'cancellation',
  'rescheduled',
  'milestone_5_sessions',
  'milestone_10_sessions',
  'compliance_low',
  'satisfaction_survey',
  'seasonal_greeting',
  'referral_incentive',
  'points_redeemable',
  'high_risk_alert',
  'insurance_update'
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger     whatsapp_trigger NOT NULL UNIQUE,
  name        VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,         -- supports {{patient_name}}, {{date}}, {{time}}, {{doctor_name}}, {{location}}, {{exercises}}, {{points}}, {{amount}}
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default templates
INSERT INTO whatsapp_templates (trigger, name, body) VALUES
  ('registration',              'Welcome Message',              'Hi {{patient_name}}! 👋 Welcome to ProHuman Health! We''re located at {{branch_address}}. Our sessions start at ₹{{session_fee}}. Feel free to call us at {{clinic_phone}} for any queries. Looking forward to seeing you!'),
  ('appointment_confirmed',     'Appointment Confirmation',     'Hi {{patient_name}}, your {{session_type}} appointment with {{doctor_name}} is confirmed for {{date}} at {{time}} at {{branch_name}}. Please arrive 10 minutes early. See you soon! 🏥'),
  ('appointment_reminder_24h',  '24-Hour Reminder',             'Reminder 🔔: You have a {{session_type}} appointment tomorrow ({{date}}) at {{time}} with {{doctor_name}} at {{branch_name}}. Reply CANCEL if you need to reschedule.'),
  ('appointment_reminder_1h',   '1-Hour Reminder',              'Your appointment starts in 1 hour at {{time}}! See you at {{branch_name}}. 🕐'),
  ('post_session_exercises',    'Post-Session Exercises',       'Great session today, {{patient_name}}! 💪 Here are your home exercises:\n{{exercises}}\nConsistency is key — aim to do these daily. Any questions? Reply here!'),
  ('follow_up_weekly',          'Weekly Follow-Up (0-1 Month)', 'Hi {{patient_name}}, checking in on your progress this week! How are you feeling? Are you keeping up with your exercises? Let us know if you need any support. 😊'),
  ('follow_up_biweekly',        'Bi-Weekly Follow-Up (1-2 Mo)', 'Hi {{patient_name}}! It''s been a couple of weeks — how''s your recovery going? Remember, consistent exercise is the key to long-term results. Reply if you have any concerns! 💙'),
  ('follow_up_monthly',         'Monthly Follow-Up (2-3 Mo)',   'Hi {{patient_name}}, hope you''re continuing to progress well! 🌟 It might be a good time to book a re-evaluation. Reply to schedule or call us at {{clinic_phone}}.'),
  ('follow_up_quarterly',       'Quarterly Follow-Up (3+ Mo)',  'Hi {{patient_name}}, it''s been a while! 👋 We hope you''re doing great. We have some new wellness programs you might be interested in. Book a check-up — reply to find out more!'),
  ('payment_pending',           'Payment Reminder',             'Hi {{patient_name}}, a payment of ₹{{amount}} for your session on {{date}} is still pending. Please complete payment at your convenience. Need help? Call us at {{clinic_phone}}. Thank you!'),
  ('no_show',                   'Missed Appointment',           'Hi {{patient_name}}, we missed you today! 😊 No worries — life happens. Would you like to reschedule? Reply YES and we''ll find a time that works. Here are some available slots: {{slots}}'),
  ('cancellation',              'Cancellation Acknowledgement', 'Hi {{patient_name}}, we''ve received your cancellation for {{date}} at {{time}}. When you''re ready to book again, we''re here for you! Reply or call {{clinic_phone}}.'),
  ('rescheduled',               'Reschedule Confirmation',      'Hi {{patient_name}}, your appointment has been rescheduled to {{new_date}} at {{new_time}} with {{doctor_name}} at {{branch_name}}. See you then! 📅'),
  ('milestone_5_sessions',      '5-Session Milestone',          'Congratulations {{patient_name}}! 🎉 You''ve completed 5 sessions — that''s a huge milestone! Your consistency is paying off. Keep up the amazing work!'),
  ('milestone_10_sessions',     '10-Session Milestone',         '10 sessions done, {{patient_name}}! 🏆 You''re an absolute rockstar. Thank you for trusting us with your health journey. Here''s what''s next: {{next_steps}}'),
  ('compliance_low',            'Low Exercise Compliance',      'Hi {{patient_name}}, we noticed your exercise compliance has been a bit low lately. We totally understand life gets busy! 💪 Would you like to chat about adjusting your routine? Reply and we''ll help!'),
  ('satisfaction_survey',       'Satisfaction Survey',          'Hi {{patient_name}}, we''d love to hear about your experience! 😊 Please take 2 minutes to fill out our feedback form: {{survey_link}} Your input helps us improve!'),
  ('seasonal_greeting',         'Seasonal Greeting',            'Hi {{patient_name}}! 🎊 Warm wishes from the ProHuman Health team this {{occasion}}! Remember, your health is your greatest asset. Stay active and stay well!'),
  ('referral_incentive',        'Referral Incentive',           'Great news {{patient_name}}! 🎁 Your friend has started treatment with us. As a thank-you for the referral, you''ve earned {{points}} reward points towards a free session! Keep referring and keep earning!'),
  ('points_redeemable',         'Points Redeemable Reminder',   'Hi {{patient_name}}, you''ve accumulated {{points}} reward points — enough for a free session! 🎉 Book your next appointment and mention your points at reception. See you soon!'),
  ('high_risk_alert',           'High-Risk Patient Alert',      'Hi {{patient_name}}, we''re concerned about the symptoms you mentioned. Please stop exercises immediately and contact us at {{clinic_phone}} for an urgent consultation. Your health is our priority! 🏥'),
  ('insurance_update',          'Insurance / Payment Update',   'Hi {{patient_name}}, there''s an update regarding your insurance/payment for {{date}}. {{update_details}}. For assistance, call us at {{clinic_phone}}.')
ON CONFLICT (trigger) DO NOTHING;
