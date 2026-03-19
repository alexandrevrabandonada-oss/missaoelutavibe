import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";

export type LeadProfile = Tables<"profiles">;

// Using existing onboarding_status enum values for integration tracking
// pendente = novo (recém-aprovado), em_andamento = contatado, concluido = integrado
export type IntegrationStatus = Enums<"onboarding_status">;

export const INTEGRATION_LABELS: Record<IntegrationStatus, string> = {
  pendente: "Novo",
  em_andamento: "Contatado", 
  concluido: "Integrado",
};

export function useLeads() {
  const queryClient = useQueryClient();

  // Get all profiles with pending status (leads awaiting validation)
  const pendingLeadsQuery = useQuery({
    queryKey: ["leads-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("volunteer_status", "pendente")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as LeadProfile[];
    },
  });

  // Get all profiles with approved status (active volunteers)
  const approvedLeadsQuery = useQuery({
    queryKey: ["leads-approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("volunteer_status", "ativo")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as LeadProfile[];
    },
  });

  // Get counts for dashboard
  const countsQuery = useQuery({
    queryKey: ["leads-counts"],
    queryFn: async () => {
      const [pendingResult, approvedResult, rejectedResult] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("volunteer_status", "pendente"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("volunteer_status", "ativo"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("volunteer_status", "recusado"),
      ]);
      
      return {
        pending: pendingResult.count ?? 0,
        approved: approvedResult.count ?? 0,
        rejected: rejectedResult.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });

  // Approve lead mutation
  const approveMutation = useMutation({
    mutationFn: async ({ userId, cellId }: { userId: string; cellId?: string }) => {
      // First update the profile status directly
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          volunteer_status: "ativo",
          onboarding_status: "pendente", // "pendente" = novo/recém-aprovado
          approved_at: new Date().toISOString(),
        })
        .eq("id", userId);
      
      if (updateError) throw updateError;

      // If cell provided, add membership
      if (cellId) {
        const { error: cellError } = await supabase
          .from("cell_memberships")
          .insert({ user_id: userId, cell_id: cellId });
        
        if (cellError && !cellError.message.includes("duplicate")) {
          console.error("Cell membership error:", cellError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-pending"] });
      queryClient.invalidateQueries({ queryKey: ["leads-approved"] });
      queryClient.invalidateQueries({ queryKey: ["leads-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Lead aprovado com sucesso!");
    },
    onError: (error) => {
      console.error("Approve error:", error);
      toast.error("Erro ao aprovar lead");
    },
  });

  // Reject lead mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          volunteer_status: "recusado",
          rejection_reason: reason,
          approved_at: new Date().toISOString(),
        })
        .eq("id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-pending"] });
      queryClient.invalidateQueries({ queryKey: ["leads-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Lead recusado");
    },
    onError: (error) => {
      console.error("Reject error:", error);
      toast.error("Erro ao recusar lead");
    },
  });

  // Update integration status mutation
  const updateIntegrationMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: IntegrationStatus }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_status: status })
        .eq("id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-approved"] });
      toast.success("Status de integração atualizado!");
    },
    onError: (error) => {
      console.error("Update integration error:", error);
      toast.error("Erro ao atualizar status");
    },
  });

  return {
    // Pending leads (for validation)
    pendingLeads: pendingLeadsQuery.data ?? [],
    isPendingLoading: pendingLeadsQuery.isLoading,
    pendingError: pendingLeadsQuery.error,
    
    // Approved leads (active volunteers)
    approvedLeads: approvedLeadsQuery.data ?? [],
    isApprovedLoading: approvedLeadsQuery.isLoading,
    approvedError: approvedLeadsQuery.error,
    
    // Counts
    counts: countsQuery.data ?? { pending: 0, approved: 0, rejected: 0 },
    isCountsLoading: countsQuery.isLoading,
    
    // Actions
    approveLead: approveMutation.mutateAsync,
    rejectLead: rejectMutation.mutateAsync,
    updateIntegration: updateIntegrationMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isUpdatingIntegration: updateIntegrationMutation.isPending,
    
    // Refetch
    refetchPending: pendingLeadsQuery.refetch,
    refetchApproved: approvedLeadsQuery.refetch,
    refetchCounts: countsQuery.refetch,
  };
}
