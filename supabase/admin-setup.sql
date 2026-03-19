-- SCRIPT DE SETUP PARA ADMINISTRADOR MASTER
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard/project/_/sql)

-- 1. Definir credenciais (ALTERE A SENHA SE DESEJAR)
DO $$
DECLARE
  _email TEXT := 'admin@missaoeluta.sh';
  _password TEXT := 'Luta@2026!Admin'; -- Troque aqui
  _name TEXT := 'Admin Master';
  _user_id UUID;
BEGIN
  -- 2. Verificar se o usuário já existe, senão criar
  SELECT id INTO _user_id FROM auth.users WHERE email = _email;

  IF _user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      _email,
      crypt(_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      format('{"full_name":"%s"}', _name)::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO _user_id;
  END IF;

  -- 3. Garantir que as tabelas básicas existem (Caso as migrations não tenham sido rodadas)
  CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT,
      onboarding_status TEXT DEFAULT 'pendente',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      cell_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, role, cell_id)
  );

  CREATE TABLE IF NOT EXISTS public.admins (
      user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at timestamp with time zone DEFAULT now() NOT NULL
  );

  -- 4. Inserir Profile
  INSERT INTO public.profiles (id, full_name, onboarding_status)
  VALUES (_user_id, _name, 'concluido')
  ON CONFLICT (id) DO UPDATE SET full_name = _name;

  -- 5. Atribuir role de admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role, cell_id) DO NOTHING;

  -- 6. Inserir na tabela de admins master
  INSERT INTO public.admins (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Admin Master criado com sucesso: %', _email;
END $$;
