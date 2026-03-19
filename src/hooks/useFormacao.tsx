import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

// Types based on the new tables
export type CursoNivel = "INTRO" | "BASICO" | "INTERMEDIARIO";
export type ConteudoStatus = "RASCUNHO" | "PUBLICADO";

export interface Curso {
  id: string;
  titulo: string;
  descricao: string | null;
  tags: string[];
  nivel: CursoNivel;
  status: ConteudoStatus;
  recomendado: boolean;
  estimativa_min: number | null;
  created_at: string;
  updated_at: string;
}

export interface Aula {
  id: string;
  curso_id: string;
  titulo: string;
  conteudo_texto: string | null;
  ordem: number;
  status: ConteudoStatus;
  created_at: string;
  updated_at: string;
}

export interface AulaMaterial {
  id: string;
  aula_id: string;
  material_id: string;
  created_at: string;
  material?: {
    id: string;
    titulo: string;
    categoria: string;
    formato: string;
    arquivo_url: string | null;
    legenda_pronta: string | null;
  };
}

export interface QuizPergunta {
  id: string;
  aula_id: string;
  enunciado: string;
  explicacao: string | null;
  ordem: number;
  created_at: string;
  opcoes?: QuizOpcao[];
}

export interface QuizOpcao {
  id: string;
  pergunta_id: string;
  texto: string;
  correta: boolean;
  ordem: number;
}

export interface QuizTentativa {
  id: string;
  aula_id: string;
  user_id: string;
  nota: number;
  aprovado: boolean;
  created_at: string;
}

const NIVEL_LABELS: Record<CursoNivel, string> = {
  INTRO: "Introdutório",
  BASICO: "Básico",
  INTERMEDIARIO: "Intermediário",
};

export function getNivelLabel(nivel: CursoNivel): string {
  return NIVEL_LABELS[nivel] || nivel;
}

export function useFormacao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all courses
  const {
    data: cursos = [],
    isLoading: cursosLoading,
    refetch: refetchCursos,
  } = useQuery({
    queryKey: ["cursos_formacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos_formacao")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Curso[];
    },
    enabled: !!user,
  });

  // Fetch user's quiz attempts for progress calculation
  const { data: tentativas = [] } = useQuery({
    queryKey: ["quiz_tentativas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("quiz_tentativas")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []) as QuizTentativa[];
    },
    enabled: !!user,
  });

  // Calculate progress for a course
  const getCursoProgress = async (cursoId: string): Promise<number> => {
    if (!user) return 0;

    // Get all published lessons for this course
    const { data: aulas, error: aulasError } = await supabase
      .from("aulas_formacao")
      .select("id")
      .eq("curso_id", cursoId)
      .eq("status", "PUBLICADO");

    if (aulasError || !aulas || aulas.length === 0) return 0;

    // Get approved attempts for these lessons
    const aulaIds = aulas.map((a) => a.id);
    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_tentativas")
      .select("aula_id")
      .eq("user_id", user.id)
      .eq("aprovado", true)
      .in("aula_id", aulaIds);

    if (attemptsError) return 0;

    const completedAulas = new Set(attempts?.map((a) => a.aula_id) || []);
    return Math.round((completedAulas.size / aulas.length) * 100);
  };

  // Create course
  const createCurso = useMutation({
    mutationFn: async (data: Omit<Curso, "id" | "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("cursos_formacao")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cursos_formacao"] });
      toast.success("Curso criado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar curso: " + error.message);
    },
  });

  // Update course
  const updateCurso = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Curso> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("cursos_formacao")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cursos_formacao"] });
      toast.success("Curso atualizado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar curso: " + error.message);
    },
  });

  // Delete course
  const deleteCurso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cursos_formacao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cursos_formacao"] });
      toast.success("Curso excluído!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir curso: " + error.message);
    },
  });

  return {
    cursos,
    cursosLoading,
    refetchCursos,
    tentativas,
    getCursoProgress,
    createCurso,
    updateCurso,
    deleteCurso,
  };
}

