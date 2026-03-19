import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";
import { toast } from "sonner";

// Types
export interface CoordinatorMetrics {
  overdue_followups: number;
  at_risk_volunteers: number;
  stalled_missions: number;
}

export interface OverdueFollowup {
  id: string;
  nome_curto: string;
  bairro: string | null;
  cidade: string;
  whatsapp: string | null;
  status: string;
  scheduled_for: string;
  kind: string;
  days_overdue: number;
  owner_name: string | null;
  owner_id: string;
  assignee_id: string | null;
  assignee_name: string | null;
}

export interface AtRiskVolunteer {
  id: string;
  full_name: string | null;
  city: string | null;
  whatsapp: string | null;
  last_action_at: string;
  last_action_kind: string | null;
  hours_since_last_action: number;
}

export interface StalledMission {
  id: string;
  title: string;
  mission_type: string;
  volunteer_name: string | null;
  volunteer_id: string;
  volunteer_whatsapp: string | null;
  accepted_at: string;
  days_stalled: number;
}

/**
 * Hook for coordinator inbox data
 */
export function useCoordinatorInbox() {
  const { user } = useAuth();
  const { getScope, isCoordinator } = useUserRoles();
  const queryClient = useQueryClient();

  const scope = getScope();
  const scopeType = scope.type === "none" || scope.type === "regiao" ? "all" : scope.type;
  const scopeCidade = scope.cidade;
  const scopeCellId = scope.cellId;

  // Metrics query
  const metricsQuery = useQuery({
    queryKey: ["coordinator-inbox-metrics", user?.id, scopeType, scopeCidade, scopeCellId],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase.rpc as any)("get_coordinator_inbox_metrics", {
        _scope_type: scopeType,
        _scope_cidade: scopeCidade,
        _scope_cell_id: scopeCellId,
      });

      if (error) throw error;
      
      // Check for authorization error
      if (data?.error === "unauthorized") {
        return null;
      }

      return data as CoordinatorMetrics;
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000,
  });

  // Overdue follow-ups query
  const overdueQuery = useQuery({
    queryKey: ["coordinator-overdue-followups", user?.id, scopeType, scopeCidade, scopeCellId],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase.rpc as any)("get_coordinator_overdue_followups", {
        _scope_type: scopeType,
        _scope_cidade: scopeCidade,
        _scope_cell_id: scopeCellId,
        _limit: 20,
      });

      if (error) throw error;
      return (data || []) as OverdueFollowup[];
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000,
  });

  // At-risk volunteers query
  const atRiskQuery = useQuery({
    queryKey: ["coordinator-at-risk-volunteers", user?.id, scopeType, scopeCidade, scopeCellId],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase.rpc as any)("get_coordinator_at_risk_volunteers", {
        _scope_type: scopeType,
        _scope_cidade: scopeCidade,
        _scope_cell_id: scopeCellId,
        _limit: 20,
      });

      if (error) throw error;
      return (data || []) as AtRiskVolunteer[];
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000,
  });

  // Stalled missions query
  const stalledQuery = useQuery({
    queryKey: ["coordinator-stalled-missions", user?.id, scopeType, scopeCidade, scopeCellId],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase.rpc as any)("get_coordinator_stalled_missions", {
        _scope_type: scopeType,
        _scope_cidade: scopeCidade,
        _scope_cell_id: scopeCellId,
        _limit: 20,
      });

      if (error) throw error;
      return (data || []) as StalledMission[];
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000,
  });

  // Assign follow-up mutation
  const assignMutation = useMutation({
    mutationFn: async ({ contactId, assigneeId }: { contactId: string; assigneeId: string }) => {
      const { data, error } = await (supabase.rpc as any)("assign_followup_to_volunteer", {
        _contact_id: contactId,
        _assignee_id: assigneeId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao delegar");
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coordinator-overdue-followups"] });
      queryClient.invalidateQueries({ queryKey: ["coordinator-inbox-metrics"] });
      toast.success("Follow-up delegado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao delegar: " + error.message);
    },
  });

  // Log coordinator actions
  const logAction = async (eventType: string, meta?: Record<string, any>) => {
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: eventType,
        _meta: meta || {},
      });
    } catch (error) {
      console.error("Error logging coordinator action:", error);
    }
  };

  return {
    // Metrics
    metrics: metricsQuery.data,
    isLoadingMetrics: metricsQuery.isLoading,
    metricsError: metricsQuery.error,

    // Overdue follow-ups
    overdueFollowups: overdueQuery.data ?? [],
    isLoadingOverdue: overdueQuery.isLoading,
    overdueError: overdueQuery.error,

    // At-risk volunteers
    atRiskVolunteers: atRiskQuery.data ?? [],
    isLoadingAtRisk: atRiskQuery.isLoading,
    atRiskError: atRiskQuery.error,

    // Stalled missions
    stalledMissions: stalledQuery.data ?? [],
    isLoadingStalled: stalledQuery.isLoading,
    stalledError: stalledQuery.error,

    // Actions
    assignFollowup: assignMutation.mutate,
    isAssigning: assignMutation.isPending,

    // Tracking
    logInboxViewed: () => logAction("coordinator_inbox_viewed", { scope: scopeType }),
    logWhatsAppOpened: (targetType: string, targetId: string) =>
      logAction("coordinator_whatsapp_opened", { target_type: targetType, target_id: targetId }),

    // Refetch all
    refetchAll: () => {
      metricsQuery.refetch();
      overdueQuery.refetch();
      atRiskQuery.refetch();
      stalledQuery.refetch();
    },

    // Access control
    isCoordinator: isCoordinator(),
    scope,
  };
}

