-- =============================================
-- MISSÃO ÉLUTA - Database Schema v1
-- =============================================

-- ===========================================
-- 1. ENUMS
-- ===========================================

-- Roles do sistema
CREATE TYPE public.app_role AS ENUM ('voluntario', 'coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin');

-- Status de missão
CREATE TYPE public.mission_status AS ENUM ('rascunho', 'publicada', 'em_andamento', 'enviada', 'validada', 'reprovada', 'concluida');

-- Tipos de missão
CREATE TYPE public.mission_type AS ENUM ('escuta', 'rua', 'mobilizacao', 'conteudo', 'dados', 'formacao');

-- Status de evidência
CREATE TYPE public.evidence_status AS ENUM ('pendente', 'aprovada', 'reprovada');

-- Disponibilidade
CREATE TYPE public.availability_type AS ENUM ('manha', 'tarde', 'noite', 'fim_de_semana', 'flexivel');

-- Interesse/função
CREATE TYPE public.interest_type AS ENUM ('rua', 'conteudo', 'escuta', 'dados', 'tech', 'formacao', 'juridico', 'logistica');

-- Status de onboarding
CREATE TYPE public.onboarding_status AS ENUM ('pendente', 'em_andamento', 'concluido');

-- ===========================================
-- 2. PROFILES TABLE
-- ===========================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    nickname TEXT,
    avatar_url TEXT,
    city TEXT,
    neighborhood TEXT,
    state TEXT,
    availability availability_type[] DEFAULT '{}',
    interests interest_type[] DEFAULT '{}',
    onboarding_status onboarding_status DEFAULT 'pendente',
    onboarding_completed_at TIMESTAMPTZ,
    lgpd_consent BOOLEAN DEFAULT false,
    lgpd_consent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- ===========================================
-- 3. USER ROLES TABLE (separate from profiles!)
-- ===========================================

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    cell_id UUID, -- will reference cells table
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role, cell_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Function to check if user has any coordinator role
CREATE OR REPLACE FUNCTION public.is_coordinator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
    )
$$;

CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- 4. CELLS (Núcleos/Bairros)
-- ===========================================

CREATE TABLE public.cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT,
    state TEXT NOT NULL,
    description TEXT,
    weekly_goal INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view cells
CREATE POLICY "Authenticated users can view cells"
    ON public.cells FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Coordinators can manage cells"
    ON public.cells FOR ALL
    TO authenticated
    USING (public.is_coordinator(auth.uid()));

-- ===========================================
-- 5. CELL MEMBERSHIPS
-- ===========================================

CREATE TABLE public.cell_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE (user_id, cell_id)
);

ALTER TABLE public.cell_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their memberships"
    ON public.cell_memberships FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can join cells"
    ON public.cell_memberships FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coordinators can view all memberships"
    ON public.cell_memberships FOR SELECT
    TO authenticated
    USING (public.is_coordinator(auth.uid()));

-- ===========================================
-- 6. MISSIONS
-- ===========================================

CREATE TABLE public.missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    type mission_type NOT NULL,
    status mission_status DEFAULT 'rascunho',
    cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requires_validation BOOLEAN DEFAULT false,
    deadline TIMESTAMPTZ,
    points INTEGER DEFAULT 1,
    is_first_mission BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Users can view missions assigned to them or their cell
CREATE POLICY "Users can view their missions"
    ON public.missions FOR SELECT
    TO authenticated
    USING (
        assigned_to = auth.uid() 
        OR cell_id IN (
            SELECT cell_id FROM public.cell_memberships WHERE user_id = auth.uid()
        )
        OR public.is_coordinator(auth.uid())
    );

CREATE POLICY "Users can update their assigned missions"
    ON public.missions FOR UPDATE
    TO authenticated
    USING (assigned_to = auth.uid() OR public.is_coordinator(auth.uid()));

CREATE POLICY "Coordinators can create missions"
    ON public.missions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_coordinator(auth.uid()) OR is_first_mission = true);

-- ===========================================
-- 7. EVIDENCES
-- ===========================================

CREATE TABLE public.evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'text', 'image', 'audio', 'video'
    content_text TEXT,
    content_url TEXT,
    status evidence_status DEFAULT 'pendente',
    validated_by UUID REFERENCES auth.users(id),
    validated_at TIMESTAMPTZ,
    rejection_reason TEXT,
    how_to_fix TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their evidences"
    ON public.evidences FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_coordinator(auth.uid()));

CREATE POLICY "Users can submit evidences"
    ON public.evidences FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coordinators can validate evidences"
    ON public.evidences FOR UPDATE
    TO authenticated
    USING (public.is_coordinator(auth.uid()));

