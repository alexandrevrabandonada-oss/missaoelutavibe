/**
 * usePendingVolunteers - Hook for managing pending volunteer approvals
 * 
 * Fetches pending volunteers and provides approve/reject mutations.
 * All actions are logged to coord_audit_log.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PendingVolunteer {
  id: string;
  first_name: string;
  city_name: string;
  city_id: string | null;
  created_at: string;
  days_pending: number;
}

export function usePendingVolunteers(cityId?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch pending volunteers
  const pendingQuery = useQuery({
    queryKey: ["pending-volunteers", cityId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_pending_volunteers" as any, {
        p_city_id: cityId || null,
      });

      if (error) throw error;
      return (data as unknown as PendingVolunteer[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Approve volunteer mutation
  const approveMutation = useMutation({
    mutationFn: async ({
      userId,
      cellId,
    }: {
      userId: string;
      cellId?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("approve_volunteer" as any, {
        _user_id: userId,
        _cell_id: cellId || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; needs_cell_assignment?: boolean };
      if (!result.success) {
        throw new Error(result.error || "Erro ao aprovar voluntário");
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["coord-audit"] });
      queryClient.invalidateQueries({ queryKey: ["city-assignment-requests"] });
      
      if (data.needs_cell_assignment) {
        toast.success("Voluntário aprovado! Encaminhado para alocação em célula.");
      } else {
        toast.success("Voluntário aprovado e alocado com sucesso!");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao aprovar voluntário");
    },
  });

  // Reject volunteer mutation
  const rejectMutation = useMutation({
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.rpc("reject_volunteer" as any, {
        _user_id: userId,
        _reason: reason,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Erro ao recusar voluntário");
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-volunteers"] });
      queryClient.invalidateQueries({ queryKey: ["coord-audit"] });
      toast.success("Voluntário recusado.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao recusar voluntário");
    },
  });

  return {
    pendingVolunteers: pendingQuery.data || [],
    pendingCount: pendingQuery.data?.length || 0,
    isLoading: pendingQuery.isLoading,
    isError: pendingQuery.isError,
    error: pendingQuery.error,
    refetch: pendingQuery.refetch,

    approveVolunteer: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,

    rejectVolunteer: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
  };
}

// Generate welcome message for approved volunteer
export function getWelcomeMessage(firstName: string): string {
  return `🎉 Olá ${firstName}! Bem-vindo(a) ao time!

Sua conta foi aprovada. Agora você pode:

1️⃣ Completar seu perfil em /voluntario/eu
2️⃣ Ver sua primeira missão em /voluntario/missoes
3️⃣ Conferir próximos passos em /voluntario/primeiros-passos

Qualquer dúvida, estamos aqui! 💪`;
}
