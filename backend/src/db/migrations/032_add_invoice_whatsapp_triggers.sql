-- 032: Add invoice-related WhatsApp trigger types

ALTER TYPE whatsapp_trigger ADD VALUE IF NOT EXISTS 'invoice_generated';
ALTER TYPE whatsapp_trigger ADD VALUE IF NOT EXISTS 'invoice_paid';
ALTER TYPE whatsapp_trigger ADD VALUE IF NOT EXISTS 'invoice_overdue';