/**
 * Get WhatsApp deep link for careful reminder
 */
export function getCarefulReminderWhatsAppLink(
  whatsapp: string | null,
  firstName: string,
  context: "followup" | "stalled" | "bring1" | "return"
): string | null {
  if (!whatsapp) return null;

  // Normalize phone number
  const phone = whatsapp.replace(/\D/g, "");
  if (phone.length < 10) return null;

  // Careful, supportive messages (no pressure)
  const messages: Record<typeof context, string> = {
    followup: `Oi ${firstName}! 👋 Tudo bem por aí? Passando pra ver se precisa de algum apoio com os contatos. Qualquer coisa, me chama!`,
    stalled: `Oi ${firstName}! 👋 Vi que você tem uma missão em andamento. Está tudo ok? Posso ajudar em algo?`,
    bring1: `Oi ${firstName}! 👋 Que bom que você completou sua primeira ação! 🎉 Se quiser convidar alguém pra participar junto, é só me chamar que ajudo.`,
    return: `Oi ${firstName}! 👋 Tudo bem? Sem pressão, mas queria lembrar que tem algumas ações esperando por você. Que tal fazer só 30 segundos hoje? Qualquer coisa, me chama!`,
  };

  const message = encodeURIComponent(messages[context]);
  return `https://wa.me/55${phone}?text=${message}`;
}

/**
 * Get copyable careful reminder message
 */
export function getCarefulReminderMessage(
  firstName: string,
  context: "followup" | "stalled" | "bring1" | "return"
): string {
  const messages: Record<typeof context, string> = {
    followup: `Oi ${firstName}! 👋 Tudo bem por aí? Passando pra ver se precisa de algum apoio com os contatos. Qualquer coisa, me chama!`,
    stalled: `Oi ${firstName}! 👋 Vi que você tem uma missão em andamento. Está tudo ok? Posso ajudar em algo?`,
    bring1: `Oi ${firstName}! 👋 Que bom que você completou sua primeira ação! 🎉 Se quiser convidar alguém pra participar junto, é só me chamar que ajudo.`,
    return: `Oi ${firstName}! 👋 Tudo bem? Sem pressão, mas queria lembrar que tem algumas ações esperando por você. Que tal fazer só 30 segundos hoje? Qualquer coisa, me chama!`,
  };

  return messages[context];
}
