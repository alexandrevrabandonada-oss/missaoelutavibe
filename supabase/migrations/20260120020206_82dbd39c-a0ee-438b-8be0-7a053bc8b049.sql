-- Create enums for demandas
CREATE TYPE public.demanda_tipo AS ENUM (
  'roda_conversa',
  'material',
  'duvida',
  'evento',
  'denuncia',
  'outro'
);

CREATE TYPE public.demanda_status AS ENUM (
  'nova',
  'triagem',
  'atribuida',
  'agendada',
  'concluida',
  'arquivada'
);

CREATE TYPE public.demanda_prioridade AS ENUM (
  'baixa',
  'media',
  'alta'
);

-- Create demandas table
CREATE TABLE public.demandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo public.demanda_tipo NOT NULL,
  descricao TEXT NOT NULL,
  territorio TEXT,
  contato TEXT,
  status public.demanda_status NOT NULL DEFAULT 'nova',
  prioridade public.demanda_prioridade NOT NULL DEFAULT 'media',
  criada_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  atribuida_para UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own demandas
CREATE POLICY "Users can view own demandas"
ON public.demandas
FOR SELECT
TO authenticated
USING (auth.uid() = criada_por);

-- Policy: Coordinators can view all demandas
CREATE POLICY "Coordinators can view all demandas"
ON public.demandas
FOR SELECT
TO authenticated
USING (public.is_coordinator(auth.uid()));

-- Policy: Users can create their own demandas
CREATE POLICY "Users can create own demandas"
ON public.demandas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = criada_por);

-- Policy: Users can update their own demandas
CREATE POLICY "Users can update own demandas"
ON public.demandas
FOR UPDATE
TO authenticated
USING (auth.uid() = criada_por)
WITH CHECK (auth.uid() = criada_por);

-- Policy: Coordinators can update any demanda
CREATE POLICY "Coordinators can update all demandas"
ON public.demandas
FOR UPDATE
TO authenticated
USING (public.is_coordinator(auth.uid()));

-- Policy: Coordinators can delete demandas
CREATE POLICY "Coordinators can delete demandas"
ON public.demandas
FOR DELETE
TO authenticated
USING (public.is_coordinator(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_demandas_updated_at
BEFORE UPDATE ON public.demandas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();