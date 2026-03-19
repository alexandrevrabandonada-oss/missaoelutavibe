import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PinnedAnuncio {
  id: string;
  titulo: string;
  texto: string;
  ciclo_id: string;
  fixado: boolean;
  publicado_em: string;
}

export function usePinnedAnuncio(cicloId: string | null | undefined) {
  const { user } = useAuth();

  const pinnedQuery = useQuery({
    queryKey: ["pinned-anuncio", cicloId],
    queryFn: async () => {
      if (!cicloId) return null;

      const { data, error } = await (supabase as any)
        .from("anuncios")
        .select("id, titulo, texto, ciclo_id, fixado, publicado_em")
        .eq("ciclo_id", cicloId)
        .eq("fixado", true)
        .eq("status", "PUBLICADO")
        .order("publicado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PinnedAnuncio | null;
    },
    enabled: !!user?.id && !!cicloId,
  });

  return {
    pinnedAnuncio: pinnedQuery.data,
    isLoading: pinnedQuery.isLoading,
  };
}