// Hook for single course with lessons
export function useCursoDetalhe(cursoId: string | undefined) {
  const { user } = useAuth();

  const { data: curso, isLoading: cursoLoading } = useQuery({
    queryKey: ["curso_formacao", cursoId],
    queryFn: async () => {
      if (!cursoId) return null;
      const { data, error } = await supabase
        .from("cursos_formacao")
        .select("*")
        .eq("id", cursoId)
        .single();

      if (error) throw error;
      return data as Curso;
    },
    enabled: !!cursoId && !!user,
  });

  const { data: aulas = [], isLoading: aulasLoading } = useQuery({
    queryKey: ["aulas_formacao", cursoId],
    queryFn: async () => {
      if (!cursoId) return [];
      const { data, error } = await supabase
        .from("aulas_formacao")
        .select("*")
        .eq("curso_id", cursoId)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return (data || []) as Aula[];
    },
    enabled: !!cursoId && !!user,
  });

  // Get user's completed lessons for this course
  const { data: completedAulaIds = [] } = useQuery({
    queryKey: ["completed_aulas", cursoId, user?.id],
    queryFn: async () => {
      if (!cursoId || !user) return [];
      const aulaIds = aulas.map((a) => a.id);
      if (aulaIds.length === 0) return [];

      const { data, error } = await supabase
        .from("quiz_tentativas")
        .select("aula_id")
        .eq("user_id", user.id)
        .eq("aprovado", true)
        .in("aula_id", aulaIds);

      if (error) return [];
      return data?.map((t) => t.aula_id) || [];
    },
    enabled: !!cursoId && !!user && aulas.length > 0,
  });

  return {
    curso,
    cursoLoading,
    aulas,
    aulasLoading,
    completedAulaIds,
    isLoading: cursoLoading || aulasLoading,
  };
}

// Hook for single lesson with materials and quiz
export function useAulaDetalhe(aulaId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: aula, isLoading: aulaLoading } = useQuery({
    queryKey: ["aula_formacao", aulaId],
    queryFn: async () => {
      if (!aulaId) return null;
      const { data, error } = await supabase
        .from("aulas_formacao")
        .select("*")
        .eq("id", aulaId)
        .single();

      if (error) throw error;
      return data as Aula;
    },
    enabled: !!aulaId && !!user,
  });

  // Fetch materials linked to this lesson
  const { data: materiais = [], isLoading: materiaisLoading } = useQuery({
    queryKey: ["aula_materiais", aulaId],
    queryFn: async () => {
      if (!aulaId) return [];
      const { data, error } = await supabase
        .from("aula_materiais")
        .select(`
          id,
          aula_id,
          material_id,
          created_at,
          material:materiais_base (
            id,
            titulo,
            categoria,
            formato,
            arquivo_url,
            legenda_pronta
          )
        `)
        .eq("aula_id", aulaId);

      if (error) throw error;
      return (data || []) as AulaMaterial[];
    },
    enabled: !!aulaId && !!user,
  });

  // Fetch quiz questions with options
  const { data: perguntas = [], isLoading: perguntasLoading } = useQuery({
    queryKey: ["quiz_perguntas", aulaId],
    queryFn: async () => {
      if (!aulaId) return [];
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_perguntas")
        .select("*")
        .eq("aula_id", aulaId)
        .order("ordem", { ascending: true });

      if (questionsError) throw questionsError;

      // Fetch options for each question
      const questionsWithOptions = await Promise.all(
        (questionsData || []).map(async (pergunta) => {
          const { data: opcoes, error: opcoesError } = await supabase
            .from("quiz_opcoes")
            .select("*")
            .eq("pergunta_id", pergunta.id)
            .order("ordem", { ascending: true });

          if (opcoesError) throw opcoesError;
          return { ...pergunta, opcoes: opcoes || [] } as QuizPergunta;
        })
      );

      return questionsWithOptions;
    },
    enabled: !!aulaId && !!user,
  });

  // Check if user has completed this lesson
  const { data: tentativaAprovada } = useQuery({
    queryKey: ["tentativa_aprovada", aulaId, user?.id],
    queryFn: async () => {
      if (!aulaId || !user) return null;
      const { data, error } = await supabase
        .from("quiz_tentativas")
        .select("*")
        .eq("aula_id", aulaId)
        .eq("user_id", user.id)
        .eq("aprovado", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data as QuizTentativa | null;
    },
    enabled: !!aulaId && !!user,
  });

  // Submit quiz attempt
  const submitQuiz = useMutation({
    mutationFn: async (respostas: Record<string, string>) => {
      if (!aulaId || !user) throw new Error("Dados inválidos");

      // Calculate score
      let corretas = 0;
      const total = perguntas.length;

      for (const pergunta of perguntas) {
        const respostaId = respostas[pergunta.id];
        const opcaoCorreta = pergunta.opcoes?.find((o) => o.correta);
        if (opcaoCorreta && opcaoCorreta.id === respostaId) {
          corretas++;
        }
      }

      const nota = Math.round((corretas / total) * 100);
      const aprovado = nota >= 70;

      // Save attempt
      const { data, error } = await supabase
        .from("quiz_tentativas")
        .insert({
          aula_id: aulaId,
          user_id: user.id,
          nota,
          aprovado,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, corretas, total } as QuizTentativa & { corretas: number; total: number };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tentativa_aprovada", aulaId] });
      queryClient.invalidateQueries({ queryKey: ["completed_aulas"] });
      queryClient.invalidateQueries({ queryKey: ["quiz_tentativas"] });
      
      if (result.aprovado) {
        toast.success(`Parabéns! Você passou com ${result.nota}%!`);
      } else {
        toast.error(`Você obteve ${result.nota}%. Precisa de 70% para passar. Tente novamente!`);
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao enviar quiz: " + error.message);
    },
  });

  return {
    aula,
    aulaLoading,
    materiais,
    materiaisLoading,
    perguntas,
    perguntasLoading,
    tentativaAprovada,
    isCompleted: !!tentativaAprovada,
    submitQuiz,
    isLoading: aulaLoading || materiaisLoading || perguntasLoading,
  };
}

// Admin hook for managing lessons
export function useAulasAdmin(cursoId: string | undefined) {
  const queryClient = useQueryClient();

  // Create lesson
  const createAula = useMutation({
    mutationFn: async (data: Omit<Aula, "id" | "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("aulas_formacao")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aulas_formacao", cursoId] });
      toast.success("Aula criada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar aula: " + error.message);
    },
  });

  // Update lesson
  const updateAula = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Aula> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("aulas_formacao")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aulas_formacao", cursoId] });
      toast.success("Aula atualizada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar aula: " + error.message);
    },
  });

  // Delete lesson
  const deleteAula = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aulas_formacao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aulas_formacao", cursoId] });
      toast.success("Aula excluída!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir aula: " + error.message);
    },
  });

  // Link material to lesson
  const linkMaterial = useMutation({
    mutationFn: async ({ aulaId, materialId }: { aulaId: string; materialId: string }) => {
      const { error } = await supabase
        .from("aula_materiais")
        .insert({ aula_id: aulaId, material_id: materialId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aula_materiais"] });
      toast.success("Material vinculado!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao vincular material: " + error.message);
    },
  });

  // Unlink material
  const unlinkMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aula_materiais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aula_materiais"] });
      toast.success("Material removido!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover material: " + error.message);
    },
  });

  return {
    createAula,
    updateAula,
    deleteAula,
    linkMaterial,
    unlinkMaterial,
  };
}

