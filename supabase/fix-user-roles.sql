-- Adicionar coluna revoked_at na tabela user_roles (necessária para o hook useUserRoles)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ DEFAULT NULL;

-- Adicionar outras colunas que o hook useUserRoles espera, se não existirem
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS cidade TEXT DEFAULT NULL;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS regiao TEXT DEFAULT NULL;

-- Confirmar
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_roles'
ORDER BY ordinal_position;
