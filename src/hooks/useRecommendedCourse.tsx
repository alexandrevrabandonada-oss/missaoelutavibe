import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RecommendedCourse {
  id: string;
  titulo: string;
  descricao: string | null;
  estimativa_min: number | null;
  nivel: string;
}

export function useRecommendedCourse() {
  const { user } = useAuth();

  const { data: recommendedCourse, isLoading } = useQuery({
    queryKey: ["recommended_course"],
    queryFn: async (): Promise<RecommendedCourse | null> => {
      // Get the most recent recommended and published course
      const { data, error } = await supabase
        .from("cursos_formacao")
        .select("id, titulo, descricao, estimativa_min, nivel")
        .eq("status", "PUBLICADO")
        .eq("recomendado", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as RecommendedCourse | null;
    },
    enabled: !!user,
  });

  return {
    recommendedCourse,
    isLoading,
  };
}
