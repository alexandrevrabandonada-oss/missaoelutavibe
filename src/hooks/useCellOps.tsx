import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface AssignmentRequest {
  id: string;
  profile_id: string;
  city_id: string;
  bairro: string | null;
  disponibilidade: string | null;
  interesses: string[] | null;
  status: string;
  notes: string | null;
  assigned_cell_id: string | null;
  assigned_cell_name: string | null;
  created_at: string;
  resolved_at: string | null;
  profile_first_name: string | null;
  profile_neighborhood: string | null;
  days_waiting: number;
}

export interface CityCell {
  id: string;
  name: string;
  neighborhood: string | null;
  description: string | null;
  is_active: boolean;
  tipo: string;
  tags: string[] | null;
  weekly_goal: number | null;
  member_count: number;
  pending_requests: number;
  coordinator_count: number;
  created_at: string;
}

export interface CellOpsKPIs {
  total_cities: number;
  total_cells: number;
  pending_requests: number;
  cities_with_cells: number;
  cities_without_cells: number;
  pending_by_city: { city_name: string; uf: string; pending_count: number }[] | null;
  cells_by_city: { city_name: string; uf: string; cell_count: number }[] | null;
}

// Hook for assignment requests
export function useCityAssignmentRequests(cityId: string | null, status?: string) {
  return useQuery({
    queryKey: ["city-assignment-requests", cityId, status],
    queryFn: async () => {
      if (!cityId) return [];
      
      const { data, error } = await supabase.rpc("list_city_assignment_requests", {
        p_city_id: cityId,
        p_status: status || null,
      });
      
      if (error) throw error;
      return (data as unknown as AssignmentRequest[]) || [];
    },
    enabled: !!cityId,
  });
}

// Hook for city cells
export function useCityCells(cityId: string | null) {
  return useQuery({
    queryKey: ["city-cells", cityId],
    queryFn: async () => {
      if (!cityId) return [];
      
      const { data, error } = await supabase.rpc("list_city_cells", {
        p_city_id: cityId,
      });
      
      if (error) throw error;
      return (data as unknown as CityCell[]) || [];
    },
    enabled: !!cityId,
  });
}

// Hook for KPIs (diagnostics)
export function useCellOpsKPIs() {
  return useQuery({
    queryKey: ["cell-ops-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cell_ops_kpis");
      if (error) throw error;
      return data as unknown as CellOpsKPIs;
    },
  });
}

// Mutations hook
export function useCellOpsMutations() {
  const queryClient = useQueryClient();

  // Upsert cell
  const upsertCellMutation = useMutation({
    mutationFn: async ({
      cityId,
      name,
      notes,
      isActive = true,
      neighborhood,
      tags = [],
      cellId,
    }: {
      cityId: string;
      name: string;
      notes?: string;
      isActive?: boolean;
      neighborhood?: string;
      tags?: string[];
      cellId?: string;
    }) => {
      const { data, error } = await supabase.rpc("upsert_cell", {
        p_city_id: cityId,
        p_name: name,
        p_notes: notes || null,
        p_is_active: isActive,
        p_neighborhood: neighborhood || null,
        p_tags: tags,
        p_cell_id: cellId || null,
      });
      
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string; cell_id?: string };
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["city-cells", variables.cityId] });
      queryClient.invalidateQueries({ queryKey: ["cell-ops-kpis"] });
      toast.success(variables.cellId ? "Célula atualizada!" : "Célula criada!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar célula");
    },
  });

  // Approve and assign request
  const approveRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      cellId,
      note,
      makeCellCoordinator = false,
    }: {
      requestId: string;
      cellId?: string;
      note?: string;
      makeCellCoordinator?: boolean;
    }) => {
      const { data, error } = await supabase.rpc("approve_and_assign_request", {
        p_request_id: requestId,
        p_cell_id: cellId || null,
        p_coordinator_note: note || null,
        p_make_cell_coordinator: makeCellCoordinator,
      });
      
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string; status?: string; promoted_to_coordinator?: boolean };
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-assignment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["city-cells"] });
      queryClient.invalidateQueries({ queryKey: ["cell-ops-kpis"] });
      toast.success("Pedido aprovado!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao aprovar pedido");
    },
  });

  // Cancel request
  const cancelRequestMutation = useMutation({
    mutationFn: async ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc("cancel_assignment_request", {
        p_request_id: requestId,
        p_reason: reason || null,
      });
      
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["city-assignment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["cell-ops-kpis"] });
      toast.success("Pedido cancelado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao cancelar pedido");
    },
  });

  return {
    upsertCell: upsertCellMutation.mutate,
    isUpserting: upsertCellMutation.isPending,
    approveRequest: approveRequestMutation.mutate,
    isApproving: approveRequestMutation.isPending,
    cancelRequest: cancelRequestMutation.mutate,
    isCancelling: cancelRequestMutation.isPending,
  };
}
