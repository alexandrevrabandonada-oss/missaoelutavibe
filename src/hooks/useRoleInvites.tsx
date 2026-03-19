import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface RoleInvite {
  id: string;
  scope_tipo: string;
  scope_id: string;
  scope_name?: string;
  role_key: string;
  role_label?: string;
  invited_email: string | null;
  invited_user_id: string | null;
  invited_user_name?: string | null;
  status: string;
  expires_at: string;
  created_by: string | null;
  created_by_name?: string | null;
  created_at: string;
  accepted_at?: string | null;
  token?: string;
}

export interface InviteStats {
  total_pendentes: number;
  expirando_48h: number;
  aceitos_7d: number;
  revogados_7d: number;
}

export const ROLE_LABELS: Record<string, string> = {
  voluntario: "Voluntário",
  coordenador_celula: "Coordenador de Célula",
  coordenador_regional: "Coordenador Regional",
  coordenador_estadual: "Coordenador Estadual",
  admin: "Admin",
};

export const ASSIGNABLE_ROLES = [
  { value: "voluntario", label: "Voluntário" },
  { value: "coordenador_celula", label: "Coordenador de Célula" },
  { value: "coordenador_regional", label: "Coordenador Regional" },
  { value: "coordenador_estadual", label: "Coordenador Estadual" },
  { value: "admin", label: "Admin" },
];

export function useRoleInvites() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get my pending invites (for volunteer view)
  const myPendingInvitesQuery = useQuery({
    queryKey: ["my-pending-role-invites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_pending_invites");
      if (error) throw error;
      return data as RoleInvite[];
    },
    enabled: !!user?.id,
  });

  // Get invite stats (for admin ops dashboard)
  const inviteStatsQuery = useQuery({
    queryKey: ["role-invite-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_role_invite_stats");
      if (error) throw error;
      return data as unknown as InviteStats;
    },
    enabled: !!user?.id,
  });

  // List all invites (for admin management)
  const listInvitesQuery = useQuery({
    queryKey: ["all-role-invites"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_role_invites", {
        p_scope_tipo: null,
        p_scope_id: null,
        p_status: null,
      });
      if (error) throw error;
      return data as RoleInvite[];
    },
    enabled: !!user?.id,
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async ({
      scopeTipo,
      scopeId,
      roleKey,
      invitedEmail,
      invitedUserId,
    }: {
      scopeTipo: string;
      scopeId: string;
      roleKey: string;
      invitedEmail?: string;
      invitedUserId?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_role_invite", {
        p_scope_tipo: scopeTipo,
        p_scope_id: scopeId,
        p_role_key: roleKey,
        p_invited_email: invitedEmail || null,
        p_invited_user_id: invitedUserId || null,
        p_expires_days: 7,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; invite_id?: string; token?: string };
      if (!result.success) throw new Error(result.error || "Erro ao criar convite");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-role-invites"] });
      queryClient.invalidateQueries({ queryKey: ["role-invite-stats"] });
      toast.success("Convite criado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Accept invite mutation
  const acceptInviteMutation = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("accept_role_invite", {
        p_token: token,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; role_id?: string };
      if (!result.success) throw new Error(result.error || "Erro ao aceitar convite");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pending-role-invites"] });
      queryClient.invalidateQueries({ queryKey: ["all-role-invites"] });
      queryClient.invalidateQueries({ queryKey: ["role-invite-stats"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Convite aceito! Seu novo papel foi ativado.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Revoke invite mutation
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.rpc("revoke_role_invite", {
        p_invite_id: inviteId,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Erro ao revogar convite");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-role-invites"] });
      queryClient.invalidateQueries({ queryKey: ["role-invite-stats"] });
      toast.success("Convite revogado!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Resend invite mutation
  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await supabase.rpc("resend_role_invite", {
        p_invite_id: inviteId,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; token?: string };
      if (!result.success) throw new Error(result.error || "Erro ao reenviar convite");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-role-invites"] });
      queryClient.invalidateQueries({ queryKey: ["role-invite-stats"] });
      toast.success("Convite reenviado com novo token!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Safe revoke user role mutation  
  const safeRevokeRoleMutation = useMutation({
    mutationFn: async ({ roleId, reason }: { roleId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc("safe_revoke_user_role", {
        p_role_id: roleId,
        p_reason: reason || null,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || "Erro ao revogar papel");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles-with-roles"] });
      toast.success("Papel revogado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    // My invites
    myPendingInvites: myPendingInvitesQuery.data ?? [],
    isMyInvitesLoading: myPendingInvitesQuery.isLoading,
    hasPendingInvites: (myPendingInvitesQuery.data?.length ?? 0) > 0,

    // All invites (admin)
    allInvites: listInvitesQuery.data ?? [],
    isAllInvitesLoading: listInvitesQuery.isLoading,
    refetchInvites: listInvitesQuery.refetch,

    // Stats
    inviteStats: inviteStatsQuery.data,
    isStatsLoading: inviteStatsQuery.isLoading,

    // Actions
    createInvite: createInviteMutation.mutateAsync,
    isCreating: createInviteMutation.isPending,
    
    acceptInvite: acceptInviteMutation.mutateAsync,
    isAccepting: acceptInviteMutation.isPending,
    
    revokeInvite: revokeInviteMutation.mutateAsync,
    isRevoking: revokeInviteMutation.isPending,
    
    resendInvite: resendInviteMutation.mutateAsync,
    isResending: resendInviteMutation.isPending,

    safeRevokeRole: safeRevokeRoleMutation.mutateAsync,
    isSafeRevoking: safeRevokeRoleMutation.isPending,
  };
}
