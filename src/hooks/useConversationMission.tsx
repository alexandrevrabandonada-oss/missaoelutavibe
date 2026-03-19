import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";
import { toast } from "sonner";
import { isRateLimited, handleRateLimitError } from "./useRateLimits";

// Types
export type ConversationObjective = 'convidar' | 'explicar' | 'objecao' | 'fechamento';
export type ConversationChannel = 'whatsapp' | 'presencial' | 'telefone';
export type ConversationOutcome = 'convite_enviado' | 'topou' | 'talvez_depois' | 'nao_agora' | 'numero_errado' | 'sem_resposta';

export interface ConversationMissionContact {
  id: string;
  mission_id: string;
  contact_id: string;
  outcome: ConversationOutcome;
  notes: string | null;
  created_at: string;
  // Joined from crm_contatos
  contact_name?: string;
  contact_bairro?: string;
  contact_status?: string;
}

export interface ConversationMission {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  status: string;
  meta_json: {
    kind: string;
    target_count: number;
    actual_count: number;
    objective: ConversationObjective;
    channel: ConversationChannel;
    roteiro_id: string;
    contact_ids: string[];
    cidade: string;
    bairro?: string;
    generated_at: string;
  };
  created_at: string;
}

export interface ConversationMissionMetrics {
  period_days: number;
  generated: number;
  completed: number;
  completion_rate: number;
  outcomes: Record<string, number>;
  by_objective: Record<string, number>;
  top_cities: Array<{ cidade: string; count: number }>;
}

// Constants
export const OBJECTIVE_LABELS: Record<ConversationObjective, string> = {
  convidar: "Convidar",
  explicar: "Explicar",
  objecao: "Objeção",
  fechamento: "Fechamento",
};

