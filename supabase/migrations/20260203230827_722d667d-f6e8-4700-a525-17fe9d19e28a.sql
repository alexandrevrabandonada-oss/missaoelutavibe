-- Add missing values to crm_contato_status enum
ALTER TYPE crm_contato_status ADD VALUE IF NOT EXISTS 'reagendado';
ALTER TYPE crm_contato_status ADD VALUE IF NOT EXISTS 'perdido';