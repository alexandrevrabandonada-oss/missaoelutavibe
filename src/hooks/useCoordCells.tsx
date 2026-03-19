/**
 * useCoordCells - Fetches cells a coordinator can access with quick stats
 * 
 * Scope rules:
 * - "all" → all active cells
 * - "celula" → only the cell matching scope.cellId
 * - "cidade" → cells in coordinator's city
 * - "regiao" → cells in coordinator's region/state
 * - other → empty (denied)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "./useUserRoles";

export interface CoordCellSummary {
  id: string;
  name: string;
  city: string;
  state: string;
  neighborhood: string | null;
  voluntarios_ativos: number;
  registros_pendentes: number;
  registros_ajuste: number;
  /** Oldest pending evidence age in hours, null if none */
  oldest_pending_hours: number | null;
}

export function useCoordCells() {
  const { getScope, isCoordinator, isLoading: isLoadingRoles } = useUserRoles();
  const scope = getScope();

  const query = useQuery({
    queryKey: ["coord-cells", scope.type, scope.cellId, scope.cidade, scope.regiao],
    queryFn: async (): Promise<CoordCellSummary[]> => {
      // 1. Fetch cells based on scope
      let cellsQuery = supabase
        .from("cells")
        .select("id, name, city, state, neighborhood")
        .eq("is_active", true)
        .order("name");

      if (scope.type === "celula" && scope.cellId) {
        cellsQuery = cellsQuery.eq("id", scope.cellId);
      } else if (scope.type !== "all") {
        // cidade/regiao/other: deny listing until full scope validation exists
        return [];
      }

      const { data: cells, error: cellsError } = await cellsQuery;
      if (cellsError) throw cellsError;
      if (!cells?.length) return [];

      const cellIds = cells.map((c) => c.id);

      // 2. Batch fetch stats for all cells
      const [membersRes, pendingRes, ajusteRes, oldestPendingRes] = await Promise.all([
        // Active members per cell
        supabase
          .from("cell_memberships")
          .select("cell_id")
          .in("cell_id", cellIds)
          .in("status", ["aprovado", "active", "approved"]),
        // Pending evidences per cell
        supabase
          .from("evidences")
          .select("cell_id")
          .in("cell_id", cellIds)
          .eq("status", "enviado"),
        // Needs adjustment per cell
        supabase
          .from("evidences")
          .select("cell_id")
          .in("cell_id", cellIds)
          .eq("status", "precisa_ajuste"),
        // Oldest pending evidence per cell (get all pending with created_at)
        supabase
          .from("evidences")
          .select("cell_id, created_at")
          .in("cell_id", cellIds)
          .eq("status", "enviado")
          .order("created_at", { ascending: true }),
      ]);

      // Count per cell_id
      const countBy = (data: { cell_id: string }[] | null) => {
        const map: Record<string, number> = {};
        (data || []).forEach((row) => {
          map[row.cell_id] = (map[row.cell_id] || 0) + 1;
        });
        return map;
      };

      const memberCounts = countBy(membersRes.data as any);
      const pendingCounts = countBy(pendingRes.data as any);
      const ajusteCounts = countBy(ajusteRes.data as any);

      // Oldest pending per cell (first occurrence per cell_id since ordered by created_at asc)
      const now = Date.now();
      const oldestPendingMap: Record<string, number> = {};
      ((oldestPendingRes.data as any) || []).forEach((row: { cell_id: string; created_at: string }) => {
        if (!oldestPendingMap[row.cell_id]) {
          oldestPendingMap[row.cell_id] = (now - new Date(row.created_at).getTime()) / (1000 * 60 * 60);
        }
      });

      return cells.map((cell) => ({
        ...cell,
        voluntarios_ativos: memberCounts[cell.id] || 0,
        registros_pendentes: pendingCounts[cell.id] || 0,
        registros_ajuste: ajusteCounts[cell.id] || 0,
        oldest_pending_hours: oldestPendingMap[cell.id] ?? null,
      }));
    },
    enabled: !isLoadingRoles && isCoordinator(),
    staleTime: 1000 * 60 * 2,
  });

  return {
    cells: query.data ?? [],
    isLoading: query.isLoading || isLoadingRoles,
    isError: query.isError,
    error: query.error,
    scopeType: scope.type,
  };
}
