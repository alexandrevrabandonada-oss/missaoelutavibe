/**
 * useScopedRoles - RBAC Escopo v0
 * 
 * Unified hook for scoped role management using new SQL helpers.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type ScopeType = "global" | "estado" | "cidade" | "celula" | "regional";

export interface UserScope {
  role: string;
  scope_type: ScopeType | "none";
  scope_state: string | null;
  scope_city: string | null;
  scope_cell_id: string | null;
  scope_label: string;
}

export interface ScopedRole {
  id: string;
  user_id: string;
  role: string;
  scope_type: string;
  scope_state: string | null;
  scope_city: string | null;
  scope_cell_id: string | null;
  cell_name?: string | null;
  granted_by: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface RoleAuditEntry {
  id: string;
  action: string;
  role: string;
  scope_type: string;
  scope_city: string;
  actor_nickname: string;
  reason: string;
  created_at: string;
}

export const SCOPE_TYPE_LABELS: Record<ScopeType, string> = {
  global: "Global",
  estado: "Estado",
  regional: "Regional",
  cidade: "Cidade",
  celula: "Célula",
};

export const ROLE_LABELS: Record<string, string> = {
  voluntario: "Voluntário",
  moderador_celula: "Moderador de Célula",
  coordenador_celula: "Coordenador de Célula",
  coordenador_municipal: "Coordenador Municipal",
  coordenador_regional: "Coordenador Regional",
  coordenador_estadual: "Coordenador Estadual",
  admin: "Admin",
};

export function useScopedRoles() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get current user's scope
  const scopeQuery = useQuery({
    queryKey: ["user-scope", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase.rpc("get_user_scope", {
        _user_id: user.id,
      });
      
      if (error) throw error;
      return data as unknown as UserScope;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Get all active roles for a user
  const getUserRoles = async (userId: string): Promise<ScopedRole[]> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        id, user_id, role, 
        scope_type, scope_state, scope_city, scope_cell_id,
        granted_by, expires_at, revoked_at, created_at,
        cells:scope_cell_id (name)
      `)
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map((r: any) => ({
      ...r,
      cell_name: r.cells?.name || null,
    }));
  };

  // Get role audit history
  const getRoleHistory = async (userId: string): Promise<RoleAuditEntry[]> => {
    const { data, error } = await supabase.rpc("get_role_audit_history", {
      _target_user_id: userId,
      _limit: 50,
    });
    
    if (error) throw error;
    return (data || []) as RoleAuditEntry[];
  };

  // Grant a scoped role
  const grantRoleMutation = useMutation({
    mutationFn: async ({
      targetUserId,
      role,
      scopeType,
      scopeState,
      scopeCity,
      scopeCellId,
      expiresAt,
    }: {
      targetUserId: string;
      role: string;
      scopeType: ScopeType;
      scopeState?: string;
      scopeCity?: string;
      scopeCellId?: string;
      expiresAt?: string;
    }) => {
      const { data, error } = await supabase.rpc("grant_scoped_role", {
        _target_user_id: targetUserId,
        _role: role,
        _scope_type: scopeType,
        _scope_state: scopeState || null,
        _scope_city: scopeCity || null,
        _scope_cell_id: scopeCellId || null,
        _expires_at: expiresAt || null,
      });

      if (error) throw error;
      
      const result = data as { ok: boolean; reason?: string; role_id?: string };
      if (!result.ok) {
        throw new Error(result.reason || "Erro ao atribuir papel");
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      toast.success("Papel atribuído com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atribuir papel");
    },
  });

  // Revoke a role
  const revokeRoleMutation = useMutation({
    mutationFn: async ({
      roleId,
      reason,
    }: {
      roleId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc("revoke_scoped_role", {
        _role_id: roleId,
        _reason: reason,
      });

      if (error) throw error;
      
      const result = data as { ok: boolean; reason?: string };
      if (!result.ok) {
        throw new Error(result.reason || "Erro ao revogar papel");
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      toast.success("Papel revogado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao revogar papel");
    },
  });

  // Derived helpers
  const isAdmin = () => {
    const s = scopeQuery.data;
    return s?.role === "admin" || s?.role === "coordenador_estadual";
  };

  const isCoordinator = () => {
    const s = scopeQuery.data;
    if (!s) return false;
    return [
      "admin",
      "coordenador_estadual",
      "coordenador_regional",
      "coordenador_municipal",
      "coordenador_celula",
    ].includes(s.role);
  };

  return {
    // Current scope
    scope: scopeQuery.data || {
      role: "voluntario",
      scope_type: "none" as const,
      scope_state: null,
      scope_city: null,
      scope_cell_id: null,
      scope_label: "Voluntário",
    },
    isLoadingScope: scopeQuery.isLoading,
    refetchScope: scopeQuery.refetch,

    // Derived
    isAdmin,
    isCoordinator,

    // Actions
    getUserRoles,
    getRoleHistory,
    grantRole: grantRoleMutation.mutateAsync,
    revokeRole: revokeRoleMutation.mutateAsync,
    isGranting: grantRoleMutation.isPending,
    isRevoking: revokeRoleMutation.isPending,
  };
}
