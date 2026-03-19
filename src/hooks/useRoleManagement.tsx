import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string | null;
}

// Extended role type that includes new roles (enum values added via migration)
// Note: The generated types may not reflect newly added enum values immediately
export type ExtendedAppRole = 
  | "voluntario"
  | "moderador_celula"
  | "coordenador_celula"
  | "coordenador_municipal"
  | "coordenador_regional"
  | "coordenador_estadual"
  | "admin";

export interface UserRole {
  id: string;
  user_id: string;
  role: ExtendedAppRole;
  cell_id: string | null;
  cidade: string | null;
  regiao: string | null;
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  reason: string | null;
}

export interface ProfileWithRoles {
  id: string;
  full_name: string | null;
  city: string | null;
  state: string | null;
  roles: UserRole[];
}

export const ROLE_LABELS: Record<ExtendedAppRole, string> = {
  voluntario: "Voluntário",
  moderador_celula: "Moderador de Célula",
  coordenador_celula: "Coordenador de Célula (legado)",
  coordenador_municipal: "Coordenador Municipal",
  coordenador_regional: "Coordenador Regional",
  coordenador_estadual: "Coordenador Estadual",
  admin: "Admin Master",
};

export const ROLE_HIERARCHY: ExtendedAppRole[] = [
  "voluntario",
  "moderador_celula",
  "coordenador_celula",
  "coordenador_municipal",
  "coordenador_regional",
  "coordenador_estadual",
  "admin",
];

// Roles that can be assigned by coordinators (excluding voluntario which is default)
export const ASSIGNABLE_ROLES: ExtendedAppRole[] = [
  "moderador_celula",
  "coordenador_celula",
  "coordenador_municipal",
  "coordenador_regional",
  "coordenador_estadual",
  "admin",
];

