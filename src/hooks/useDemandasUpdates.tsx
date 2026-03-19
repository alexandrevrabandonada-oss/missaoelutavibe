import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DemandaUpdate {
  id: string;
  demanda_id: string;
  autor_id: string;
  mensagem: string;
  visivel_para_voluntario: boolean;
  created_at: string;
}

export function useDemandasUpdates(demandaId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get updates for a specific demanda
  const updatesQuery = useQuery({
    queryKey: ["demandas-updates", demandaId],
    queryFn: async () => {
      if (!demandaId) return [];
      const { data, error } = await supabase
        .from("demandas_updates")
        .select("*")
        .eq("demanda_id", demandaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DemandaUpdate[];
    },
    enabled: !!demandaId,
  });

  // Create update
  const createMutation = useMutation({
    mutationFn: async ({
      demanda_id,
      mensagem,
      visivel_para_voluntario = false,
    }: {
      demanda_id: string;
      mensagem: string;
      visivel_para_voluntario?: boolean;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("demandas_updates")
        .insert({
          demanda_id,
          autor_id: user.id,
          mensagem,
          visivel_para_voluntario,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["demandas-updates", variables.demanda_id] });
    },
  });

  return {
    updates: updatesQuery.data ?? [],
    isLoading: updatesQuery.isLoading,
    createUpdate: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    refetch: updatesQuery.refetch,
  };
}
