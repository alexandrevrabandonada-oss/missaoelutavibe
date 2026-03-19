-- Create table for cell assignment requests
CREATE TABLE public.cell_assignment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cidades(id) ON DELETE CASCADE,
  bairro TEXT,
  disponibilidade TEXT,
  interesses TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  assigned_cell_id UUID REFERENCES public.cells(id),
  notes TEXT,
  UNIQUE(profile_id, city_id, status)
);

-- Enable RLS
ALTER TABLE public.cell_assignment_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.cell_assignment_requests
FOR SELECT
USING (auth.uid() = profile_id);

-- Users can create their own requests
CREATE POLICY "Users can create own requests"
ON public.cell_assignment_requests
FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- Admins and coordinators can view all requests
CREATE POLICY "Coordinators can view requests"
ON public.cell_assignment_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'coordenador_regional', 'coordenador_estadual')
  )
);

-- Admins can update requests
CREATE POLICY "Admins can update requests"
ON public.cell_assignment_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'coordenador_regional', 'coordenador_estadual')
  )
);

-- Add index for faster lookups
CREATE INDEX idx_cell_assignment_requests_city ON public.cell_assignment_requests(city_id);
CREATE INDEX idx_cell_assignment_requests_status ON public.cell_assignment_requests(status);

-- Add trigger for updated_at
CREATE TRIGGER update_cell_assignment_requests_updated_at
BEFORE UPDATE ON public.cell_assignment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();