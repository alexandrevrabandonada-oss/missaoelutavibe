/**
 * useCoordRoles - Hook for coord_roles management (v1)
 * 
 * Handles COORD_GLOBAL, COORD_CITY, CELL_COORD roles via secure RPCs.
 * Never exposes PII - uses user_code (V#XXXXXX) format.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type CoordRoleType = "COORD_GLOBAL" | "COORD_CITY" | "CELL_COORD";

export interface CoordRole {
  id: string;
  user_id: string;
  user_code: string; // V#XXXXXX format, no PII
  role: CoordRoleType;
  city_id: string | null;
  city_name: string | null;
  cell_id: string | null;
  cell_name: string | null;
  created_at: string;
}

export const COORD_ROLE_LABELS: Record<CoordRoleType, string> = {
  COORD_GLOBAL: "Coordenação Global",
  COORD_CITY: "Coordenador de Cidade",
  CELL_COORD: "Coordenador de Célula",
};

export function useCoordRoles(scopeCityId?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // List coord roles (scoped by city if provided)
  const rolesQuery = useQuery({
    queryKey: ["coord-roles", scopeCityId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_coord_roles", {
        p_scope_city_id: scopeCityId || null,
      });

      if (error) throw error;
      return (data as unknown as CoordRole[]) || [];
    },
    enabled: !!user?.id,
  });

  // Grant a coord role
  const grantRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
      cityId,
      cellId,
    }: {
      userId: string;
      role: CoordRoleType;
      cityId?: string;
      cellId?: string;
    }) => {
      const { data, error } = await supabase.rpc("grant_coord_role", {
        p_user_id: userId,
        p_role: role,
        p_city_id: cityId || null,
        p_cell_id: cellId || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; role_id?: string; message?: string };
      if (!result.success) {
        throw new Error(result.error || "Erro ao atribuir papel");
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coord-roles"] });
      toast.success(data.message || "Papel atribuído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atribuir papel");
    },
  });

  // Revoke a coord role
  const revokeRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
      cityId,
      cellId,
    }: {
      userId: string;
      role: CoordRoleType;
      cityId?: string;
      cellId?: string;
    }) => {
      const { data, error } = await supabase.rpc("revoke_coord_role", {
        p_user_id: userId,
        p_role: role,
        p_city_id: cityId || null,
        p_cell_id: cellId || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Erro ao revogar papel");
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coord-roles"] });
      toast.success("Papel revogado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao revogar papel");
    },
  });

  // Generate user code from user_id
  const generateUserCode = (userId: string) => {
    return `V#${userId.substring(0, 6).toUpperCase()}`;
  };

  return {
    roles: rolesQuery.data || [],
    isLoading: rolesQuery.isLoading,
    isError: rolesQuery.isError,
    error: rolesQuery.error,
    refetch: rolesQuery.refetch,

    grantRole: grantRoleMutation.mutateAsync,
    isGranting: grantRoleMutation.isPending,

    revokeRole: revokeRoleMutation.mutateAsync,
    isRevoking: revokeRoleMutation.isPending,

    generateUserCode,
  };
}

// Hook for checking current user's coord permissions
export function useCanOperateCoord() {
  const { user } = useAuth();

  const checkQuery = useQuery({
    queryKey: ["can-operate-coord", user?.id],
    queryFn: async () => {
      // Call the helper to check if user can operate at global level
      const { data, error } = await supabase.rpc("can_operate_coord", {
        _target_city_id: null,
        _target_cell_id: null,
      });

      if (error) {
        console.error("can_operate_coord error:", error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
  });

  return {
    canOperate: checkQuery.data ?? false,
    isLoading: checkQuery.isLoading,
  };
}
