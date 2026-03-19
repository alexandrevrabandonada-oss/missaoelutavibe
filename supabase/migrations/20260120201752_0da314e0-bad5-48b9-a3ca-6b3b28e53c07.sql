-- Enums para nível e status
CREATE TYPE public.curso_nivel AS ENUM ('INTRO', 'BASICO', 'INTERMEDIARIO');
CREATE TYPE public.conteudo_status AS ENUM ('RASCUNHO', 'PUBLICADO');

-- Tabela de cursos
CREATE TABLE public.cursos_formacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  tags TEXT[] DEFAULT '{}',
  nivel curso_nivel NOT NULL DEFAULT 'INTRO',
  status conteudo_status NOT NULL DEFAULT 'RASCUNHO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de aulas
CREATE TABLE public.aulas_formacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID NOT NULL REFERENCES public.cursos_formacao(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo_texto TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  status conteudo_status NOT NULL DEFAULT 'RASCUNHO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relação aula-materiais (reutiliza materiais_base)
CREATE TABLE public.aula_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES public.aulas_formacao(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materiais_base(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(aula_id, material_id)
);

-- Perguntas do quiz
CREATE TABLE public.quiz_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES public.aulas_formacao(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  explicacao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Opções de resposta
CREATE TABLE public.quiz_opcoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta_id UUID NOT NULL REFERENCES public.quiz_perguntas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  correta BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0
);

-- Tentativas do quiz por usuário
CREATE TABLE public.quiz_tentativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES public.aulas_formacao(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nota INTEGER NOT NULL CHECK (nota >= 0 AND nota <= 100),
  aprovado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cursos_formacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas_formacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_opcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_tentativas ENABLE ROW LEVEL SECURITY;

-- RLS: cursos_formacao
CREATE POLICY "Approved users can view published courses"
ON public.cursos_formacao FOR SELECT
USING (
  (status = 'PUBLICADO' AND public.is_approved_volunteer(auth.uid()))
  OR public.is_coordinator(auth.uid())
);

CREATE POLICY "Coordinators can manage courses"
ON public.cursos_formacao FOR ALL
USING (public.is_coordinator(auth.uid()));

-- RLS: aulas_formacao
CREATE POLICY "Approved users can view published lessons"
ON public.aulas_formacao FOR SELECT
USING (
  (status = 'PUBLICADO' AND public.is_approved_volunteer(auth.uid()))
  OR public.is_coordinator(auth.uid())
);

CREATE POLICY "Coordinators can manage lessons"
ON public.aulas_formacao FOR ALL
USING (public.is_coordinator(auth.uid()));

-- RLS: aula_materiais
CREATE POLICY "Approved users can view lesson materials"
ON public.aula_materiais FOR SELECT
USING (
  public.is_approved_volunteer(auth.uid())
  OR public.is_coordinator(auth.uid())
);

CREATE POLICY "Coordinators can manage lesson materials"
ON public.aula_materiais FOR ALL
USING (public.is_coordinator(auth.uid()));

-- RLS: quiz_perguntas
CREATE POLICY "Approved users can view questions"
ON public.quiz_perguntas FOR SELECT
USING (
  public.is_approved_volunteer(auth.uid())
  OR public.is_coordinator(auth.uid())
);

CREATE POLICY "Coordinators can manage questions"
ON public.quiz_perguntas FOR ALL
USING (public.is_coordinator(auth.uid()));

-- RLS: quiz_opcoes
CREATE POLICY "Approved users can view options"
ON public.quiz_opcoes FOR SELECT
USING (
  public.is_approved_volunteer(auth.uid())
  OR public.is_coordinator(auth.uid())
);

CREATE POLICY "Coordinators can manage options"
ON public.quiz_opcoes FOR ALL
USING (public.is_coordinator(auth.uid()));

-- RLS: quiz_tentativas
CREATE POLICY "Users can view their own attempts"
ON public.quiz_tentativas FOR SELECT
USING (
  (user_id = auth.uid() AND public.is_approved_volunteer(auth.uid()))
  OR public.is_coordinator(auth.uid())
);

CREATE POLICY "Approved users can submit attempts"
ON public.quiz_tentativas FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND public.is_approved_volunteer(auth.uid())
);

CREATE POLICY "Coordinators can view all attempts"
ON public.quiz_tentativas FOR SELECT
USING (public.is_coordinator(auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_cursos_formacao_updated_at
  BEFORE UPDATE ON public.cursos_formacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_aulas_formacao_updated_at
  BEFORE UPDATE ON public.aulas_formacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Índices para performance
CREATE INDEX idx_aulas_formacao_curso_id ON public.aulas_formacao(curso_id);
CREATE INDEX idx_aula_materiais_aula_id ON public.aula_materiais(aula_id);
CREATE INDEX idx_quiz_perguntas_aula_id ON public.quiz_perguntas(aula_id);
CREATE INDEX idx_quiz_opcoes_pergunta_id ON public.quiz_opcoes(pergunta_id);
CREATE INDEX idx_quiz_tentativas_aula_user ON public.quiz_tentativas(aula_id, user_id);