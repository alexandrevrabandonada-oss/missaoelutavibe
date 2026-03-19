/**
 * useEditarSintese - Mutation to edit synopsis of a closed cycle
 * F8.2: Calls editar_sintese_ciclo RPC + invalidates caches
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useEditarSintese(cellId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { cicloId: string; resumo: string }) => {
      const { data, error } = await supabase.rpc("editar_sintese_ciclo", {
        _ciclo_id: params.cicloId,
        _resumo: params.resumo.trim(),
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "Erro ao editar síntese");
      }
    },
    onSuccess: () => {
      toast.success("Síntese atualizada");
      queryClient.invalidateQueries({ queryKey: ["celula-memoria-ciclos", cellId] });
      queryClient.invalidateQueries({ queryKey: ["celula-alerts", cellId] });
    },
    onError: (error: Error) => {
      console.error("Error editing synopsis:", error);
      toast.error(error.message || "Erro ao editar síntese");
    },
  });
}
