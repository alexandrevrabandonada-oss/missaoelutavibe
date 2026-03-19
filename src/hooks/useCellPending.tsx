/**
 * useCellPending - Hook for admin cell assignment queue
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CellPendingProfile {
  profile_id: string;
  display_name: string | null;
  city_id: string;
  city_name: string | null;
  needs_cell_assignment: boolean;
  cell_id: string | null;
  created_at: string;
}

export function useCellPending() {
  const queryClient = useQueryClient();

  const { data: pending = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-cell-pending"],
    queryFn: async (): Promise<CellPendingProfile[]> => {
      const { data, error } = await (supabase.rpc as any)("admin_list_cell_pending", {
        p_limit: 100,
      });
      
      if (error) {
        console.error("Error fetching cell pending:", error);
        throw error;
      }
      
      return data || [];
    },
  });

  const assignCellMutation = useMutation({
    mutationFn: async ({ profileId, cellId }: { profileId: string; cellId: string }) => {
      const { data, error } = await (supabase.rpc as any)("admin_assign_cell", {
        p_profile_id: profileId,
        p_cell_id: cellId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Célula atribuída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-cell-pending"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atribuir célula");
    },
  });

  const markNoCellMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { data, error } = await (supabase.rpc as any)("admin_mark_no_cell", {
        p_profile_id: profileId,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Perfil marcado como avulso");
      queryClient.invalidateQueries({ queryKey: ["admin-cell-pending"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao marcar perfil");
    },
  });

  return {
    pending,
    isLoading,
    error,
    refetch,
    assignCell: assignCellMutation.mutate,
    isAssigning: assignCellMutation.isPending,
    markNoCell: markNoCellMutation.mutate,
    isMarkingNoCell: markNoCellMutation.isPending,
  };
}
