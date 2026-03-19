import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { isRateLimited, handleRateLimitError } from "./useRateLimits";

// Types
export type FollowupKind = 'followup' | 'agendar' | 'nutrir' | 'encerrar';

export interface FollowupItem {
  id: string;
  nome_curto: string;
  bairro: string | null;
  cidade: string;
  tags: string[] | null;
  status: string;
  scheduled_for: string;
  kind: FollowupKind;
  context: {
    objective?: string;
    channel?: string;
    outcome?: string;
    roteiro_id?: string;
    mission_id?: string;
    updated_at?: string;
  };
}

// Labels
export const FOLLOWUP_KIND_LABELS: Record<FollowupKind, string> = {
  followup: "Follow-up",
  agendar: "Agendar",
  nutrir: "Nutrir",
  encerrar: "Encerrado",
};

export const FOLLOWUP_KIND_COLORS: Record<FollowupKind, string> = {
  followup: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  agendar: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  nutrir: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  encerrar: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

// Hook for fetching due follow-ups
export function useDueFollowups(limit: number = 5) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const followupsQuery = useQuery({
    queryKey: ["due-followups", user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase.rpc as any)("get_my_due_followups", {
        _limit: limit,
      });

      if (error) throw error;
      return (data || []) as FollowupItem[];
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 min cache
  });

  // Mark as done mutation
  const markDoneMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { data, error } = await (supabase.rpc as any)("mark_followup_done", {
        _contact_id: contactId,
        _meta: {},
      });

      if (error) throw error;
      
      // Check for rate limit
      if (isRateLimited(data)) {
        handleRateLimitError(data, "concluir follow-up");
        return null;
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (!data) return; // Rate limited
      
      queryClient.invalidateQueries({ queryKey: ["due-followups"] });
      toast.success("Follow-up concluído!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao concluir: " + error.message);
    },
  });

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: async ({ contactId, hours = 24 }: { contactId: string; hours?: number }) => {
      const { data, error } = await (supabase.rpc as any)("snooze_followup", {
        _contact_id: contactId,
        _hours: hours,
      });

      if (error) throw error;
      
      // Check for rate limit
      if (isRateLimited(data)) {
        handleRateLimitError(data, "adiar follow-up");
        return null;
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (!data) return; // Rate limited
      
      queryClient.invalidateQueries({ queryKey: ["due-followups"] });
      toast.success("Adiado para amanhã!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao adiar: " + error.message);
    },
  });

  return {
    followups: followupsQuery.data ?? [],
    isLoading: followupsQuery.isLoading,
    hasFollowups: (followupsQuery.data?.length ?? 0) > 0,
    refetch: followupsQuery.refetch,
    markDone: markDoneMutation.mutate,
    isMarkingDone: markDoneMutation.isPending,
    snooze: snoozeMutation.mutate,
    isSnoozing: snoozeMutation.isPending,
  };
}

// Hook for tracking follow-up actions
export function useFollowupTracking() {
  const logEvent = async (eventType: string, meta?: Record<string, any>) => {
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: eventType,
        _meta: meta || {},
      });
    } catch (error) {
      console.error("Error logging followup event:", error);
    }
  };

  return {
    logWhatsAppOpened: (kind: FollowupKind, objective?: string, cidade?: string) =>
      logEvent("followup_whatsapp_opened", { kind, objective, cidade }),
  };
}
