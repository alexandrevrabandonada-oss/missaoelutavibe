import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// JSON Schema Types
export interface ImportMaterial {
  titulo: string;
  descricao?: string;
  url: string;
  categoria?: "arte" | "video" | "panfleto" | "logo" | "texto" | "outro";
}

export interface ImportQuizOption {
  texto: string;
  correta: boolean;
}

export interface ImportQuizQuestion {
  enunciado: string;
  explicacao?: string;
  opcoes: ImportQuizOption[];
}

export interface ImportAula {
  titulo: string;
  conteudo_texto: string;
  ordem?: number;
  materiais?: ImportMaterial[];
  quiz?: ImportQuizQuestion[];
}

export interface ImportCurso {
  titulo: string;
  descricao?: string;
  nivel?: "INTRO" | "BASICO" | "INTERMEDIARIO";
  estimativa_min?: number;
  tags?: string[];
  recomendado?: boolean;
}

export interface ImportPackage {
  curso: ImportCurso;
  aulas: ImportAula[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  preview?: {
    titulo: string;
    nivel: string;
    estimativa_min: number | null;
    numAulas: number;
    numPerguntas: number;
    numMateriais: number;
    tags: string[];
  };
}

export function useImportFormacao() {
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const queryClient = useQueryClient();

  const validateJSON = async (jsonText: string): Promise<ValidationResult> => {
    setIsValidating(true);
    const errors: string[] = [];

    try {
      // Parse JSON
      let data: ImportPackage;
      try {
        data = JSON.parse(jsonText);
      } catch {
        setIsValidating(false);
        const result = { valid: false, errors: ["JSON inválido. Verifique a sintaxe."] };
        setValidationResult(result);
        return result;
      }

      // Validate curso
      if (!data.curso) {
        errors.push("Campo 'curso' é obrigatório.");
      } else {
        if (!data.curso.titulo || typeof data.curso.titulo !== "string") {
          errors.push("Campo 'curso.titulo' é obrigatório e deve ser texto.");
        }
        if (data.curso.nivel && !["INTRO", "BASICO", "INTERMEDIARIO"].includes(data.curso.nivel)) {
          errors.push("Campo 'curso.nivel' deve ser INTRO, BASICO ou INTERMEDIARIO.");
        }
        if (data.curso.estimativa_min && typeof data.curso.estimativa_min !== "number") {
          errors.push("Campo 'curso.estimativa_min' deve ser um número.");
        }
      }

      // Validate aulas
      if (!data.aulas || !Array.isArray(data.aulas) || data.aulas.length === 0) {
        errors.push("Campo 'aulas' é obrigatório e deve ter pelo menos 1 aula.");
      } else {
        data.aulas.forEach((aula, index) => {
          if (!aula.titulo) {
            errors.push(`Aula ${index + 1}: campo 'titulo' é obrigatório.`);
          }
          if (!aula.conteudo_texto) {
            errors.push(`Aula ${index + 1}: campo 'conteudo_texto' é obrigatório.`);
          }
          
          // Validate quiz
          if (aula.quiz) {
            aula.quiz.forEach((q, qIndex) => {
              if (!q.enunciado) {
                errors.push(`Aula ${index + 1}, Pergunta ${qIndex + 1}: 'enunciado' é obrigatório.`);
              }
              if (!q.opcoes || q.opcoes.length < 2) {
                errors.push(`Aula ${index + 1}, Pergunta ${qIndex + 1}: deve ter pelo menos 2 opções.`);
              } else {
                const correctCount = q.opcoes.filter(o => o.correta).length;
                if (correctCount !== 1) {
                  errors.push(`Aula ${index + 1}, Pergunta ${qIndex + 1}: deve ter exatamente 1 opção correta.`);
                }
              }
            });
          }

          // Validate materiais
          if (aula.materiais) {
            aula.materiais.forEach((m, mIndex) => {
              if (!m.titulo) {
                errors.push(`Aula ${index + 1}, Material ${mIndex + 1}: 'titulo' é obrigatório.`);
              }
              if (!m.url) {
                errors.push(`Aula ${index + 1}, Material ${mIndex + 1}: 'url' é obrigatório.`);
              }
            });
          }
        });
      }

      // Check for duplicate curso
      if (data.curso?.titulo) {
        const { data: existing } = await supabase
          .from("cursos_formacao")
          .select("id")
          .eq("titulo", data.curso.titulo)
          .maybeSingle();

        if (existing) {
          errors.push(`Já existe um curso com o título "${data.curso.titulo}". Altere o título para continuar.`);
        }
      }

      // Calculate preview stats
      let numPerguntas = 0;
      let numMateriais = 0;
      if (data.aulas) {
        data.aulas.forEach(aula => {
          numPerguntas += aula.quiz?.length || 0;
          numMateriais += aula.materiais?.length || 0;
        });
      }

      const result: ValidationResult = {
        valid: errors.length === 0,
        errors,
        preview: errors.length === 0 ? {
          titulo: data.curso.titulo,
          nivel: data.curso.nivel || "INTRO",
          estimativa_min: data.curso.estimativa_min || null,
          numAulas: data.aulas.length,
          numPerguntas,
          numMateriais,
          tags: data.curso.tags || [],
        } : undefined,
      };

      setValidationResult(result);
      setIsValidating(false);
      return result;
    } catch (error) {
      console.error("Validation error:", error);
      const result = { valid: false, errors: ["Erro inesperado na validação."] };
      setValidationResult(result);
      setIsValidating(false);
      return result;
    }
  };

  const importPackage = async (jsonText: string): Promise<boolean> => {
    setIsImporting(true);

    try {
      const data: ImportPackage = JSON.parse(jsonText);

      // Get current user for criado_por
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado.");
        setIsImporting(false);
        return false;
      }

      // 1. Create curso
      const { data: curso, error: cursoError } = await supabase
        .from("cursos_formacao")
        .insert({
          titulo: data.curso.titulo,
          descricao: data.curso.descricao || null,
          nivel: data.curso.nivel || "INTRO",
          estimativa_min: data.curso.estimativa_min || null,
          tags: data.curso.tags || [],
          recomendado: data.curso.recomendado ?? true,
          status: "PUBLICADO",
        })
        .select()
        .single();

      if (cursoError) {
        console.error("Error creating curso:", cursoError);
        toast.error(`Erro ao criar curso: ${cursoError.message}`);
        setIsImporting(false);
        return false;
      }

      // 2. Create aulas with quiz and materiais
      for (let i = 0; i < data.aulas.length; i++) {
        const aulaData = data.aulas[i];

        const { data: aula, error: aulaError } = await supabase
          .from("aulas_formacao")
          .insert({
            curso_id: curso.id,
            titulo: aulaData.titulo,
            conteudo_texto: aulaData.conteudo_texto,
            ordem: aulaData.ordem ?? i + 1,
            status: "PUBLICADO",
          })
          .select()
          .single();

        if (aulaError) {
          console.error("Error creating aula:", aulaError);
          toast.error(`Erro ao criar aula "${aulaData.titulo}": ${aulaError.message}`);
          continue;
        }

        // 3. Create quiz questions
        if (aulaData.quiz && aulaData.quiz.length > 0) {
          for (let q = 0; q < aulaData.quiz.length; q++) {
            const quizData = aulaData.quiz[q];

            const { data: pergunta, error: perguntaError } = await supabase
              .from("quiz_perguntas")
              .insert({
                aula_id: aula.id,
                enunciado: quizData.enunciado,
                explicacao: quizData.explicacao || null,
                ordem: q + 1,
              })
              .select()
              .single();

            if (perguntaError) {
              console.error("Error creating pergunta:", perguntaError);
              continue;
            }

            // Create options
            const opcoes = quizData.opcoes.map((o, oIndex) => ({
              pergunta_id: pergunta.id,
              texto: o.texto,
              correta: o.correta,
              ordem: oIndex + 1,
            }));

            const { error: opcoesError } = await supabase
              .from("quiz_opcoes")
              .insert(opcoes);

            if (opcoesError) {
              console.error("Error creating opcoes:", opcoesError);
            }
          }
        }

        // 4. Create materiais and link to aula
        if (aulaData.materiais && aulaData.materiais.length > 0) {
          for (const matData of aulaData.materiais) {
            // Create material
            const { data: material, error: matError } = await supabase
              .from("materiais_base")
              .insert({
                titulo: matData.titulo,
                descricao: matData.descricao || null,
                arquivo_url: matData.url,
                categoria: matData.categoria || "outro",
                formato: "link",
                status: "aprovado",
                criado_por: user.id,
                tags: [],
              })
              .select()
              .single();

            if (matError) {
              console.error("Error creating material:", matError);
              continue;
            }

            // Link to aula
            const { error: linkError } = await supabase
              .from("aula_materiais")
              .insert({
                aula_id: aula.id,
                material_id: material.id,
              });

            if (linkError) {
              console.error("Error linking material:", linkError);
            }
          }
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["formacao"] });
      queryClient.invalidateQueries({ queryKey: ["seed-counts"] });
      queryClient.invalidateQueries({ queryKey: ["recommended-course"] });

      toast.success(`Curso "${data.curso.titulo}" importado com sucesso!`);
      setValidationResult(null);
      setIsImporting(false);
      return true;
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro ao importar pacote.");
      setIsImporting(false);
      return false;
    }
  };

  const resetValidation = () => {
    setValidationResult(null);
  };

  return {
    isValidating,
    isImporting,
    validationResult,
    validateJSON,
    importPackage,
    resetValidation,
  };
}