export const OBJECTIVE_COLORS: Record<ConversationObjective, string> = {
  convidar: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  explicar: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  objecao: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  fechamento: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export const CHANNEL_LABELS: Record<ConversationChannel, string> = {
  whatsapp: "WhatsApp",
  presencial: "Presencial",
  telefone: "Telefone",
};

export const OUTCOME_LABELS: Record<ConversationOutcome, string> = {
  convite_enviado: "Convite enviado",
  topou: "Topou participar!",
  talvez_depois: "Talvez depois",
  nao_agora: "Não agora",
  numero_errado: "Número errado",
  sem_resposta: "Sem resposta",
};

export const OUTCOME_COLORS: Record<ConversationOutcome, string> = {
  convite_enviado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  topou: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  talvez_depois: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  nao_agora: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  numero_errado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  sem_resposta: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

// Hook to check for today's conversation mission
export function useConversationMission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get today's conversation mission
  const todaysMissionQuery = useQuery({
    queryKey: ["conversation-mission-today", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("assigned_to", user.id)
        .eq("type", "conversa")
        .gte("created_at", todaySP + "T00:00:00-03:00")
        .lt("created_at", todaySP + "T23:59:59-03:00")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Filter to only conversa_v0 kind
      if (data && data.meta_json && (data.meta_json as any).kind === 'conversa_v0') {
        return data as unknown as ConversationMission;
      }
      return null;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async ({
      objective,
      channel = 'whatsapp',
      targetCount = 3,
    }: {
      objective: ConversationObjective;
      channel?: ConversationChannel;
      targetCount?: number;
    }) => {
      const { data, error } = await (supabase.rpc as any)("generate_conversation_mission", {
        _objective: objective,
        _channel: channel,
        _target_count: targetCount,
      });

      if (error) throw error;

      // Check for rate limit
      if (isRateLimited(data)) {
        handleRateLimitError(data, "gerar missão de conversa");
        return { success: false, rate_limited: true } as any;
      }

      return data as {
        ok?: boolean;
        success?: boolean;
        mission_id?: string;
        contact_count?: number;
        roteiro_id?: string;
        already_exists?: boolean;
        message?: string;
      };
    },
    onSuccess: (data) => {
      if ((data as any).rate_limited) return;
      
      queryClient.invalidateQueries({ queryKey: ["conversation-mission-today"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      if (data.success || data.ok) {
        toast.success(`Missão gerada! ${data.contact_count || 0} contatos selecionados.`);
      } else if (data.already_exists) {
        toast.info(data.message);
      } else {
        toast.error(data.message || "Erro ao gerar missão");
      }
    },
    onError: (error: Error) => {
      console.error("[useConversationMission] Error generating:", error);
      toast.error("Erro ao gerar missão. Tente novamente.");
    },
  });

  return {
    todaysMission: todaysMissionQuery.data,
    hasGeneratedToday: !!todaysMissionQuery.data,
    missionInProgress: todaysMissionQuery.data?.status === 'publicada' || todaysMissionQuery.data?.status === 'em_andamento',
    missionCompleted: todaysMissionQuery.data?.status === 'concluida',
    isLoading: todaysMissionQuery.isLoading,
    generateMission: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
  };
}

// Hook for single mission with contacts
export function useConversationMissionDetails(missionId: string | undefined) {
  const { user } = useAuth();

  const missionQuery = useQuery({
    queryKey: ["conversation-mission", missionId],
    queryFn: async () => {
      if (!missionId) return null;

      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("id", missionId)
        .single();

      if (error) throw error;
      return data as unknown as ConversationMission;
    },
    enabled: !!user?.id && !!missionId,
  });

  const contactsQuery = useQuery({
    queryKey: ["conversation-mission-contacts", missionId],
    queryFn: async () => {
      if (!missionId) return [];

      const { data, error } = await supabase
        .from("conversa_mission_contacts")
        .select(`
          id,
          mission_id,
          contact_id,
          outcome,
          notes,
          created_at
        `)
        .eq("mission_id", missionId);

      if (error) throw error;

      // Fetch contact names separately (only first name + bairro for privacy)
      const contactIds = data.map(c => c.contact_id);
      const { data: contacts } = await supabase
        .from("crm_contatos")
        .select("id, nome, bairro, status")
        .in("id", contactIds);

      const contactMap = new Map(contacts?.map(c => [c.id, c]) || []);

      return data.map(c => ({
        ...c,
        contact_name: contactMap.get(c.contact_id)?.nome?.split(' ')[0] || 'Contato',
        contact_bairro: contactMap.get(c.contact_id)?.bairro || null,
        contact_status: contactMap.get(c.contact_id)?.status || null,
      })) as ConversationMissionContact[];
    },
    enabled: !!user?.id && !!missionId,
  });

  return {
    mission: missionQuery.data,
    contacts: contactsQuery.data ?? [],
    isLoading: missionQuery.isLoading || contactsQuery.isLoading,
    refetch: () => {
      missionQuery.refetch();
      contactsQuery.refetch();
    },
  };
}

// Hook for completing mission
export function useCompleteConversationMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      missionId,
      results,
    }: {
      missionId: string;
      results: Array<{ contact_id: string; outcome: ConversationOutcome; notes?: string }>;
    }) => {
      const { data, error } = await (supabase.rpc as any)("complete_conversation_mission", {
        _mission_id: missionId,
        _results: results,
      });

      if (error) throw error;
      return data as {
        success: boolean;
        done_count?: number;
        outcomes_counts?: Record<string, number>;
        message?: string;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversation-mission"] });
      queryClient.invalidateQueries({ queryKey: ["conversation-mission-today"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      if (data.success) {
        toast.success(`Missão concluída! ${data.done_count} conversas registradas.`);
      } else {
        toast.error(data.message || "Erro ao concluir missão");
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao concluir missão: " + error.message);
    },
  });
}

// Hook for tracking actions (growth events)
export function useConversationTracking() {
  const logEvent = async (eventType: string, meta?: Record<string, any>) => {
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: eventType,
        _meta: meta || {},
      });
    } catch (error) {
      console.error("Error logging event:", error);
    }
  };

  return {
    logMissionOpened: (missionId: string) => logEvent("conversation_mission_opened", { mission_id: missionId }),
    logScriptCopied: (roteiroId: string) => logEvent("conversation_script_copied", { roteiro_id: roteiroId }),
    logWhatsAppOpened: (roteiroId: string) => logEvent("conversation_whatsapp_opened", { roteiro_id: roteiroId }),
  };
}

// Hook for admin metrics
export function useConversationMissionMetrics(days: number = 7, scopeCidade?: string) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  return useQuery({
    queryKey: ["conversation-mission-metrics", days, scopeCidade],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_conversation_mission_metrics", {
        _days: days,
        _scope_cidade: scopeCidade || null,
      });

      if (error) throw error;
      return data as ConversationMissionMetrics;
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000,
  });
}
