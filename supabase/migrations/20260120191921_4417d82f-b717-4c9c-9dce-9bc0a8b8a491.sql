-- Update RLS policies to block PENDENTE users from accessing data

-- Missions: Only approved volunteers can read
DROP POLICY IF EXISTS "Volunteers can view published missions" ON public.missions;
CREATE POLICY "Approved volunteers can view published missions"
ON public.missions FOR SELECT
USING (
  public.is_approved_volunteer(auth.uid()) OR public.is_coordinator(auth.uid())
);

-- Evidences: Only approved volunteers can read/insert
DROP POLICY IF EXISTS "Users can view their own evidences" ON public.evidences;
CREATE POLICY "Approved users can view their own evidences"
ON public.evidences FOR SELECT
USING (
  (user_id = auth.uid() AND public.is_approved_volunteer(auth.uid()))
  OR public.is_coordinator(auth.uid())
);

DROP POLICY IF EXISTS "Users can insert their own evidences" ON public.evidences;
CREATE POLICY "Approved users can insert their own evidences"
ON public.evidences FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND public.is_approved_volunteer(auth.uid())
);

-- Demandas: Only approved volunteers can read/insert
DROP POLICY IF EXISTS "Users can view their own demandas" ON public.demandas;
CREATE POLICY "Approved users can view their own demandas"
ON public.demandas FOR SELECT
USING (
  (criada_por = auth.uid() AND public.is_approved_volunteer(auth.uid()))
  OR public.is_coordinator(auth.uid())
);

DROP POLICY IF EXISTS "Users can create demandas" ON public.demandas;
CREATE POLICY "Approved users can create demandas"
ON public.demandas FOR INSERT
WITH CHECK (
  criada_por = auth.uid() AND public.is_approved_volunteer(auth.uid())
);

-- Topicos: Only approved volunteers can read (using existing can_view_topico function)
DROP POLICY IF EXISTS "Users can view visible topicos" ON public.topicos;
CREATE POLICY "Approved users can view visible topicos"
ON public.topicos FOR SELECT
USING (
  public.is_approved_volunteer(auth.uid()) 
  AND public.can_view_topico(auth.uid(), escopo, celula_id, oculto)
);

DROP POLICY IF EXISTS "Approved users can create topicos" ON public.topicos;
CREATE POLICY "Approved users can create topicos"
ON public.topicos FOR INSERT
WITH CHECK (
  criado_por = auth.uid() AND public.is_approved_volunteer(auth.uid())
);

-- Posts: Only approved volunteers can read/insert
DROP POLICY IF EXISTS "Users can view visible posts" ON public.posts;
CREATE POLICY "Approved users can view visible posts"
ON public.posts FOR SELECT
USING (
  public.is_approved_volunteer(auth.uid()) OR public.is_coordinator(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can create posts" ON public.posts;
CREATE POLICY "Approved users can create posts"
ON public.posts FOR INSERT
WITH CHECK (
  autor_id = auth.uid() AND public.is_approved_volunteer(auth.uid())
);

-- Comentarios: Only approved volunteers can read/insert
DROP POLICY IF EXISTS "Users can view visible comentarios" ON public.comentarios;
CREATE POLICY "Approved users can view visible comentarios"
ON public.comentarios FOR SELECT
USING (
  public.is_approved_volunteer(auth.uid()) OR public.is_coordinator(auth.uid())
);

DROP POLICY IF EXISTS "Approved users can create comentarios" ON public.comentarios;
CREATE POLICY "Approved users can create comentarios"
ON public.comentarios FOR INSERT
WITH CHECK (
  autor_id = auth.uid() AND public.is_approved_volunteer(auth.uid())
);