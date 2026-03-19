-- Deve ser executado no SQL Editor do Supabase
-- Corrige o problema de redirect pós-login adicionando a coluna volunteer_status

-- 1. Adicionar a coluna volunteer_status no profiles (se não existir)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS volunteer_status TEXT DEFAULT 'pendente';

-- 2. Setar o admin como 'ativo' (para que o redirect para /admin funcione)
UPDATE public.profiles
SET volunteer_status = 'ativo'
WHERE id IN (SELECT user_id FROM public.admins);

-- 3. Confirmar
SELECT id, full_name, volunteer_status FROM public.profiles;
