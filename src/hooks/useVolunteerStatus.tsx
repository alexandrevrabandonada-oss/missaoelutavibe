import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type VolunteerStatus = "pendente" | "ativo" | "recusado";

export interface VolunteerProfile {
  id: string;
  full_name: string | null;
  nickname: string | null;
  city: string | null;
  state: string | null;
  volunteer_status: VolunteerStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  onboarding_status: string | null;
  interests: string[] | null;
}

export function useVolunteerStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check current user's volunteer status
  const statusQuery = useQuery({
    queryKey: ["volunteer-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("volunteer_status, rejection_reason")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data as { volunteer_status: VolunteerStatus; rejection_reason: string | null };
    },
    enabled: !!user?.id,
  });

  // Get all volunteers by status (for admin)
  const volunteersQuery = useQuery({
    queryKey: ["admin-volunteers-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as VolunteerProfile[];
    },
  });

  // Count pending volunteers (for badge)
  const pendingCountQuery = useQuery({
    queryKey: ["pending-volunteers-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("volunteer_status", "pendente");
      
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  // Approve volunteer mutation - uses updated RPC signature (no _approved_by param)
  const approveMutation = useMutation({
    mutationFn: async ({ userId, cellId }: { userId: string; cellId?: string }) => {
      const { error } = await supabase.rpc("approve_volunteer", {
        _user_id: userId,
        _cell_id: cellId || null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-volunteers-full"] });
      queryClient.invalidateQueries({ queryKey: ["pending-volunteers-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  // Reject volunteer mutation - uses updated RPC signature (no _rejected_by param)
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc("reject_volunteer", {
        _user_id: userId,
        _reason: reason,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-volunteers-full"] });
      queryClient.invalidateQueries({ queryKey: ["pending-volunteers-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  return {
    // Current user status
    volunteerStatus: statusQuery.data?.volunteer_status ?? null,
    rejectionReason: statusQuery.data?.rejection_reason ?? null,
    isPending: statusQuery.data?.volunteer_status === "pendente",
    isApproved: statusQuery.data?.volunteer_status === "ativo",
    isRejected: statusQuery.data?.volunteer_status === "recusado",
    isStatusLoading: statusQuery.isLoading,
    
    // All volunteers (admin)
    volunteers: volunteersQuery.data ?? [],
    isVolunteersLoading: volunteersQuery.isLoading,
    
    // Pending count
    pendingCount: pendingCountQuery.data ?? 0,
    
    // Actions
    approveVolunteer: approveMutation.mutateAsync,
    rejectVolunteer: rejectMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
