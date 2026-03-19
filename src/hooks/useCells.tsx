import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Cell = Tables<"cells"> & { tipo?: "territorial" | "tema" | "regional" };
type CellTipo = "territorial" | "tema" | "regional";

export const CELL_TIPO_LABELS: Record<CellTipo, string> = {
  territorial: "Territorial",
  tema: "Temática",
  regional: "Regional",
};

export function useCells() {
  const queryClient = useQueryClient();

  const cellsQuery = useQuery({
    queryKey: ["cells"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as Cell[];
    },
  });

  const allCellsQuery = useQuery({
    queryKey: ["cells-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as Cell[];
    },
  });

  const createCellMutation = useMutation({
    mutationFn: async (cell: TablesInsert<"cells"> & { tipo?: CellTipo }) => {
      const { data, error } = await supabase
        .from("cells")
        .insert(cell)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cells"] });
      queryClient.invalidateQueries({ queryKey: ["cells-all"] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, cellId }: { userId: string; cellId: string }) => {
      // First deactivate any existing active memberships
      await supabase
        .from("cell_memberships")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("is_active", true);
      
      // Then add new membership (or reactivate if exists)
      const { data: existing } = await supabase
        .from("cell_memberships")
        .select("id")
        .eq("user_id", userId)
        .eq("cell_id", cellId)
        .single();
      
      if (existing) {
        // Reactivate
        const { error } = await supabase
          .from("cell_memberships")
          .update({ is_active: true, joined_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("cell_memberships")
          .insert({ user_id: userId, cell_id: cellId, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cell-members"] });
      queryClient.invalidateQueries({ queryKey: ["user-cells"] });
      queryClient.invalidateQueries({ queryKey: ["volunteer-cells"] });
    },
  });

  return {
    cells: cellsQuery.data ?? [],
    allCells: allCellsQuery.data ?? [],
    isLoading: cellsQuery.isLoading,
    createCell: createCellMutation.mutate,
    isCreating: createCellMutation.isPending,
    addMember: addMemberMutation.mutateAsync,
    isAddingMember: addMemberMutation.isPending,
  };
}

export function useCellMembers(cellId?: string) {
  const membersQuery = useQuery({
    queryKey: ["cell-members", cellId],
    queryFn: async () => {
      if (!cellId) return [];
      
      const { data, error } = await supabase
        .from("cell_memberships")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            nickname,
            city,
            neighborhood,
            interests
          )
        `)
        .eq("cell_id", cellId)
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!cellId,
  });

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
  };
}

// Get volunteer's current cell
export function useVolunteerCell(userId?: string) {
  return useQuery({
    queryKey: ["volunteer-cells", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("cell_memberships")
        .select(`
          cell_id,
          cells:cell_id (
            id,
            name,
            city,
            state
          )
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data?.cells ?? null;
    },
    enabled: !!userId,
  });
}
