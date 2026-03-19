-- Add missing 'convertido' value to crm_contato_status enum
ALTER TYPE crm_contato_status ADD VALUE IF NOT EXISTS 'convertido';