export function useRoleManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get current user's role label
  const roleLabelQuery = useQuery({
    queryKey: ["user-role-label", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .rpc("get_user_role_label", { _user_id: user.id });
      
      if (error) throw error;
      return data as string | null;
    },
    enabled: !!user?.id,
  });

  // Get all user roles (for admin view)
  const allRolesQuery = useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Get roles for a specific user
  const getUserRoles = async (userId: string): Promise<UserRole[]> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data as UserRole[];
  };

  // Search profiles with their roles
  const searchProfilesQuery = useQuery({
    queryKey: ["profiles-with-roles"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, city, state")
        .eq("volunteer_status", "ativo")
        .order("full_name");
      
      if (profilesError) throw profilesError;

      // Get all active roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .is("revoked_at", null);
      
      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const profilesWithRoles: ProfileWithRoles[] = profiles.map(profile => ({
        ...profile,
        roles: (roles as UserRole[]).filter(r => r.user_id === profile.id),
      }));

      return profilesWithRoles;
    },
  });

  // Get audit logs for role changes
  const getAuditLogs = async (targetUserId?: string) => {
    let query = supabase
      .from("audit_logs")
      .select("*")
      .eq("entity_type", "user_roles")
      .order("created_at", { ascending: false })
      .limit(100);
    
    if (targetUserId) {
      query = query.or(`new_data->target_user_id.eq.${targetUserId},old_data->target_user_id.eq.${targetUserId}`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  // Grant a role to a user
  const grantRoleMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      role, 
      cidade, 
      regiao, 
      cellId 
    }: { 
      userId: string; 
      role: ExtendedAppRole; 
      cidade?: string; 
      regiao?: string;
      cellId?: string;
    }) => {
      // Cast to any to handle new enum values not yet in generated types
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role as any,
          cidade: cidade || null,
          regiao: regiao || null,
          cell_id: cellId || null,
          created_by: user?.id,
        } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Papel atribuído com sucesso!");
    },
    onError: (error) => {
      console.error("Grant role error:", error);
      toast.error("Erro ao atribuir papel");
    },
  });

  // Revoke a role from a user
  const revokeRoleMutation = useMutation({
    mutationFn: async ({ 
      roleId, 
      reason 
    }: { 
      roleId: string; 
      reason: string;
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
          reason,
        })
        .eq("id", roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Papel revogado com sucesso!");
    },
    onError: (error) => {
      console.error("Revoke role error:", error);
      toast.error("Erro ao revogar papel");
    },
  });

  // Get managed cities for current user
  const managedCitiesQuery = useQuery({
    queryKey: ["managed-cities", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .rpc("get_managed_cities", { _user_id: user.id });
      
      if (error) throw error;
      return (data as { cidade: string }[]).map(d => d.cidade).filter(Boolean);
    },
    enabled: !!user?.id,
  });

  // Get active admin count
  const adminCountQuery = useQuery({
    queryKey: ["active-admin-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("count_active_admins");
      if (error) throw error;
      return data as number;
    },
  });

  // Check if user can promote to a specific role
  const checkCanPromote = async (
    targetRole: ExtendedAppRole,
    targetCidade?: string,
    targetRegiao?: string
  ): Promise<PermissionCheckResult> => {
    if (!user?.id) return { allowed: false, reason: "Usuário não autenticado" };
    
    const { data, error } = await supabase.rpc("can_promote_to_role", {
      _operator_id: user.id,
      _target_role: targetRole,
      _target_cidade: targetCidade || null,
      _target_regiao: targetRegiao || null,
    });
    
    if (error) {
      console.error("Error checking promote permission:", error);
      return { allowed: false, reason: "Erro ao verificar permissão" };
    }
    
    return data as unknown as PermissionCheckResult;
  };

  // Check if user can revoke a specific role
  const checkCanRevoke = async (roleId: string): Promise<PermissionCheckResult> => {
    if (!user?.id) return { allowed: false, reason: "Usuário não autenticado" };
    
    const { data, error } = await supabase.rpc("can_revoke_role", {
      _operator_id: user.id,
      _role_id: roleId,
    });
    
    if (error) {
      console.error("Error checking revoke permission:", error);
      return { allowed: false, reason: "Erro ao verificar permissão" };
    }
    
    return data as unknown as PermissionCheckResult;
  };

  // Log denied role operation
  const logDeniedOperation = async (
    targetUserId: string,
    attemptedAction: "grant" | "revoke",
    attemptedRole: string,
    denialReason: string
  ): Promise<void> => {
    if (!user?.id) return;
    
    await supabase.rpc("log_role_denied", {
      _operator_id: user.id,
      _target_user_id: targetUserId,
      _attempted_action: attemptedAction,
      _attempted_role: attemptedRole,
      _denial_reason: denialReason,
    });
  };

  return {
    // Current user's role label
    currentRoleLabel: roleLabelQuery.data ?? "Voluntário",
    isRoleLabelLoading: roleLabelQuery.isLoading,

    // All roles (admin view)
    allRoles: allRolesQuery.data ?? [],
    isAllRolesLoading: allRolesQuery.isLoading,

    // Profiles with roles
    profilesWithRoles: searchProfilesQuery.data ?? [],
    isProfilesLoading: searchProfilesQuery.isLoading,
    refetchProfiles: searchProfilesQuery.refetch,

    // Managed cities
    managedCities: managedCitiesQuery.data ?? [],
    isManagedCitiesLoading: managedCitiesQuery.isLoading,

    // Admin count for governance
    activeAdminCount: adminCountQuery.data ?? 0,

    // Permission checks
    checkCanPromote,
    checkCanRevoke,
    logDeniedOperation,

    // Actions
    getUserRoles,
    getAuditLogs,
    grantRole: grantRoleMutation.mutateAsync,
    revokeRole: revokeRoleMutation.mutateAsync,
    isGranting: grantRoleMutation.isPending,
    isRevoking: revokeRoleMutation.isPending,
  };
}
