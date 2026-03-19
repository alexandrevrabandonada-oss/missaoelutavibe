import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Types
export interface CRMMission {
  mission_id: string;
  mission_title: string;
  mission_status: string;
  contato_id: string;
  contato_nome: string;
  contato_bairro: string | null;
  proxima_acao_em: string | null;
  created_at: string;
}

export interface CRMSettings {
  user_id: string;
  crm_missions_opt_in: boolean;
  crm_missions_daily_limit: number;
  updated_at: string;
}

export interface CRMMissionMetrics {
  pendentes: number;
  concluidas_7d: number;
  atrasadas: number;
  generated_at: string;
}

// Outcome options for completing CRM missions
export const CRM_MISSION_OUTCOMES = [
  { value: "contato_feito", label: "Contato feito", emoji: "✅" },
  { value: "nao_atendeu", label: "Não atendeu", emoji: "📵" },
  { value: "reagendado", label: "Reagendado", emoji: "📅" },
  { value: "convertido", label: "Convertido!", emoji: "🎉" },
  { value: "perdido", label: "Perdido", emoji: "❌" },
];

// Hook for volunteer CRM missions
export function useMyCRMMissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's pending CRM missions
  const { data: missions, isLoading } = useQuery({
    queryKey: ["my-crm-missions", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_crm_missions");
      if (error) throw error;
      return data as CRMMission[];
    },
    enabled: !!user?.id,
  });

  // Get user's CRM settings
  const { data: settings } = useQuery({
    queryKey: ["crm-settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as CRMSettings | null;
    },
    enabled: !!user?.id,
  });

  // Generate CRM missions for today
  const generateMissions = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await (supabase.rpc as any)("generate_crm_missions_for_user", {
        _user_id: user.id,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["my-crm-missions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-suggestions"] });
      
      if (count > 0) {
        toast.success(`${count} conversa(s) gerada(s) para hoje!`);
      } else {
        toast.info("Nenhuma nova conversa para gerar hoje.");
      }
    },
    onError: (error: any) => {
      console.error("Error generating CRM missions:", error);
      toast.error("Erro ao gerar conversas");
    },
  });

  // Complete a CRM mission
  const completeMission = useMutation({
    mutationFn: async (input: {
      mission_id: string;
      outcome: string;
      note: string;
      next_action_date?: string | null;
    }) => {
      const { data, error } = await (supabase.rpc as any)("complete_crm_mission", {
        _mission_id: input.mission_id,
        _outcome: input.outcome,
        _note: input.note,
        _next_action_date: input.next_action_date || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-crm-missions"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["daily-suggestions"] });
      toast.success("Conversa concluída!");
    },
    onError: (error: any) => {
      console.error("Error completing CRM mission:", error);
      toast.error("Erro ao concluir conversa");
    },
  });

  // Update CRM settings
  const updateSettings = useMutation({
    mutationFn: async (input: {
      opt_in?: boolean;
      daily_limit?: number;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("crm_settings")
        .upsert({
          user_id: user.id,
          crm_missions_opt_in: input.opt_in ?? true,
          crm_missions_daily_limit: input.daily_limit ?? 1,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-settings"] });
      toast.success("Preferências atualizadas!");
    },
    onError: () => {
      toast.error("Erro ao atualizar preferências");
    },
  });

  return {
    missions: missions ?? [],
    settings,
    isLoading,
    generateMissions,
    completeMission,
    updateSettings,
    isOptedIn: settings?.crm_missions_opt_in ?? true,
    dailyLimit: settings?.crm_missions_daily_limit ?? 1,
  };
}

// Hook for admin/coordinator CRM mission metrics
export function useCRMMissionMetrics(
  scopeType?: "all" | "cidade" | "celula",
  scopeCidade?: string | null,
  scopeCelulaId?: string | null
) {
  const { user } = useAuth();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["crm-mission-metrics", scopeType, scopeCidade, scopeCelulaId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_crm_mission_metrics", {
        _scope_type: scopeType || "all",
        _scope_cidade: scopeCidade,
        _scope_celula_id: scopeCelulaId,
      });

      if (error) throw error;
      return data as CRMMissionMetrics;
    },
    enabled: !!user?.id,
  });

  return { metrics, isLoading };
}
