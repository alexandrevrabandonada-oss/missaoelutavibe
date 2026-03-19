-- Create function to update updated_at if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Create enums for anuncios
CREATE TYPE public.anuncio_escopo AS ENUM ('GLOBAL', 'REGIAO', 'CIDADE', 'CELULA');
CREATE TYPE public.anuncio_status AS ENUM ('RASCUNHO', 'PUBLICADO', 'ARQUIVADO');

-- Create anuncios table
CREATE TABLE public.anuncios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  texto text NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  escopo public.anuncio_escopo NOT NULL DEFAULT 'GLOBAL',
  regiao text,
  cidade text,
  celula_id uuid REFERENCES public.cells(id),
  status public.anuncio_status NOT NULL DEFAULT 'RASCUNHO',
  criado_por uuid NOT NULL,
  publicado_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create anuncios_lidos table
CREATE TABLE public.anuncios_lidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anuncio_id uuid NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  lido_em timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(anuncio_id, user_id)
);

-- Create indexes
CREATE INDEX idx_anuncios_status ON public.anuncios(status);
CREATE INDEX idx_anuncios_escopo ON public.anuncios(escopo);
CREATE INDEX idx_anuncios_publicado_em ON public.anuncios(publicado_em DESC);
CREATE INDEX idx_anuncios_lidos_user ON public.anuncios_lidos(user_id);
CREATE INDEX idx_anuncios_lidos_anuncio ON public.anuncios_lidos(anuncio_id);

-- Trigger to update updated_at on anuncios
CREATE TRIGGER update_anuncios_updated_at
BEFORE UPDATE ON public.anuncios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user can view an announcement based on scope
CREATE OR REPLACE FUNCTION public.can_view_anuncio(
  _user_id uuid,
  _escopo public.anuncio_escopo,
  _regiao text,
  _cidade text,
  _celula_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_cidade text;
  _user_state text;
  _user_cell_ids uuid[];
BEGIN
  -- GLOBAL announcements are visible to everyone
  IF _escopo = 'GLOBAL' THEN
    RETURN true;
  END IF;

  -- Get user profile info
  SELECT city, state INTO _user_cidade, _user_state
  FROM public.profiles
  WHERE id = _user_id;

  -- Get user cell memberships
  SELECT array_agg(cell_id) INTO _user_cell_ids
  FROM public.cell_memberships
  WHERE user_id = _user_id AND is_active = true;

  -- Check CIDADE scope
  IF _escopo = 'CIDADE' THEN
    RETURN _user_cidade = _cidade;
  END IF;

  -- Check REGIAO scope (using state as region)
  IF _escopo = 'REGIAO' THEN
    RETURN _user_state = _regiao;
  END IF;

  -- Check CELULA scope
  IF _escopo = 'CELULA' THEN
    RETURN _celula_id = ANY(_user_cell_ids);
  END IF;

  RETURN false;
END;
$$;

-- Function to get unread announcements count for a user
CREATE OR REPLACE FUNCTION public.get_unread_anuncios_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.anuncios a
  WHERE a.status = 'PUBLICADO'
    AND a.publicado_em >= (now() - interval '7 days')
    AND can_view_anuncio(_user_id, a.escopo, a.regiao, a.cidade, a.celula_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.anuncios_lidos al
      WHERE al.anuncio_id = a.id AND al.user_id = _user_id
    );
$$;

-- Enable RLS
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios_lidos ENABLE ROW LEVEL SECURITY;

-- RLS policies for anuncios

-- Approved volunteers can view published announcements within their scope
CREATE POLICY "Approved users can view published announcements"
ON public.anuncios
FOR SELECT
USING (
  status = 'PUBLICADO'
  AND is_approved_volunteer(auth.uid())
  AND can_view_anuncio(auth.uid(), escopo, regiao, cidade, celula_id)
);

-- Coordinators can view all announcements (for management)
CREATE POLICY "Coordinators can view all announcements"
ON public.anuncios
FOR SELECT
USING (is_coordinator(auth.uid()));

-- Coordinators can create announcements
CREATE POLICY "Coordinators can create announcements"
ON public.anuncios
FOR INSERT
WITH CHECK (
  is_coordinator(auth.uid())
  AND criado_por = auth.uid()
);

-- Coordinators can update announcements they created or within their scope
CREATE POLICY "Coordinators can update announcements"
ON public.anuncios
FOR UPDATE
USING (is_coordinator(auth.uid()))
WITH CHECK (is_coordinator(auth.uid()));

-- Admins can delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.anuncios
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for anuncios_lidos

-- Users can view their own read records
CREATE POLICY "Users can view own read records"
ON public.anuncios_lidos
FOR SELECT
USING (user_id = auth.uid());

-- Users can mark announcements as read
CREATE POLICY "Users can mark announcements as read"
ON public.anuncios_lidos
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND is_approved_volunteer(auth.uid())
);

-- Coordinators can view all read records (for metrics)
CREATE POLICY "Coordinators can view all read records"
ON public.anuncios_lidos
FOR SELECT
USING (is_coordinator(auth.uid()));