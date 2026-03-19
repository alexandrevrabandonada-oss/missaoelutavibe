-- Fix search_path for the helper function
CREATE OR REPLACE FUNCTION public.get_return_reminder_message(_first_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT format(
    'Oi %s! 👋 Tudo bem? Sem pressão, mas queria lembrar que tem algumas ações esperando por você. Que tal fazer só 30 segundos hoje? Qualquer coisa, me chama!',
    _first_name
  );
$$;