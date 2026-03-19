import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConvertInterestInput {
  interestId: string;
  cellName: string;
  cellNeighborhood?: string;
  createInitialCycle: boolean;
}

export interface ConvertInterestResult {
  success: boolean;
  cell_id: string;
  membership_id: string;
  invite_token: string;
  cycle_created: boolean;
  ciclo_id: string | null;
  tasks_created: number;
}

export function useConvertInterest() {
  const queryClient = useQueryClient();

  const convertMutation = useMutation({
    mutationFn: async ({
      interestId,
      cellName,
      cellNeighborhood,
      createInitialCycle,
    }: ConvertInterestInput) => {
      const { data, error } = await (supabase.rpc as any)(
        "convert_coord_interest_to_cell",
        {
          p_interest_id: interestId,
          p_cell_name: cellName,
          p_cell_neighborhood: cellNeighborhood || null,
          p_create_initial_cycle: createInitialCycle,
        }
      );

      if (error) throw error;

      const result = data as ConvertInterestResult;
      if (!result.success) {
        throw new Error("Erro ao converter interesse em célula");
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["coord-interests"] });
      queryClient.invalidateQueries({ queryKey: ["territorio-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["territorio-overview"] });
      queryClient.invalidateQueries({ queryKey: ["cells"] });
      queryClient.invalidateQueries({ queryKey: ["cells-all"] });
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
      queryClient.invalidateQueries({ queryKey: ["all-role-invites"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      const tasksMsg = result.tasks_created > 0 
        ? ` • ${result.tasks_created} tarefas criadas` 
        : "";
      const cycleMsg = result.cycle_created 
        ? " • Semana inaugural criada" 
        : "";

      toast.success(`Célula criada com sucesso!${cycleMsg}${tasksMsg}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar célula");
    },
  });

  return {
    convertInterest: convertMutation.mutateAsync,
    isConverting: convertMutation.isPending,
  };
}