-- ===========================================
-- 8. TRAINING TRACKS & COURSES
-- ===========================================

CREATE TABLE public.training_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    interest_type interest_type,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.training_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tracks"
    ON public.training_tracks FOR SELECT
    TO authenticated
    USING (true);

CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID REFERENCES public.training_tracks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    order_index INTEGER DEFAULT 0,
    unlocks_role app_role,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (true);

CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    video_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons"
    ON public.lessons FOR SELECT
    TO authenticated
    USING (true);

-- ===========================================
-- 9. USER PROGRESS & CERTIFICATES
-- ===========================================

CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ,
    quiz_score INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their progress"
    ON public.user_progress FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their progress"
    ON public.user_progress FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    certificate_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their certificates"
    ON public.certificates FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can earn certificates"
    ON public.certificates FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ===========================================
-- 10. SHARE LINKS
-- ===========================================

CREATE TABLE public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    share_type TEXT NOT NULL, -- 'mission', 'certificate', 'achievement'
    reference_id UUID NOT NULL,
    share_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    is_public BOOLEAN DEFAULT true,
    is_anonymous BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their share links"
    ON public.share_links FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Public can view active share links (for share pages)
CREATE POLICY "Public can view active shares"
    ON public.share_links FOR SELECT
    TO anon
    USING (is_public = true AND revoked_at IS NULL);

-- ===========================================
-- 11. AUDIT LOGS (Governança/LGPD)
-- ===========================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ===========================================
-- 12. FIRST MISSIONS TEMPLATES
-- ===========================================

CREATE TABLE public.first_mission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interest_type interest_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT NOT NULL,
    mission_type mission_type NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.first_mission_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view templates"
    ON public.first_mission_templates FOR SELECT
    TO authenticated
    USING (true);

-- ===========================================
-- 13. TRIGGERS & FUNCTIONS
-- ===========================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    -- Assign default role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'voluntario');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_cells_updated_at
    BEFORE UPDATE ON public.cells
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_missions_updated_at
    BEFORE UPDATE ON public.missions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_evidences_updated_at
    BEFORE UPDATE ON public.evidences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ===========================================
-- 14. SEED DATA - First Mission Templates
-- ===========================================

INSERT INTO public.first_mission_templates (interest_type, title, description, instructions, mission_type) VALUES
('rua', 'Primeira Panfletagem', 'Distribua 10 panfletos na sua vizinhança e registre a experiência.', '1. Pegue os panfletos digitais no app\n2. Imprima ou mostre no celular\n3. Converse com pelo menos 3 pessoas\n4. Tire uma foto do local e mande aqui', 'rua'),
('escuta', 'Primeira Escuta', 'Converse com um vizinho ou familiar sobre os problemas do bairro.', '1. Escolha alguém próximo\n2. Pergunte: "O que mais te preocupa hoje?"\n3. Escute com atenção\n4. Registre os principais pontos aqui', 'escuta'),
('conteudo', 'Primeiro Post', 'Crie seu primeiro conteúdo sobre uma causa que te mobiliza.', '1. Escolha um tema que te indigna\n2. Escreva 3 linhas sobre isso\n3. Use o template do app\n4. Compartilhe e cole o link aqui', 'conteudo'),
('dados', 'Primeiro Mapeamento', 'Mapeie 5 lideranças comunitárias do seu bairro.', '1. Pense em pessoas influentes no bairro\n2. Registre nome, contato e atuação\n3. Não precisa de dados sensíveis\n4. Envie a lista aqui', 'dados'),
('tech', 'Primeira Contribuição Tech', 'Identifique uma melhoria para o app e documente.', '1. Use o app por 10 minutos\n2. Anote bugs ou melhorias\n3. Descreva com detalhes\n4. Envie sua sugestão aqui', 'dados'),
('formacao', 'Primeiro Estudo', 'Complete a primeira aula de formação e faça o quiz.', '1. Acesse a trilha de Formação\n2. Assista a primeira aula\n3. Faça o quiz\n4. Tire print do resultado', 'formacao'),
('juridico', 'Primeira Orientação', 'Pesquise sobre um direito básico e compartilhe com alguém.', '1. Escolha um direito (moradia, saúde, trabalho)\n2. Pesquise o básico\n3. Explique para alguém\n4. Registre a conversa aqui', 'escuta'),
('logistica', 'Primeiro Inventário', 'Faça um inventário do que você pode contribuir para ações.', '1. Liste materiais que pode emprestar\n2. Liste habilidades práticas\n3. Indique sua disponibilidade\n4. Envie a lista aqui', 'dados');