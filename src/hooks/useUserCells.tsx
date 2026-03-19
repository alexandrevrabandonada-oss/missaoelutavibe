import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Cell = Tables<"cells">;

export function useUserCells() {
  const { user } = useAuth();

  const userCellsQuery = useQuery({
    queryKey: ["user-cells", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's cell memberships with cell details
      const { data, error } = await supabase
        .from("cell_memberships")
        .select(`
          cell_id,
          cells:cell_id (
            id,
            name,
            city,
            state,
            neighborhood,
            is_active
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["aprovado", "active", "approved"])

      if (error) throw error;

      // Extract the cells from the joined data
      const cells = data
        ?.map((membership) => membership.cells)
        .filter((cell): cell is Cell => cell !== null && cell.is_active === true);

      return cells ?? [];
    },
    enabled: !!user?.id,
  });

  // Get just the cell IDs for quick lookups
  const userCellIds = userCellsQuery.data?.map((cell) => cell.id) ?? [];

  return {
    userCells: userCellsQuery.data ?? [],
    userCellIds,
    isLoading: userCellsQuery.isLoading,
    hasCell: userCellIds.length > 0,
  };
}