// Admin hook for managing quiz questions
export function useQuizAdmin(aulaId: string | undefined) {
  const queryClient = useQueryClient();

  // Create question with options
  const createPergunta = useMutation({
    mutationFn: async (data: {
      enunciado: string;
      explicacao?: string;
      ordem?: number;
      opcoes: { texto: string; correta: boolean }[];
    }) => {
      if (!aulaId) throw new Error("Aula não encontrada");

      // Create question
      const { data: pergunta, error: perguntaError } = await supabase
        .from("quiz_perguntas")
        .insert({
          aula_id: aulaId,
          enunciado: data.enunciado,
          explicacao: data.explicacao || null,
          ordem: data.ordem || 0,
        })
        .select()
        .single();

      if (perguntaError) throw perguntaError;

      // Create options
      const opcoes = data.opcoes.map((o, idx) => ({
        pergunta_id: pergunta.id,
        texto: o.texto,
        correta: o.correta,
        ordem: idx,
      }));

      const { error: opcoesError } = await supabase.from("quiz_opcoes").insert(opcoes);
      if (opcoesError) throw opcoesError;

      return pergunta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_perguntas", aulaId] });
      toast.success("Pergunta criada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar pergunta: " + error.message);
    },
  });

  // Delete question (cascade deletes options)
  const deletePergunta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_perguntas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_perguntas", aulaId] });
      toast.success("Pergunta excluída!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir pergunta: " + error.message);
    },
  });

  return {
    createPergunta,
    deletePergunta,
  };
}
