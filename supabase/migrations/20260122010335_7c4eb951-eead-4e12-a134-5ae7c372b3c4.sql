-- Step 1: Add scope and tracking columns to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS regiao text,
ADD COLUMN IF NOT EXISTS created_by uuid,
ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
ADD COLUMN IF NOT EXISTS revoked_by uuid,
ADD COLUMN IF NOT EXISTS reason text;

-- Create indexes for efficient scope queries
CREATE INDEX IF NOT EXISTS idx_user_roles_cidade ON public.user_roles(cidade) WHERE cidade IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_regiao ON public.user_roles(regiao) WHERE regiao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id, role) WHERE revoked_at IS NULL;