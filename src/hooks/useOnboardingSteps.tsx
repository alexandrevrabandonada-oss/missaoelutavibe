import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface OnboardingStatus {
  step1_done: boolean;
  step2_done: boolean;
  step3_done: boolean;
  step4_done: boolean;
  completed_at: string | null;
  steps_completed: number;
  is_complete: boolean;
}

export interface OnboardingMetrics {
  aprovados_7d: number;
  concluiram_7d: number;
  em_progresso: number;
  taxa_conclusao: number;
}

export function useOnboardingSteps() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_onboarding_status");
      
      if (error) {
        console.error("Error fetching onboarding status:", error);
        throw error;
      }

      // RPC returns array with single row
      const row = Array.isArray(data) ? data[0] : data;
      return row as OnboardingStatus;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const markStepMutation = useMutation({
    mutationFn: async (step: number) => {
      const { data, error } = await (supabase.rpc as any)("mark_onboarding_step_done", {
        p_step: step,
      });

      if (error) {
        throw error;
      }

      return data as OnboardingStatus;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["onboarding-status", user?.id], data);
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      
      if (data.is_complete && data.completed_at) {
        toast.success("🎉 Você entrou na engrenagem!", {
          description: "Seus primeiros passos estão completos!",
        });
      }
    },
    onError: (error) => {
      console.error("Error marking step:", error);
      toast.error("Erro ao salvar progresso");
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    error: statusQuery.error,
    refetch: statusQuery.refetch,
    markStepDone: markStepMutation.mutate,
    isMarkingStep: markStepMutation.isPending,
  };
}

export function useOnboardingMetrics(scopeType?: string, scopeCidade?: string | null, scopeCelulaId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["onboarding-metrics", scopeType, scopeCidade, scopeCelulaId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_onboarding_metrics", {
        _scope_type: scopeType || "all",
        _scope_cidade: scopeCidade,
        _scope_celula_id: scopeCelulaId,
      });

      if (error) {
        console.error("Error fetching onboarding metrics:", error);
        throw error;
      }

      return data as OnboardingMetrics;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });
}
