/**
 * Post-Event Follow-ups Hook
 * 
 * Handles automatic scheduling and completion of follow-ups
 * after event attendance is marked.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Types
export type PostEventFollowupKind = 'thank_you' | 'qualify' | 'ask_referral';

export interface PostEventFollowupItem {
  invite_id: string;
  event_id: string;
  event_title: string;
  contact_id: string;
  contact_nome: string;
  contact_cidade: string;
  contact_bairro: string | null;
  followup_kind: PostEventFollowupKind;
  due_at: string;
  is_overdue: boolean;
}

export interface GenerateResult {
  scheduled_total: number;
  kind_breakdown: {
    thank_you: number;
    qualify: number;
    ask_referral: number;
  };
}

// Labels for follow-up kinds
export const POST_EVENT_FOLLOWUP_LABELS: Record<PostEventFollowupKind, string> = {
  thank_you: "Agradecer",
  qualify: "Qualificar",
  ask_referral: "Pedir indicação",
};

export const POST_EVENT_FOLLOWUP_DESCRIPTIONS: Record<PostEventFollowupKind, string> = {
  thank_you: "Agradeça pela presença no evento",
  qualify: "Descubra o nível de apoio do contato",
  ask_referral: "Peça indicação de novos contatos",
};

// Helper to bucket counts for tracking (no PII)
function getBucket(count: number): "1" | "2-3" | "4+" {
  if (count === 1) return "1";
  if (count <= 3) return "2-3";
  return "4+";
}

// Tracking helper
async function logEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[PostEventFollowups] Tracking error:", error);
  }
}

/**
 * Main hook for post-event follow-ups
 */
export function usePostEventFollowups(eventId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get pending post-event follow-ups for current user
  const pendingQuery = useQuery({
    queryKey: ["post-event-followups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase.rpc as any)("get_my_post_event_followups", {
        _limit: 10,
      });

      if (error) throw error;
      return (data || []) as PostEventFollowupItem[];
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 min cache
  });

  // Generate follow-ups for attended contacts
  const generateMutation = useMutation({
    mutationFn: async (targetEventId: string) => {
      const { data, error } = await (supabase.rpc as any)("generate_post_event_followups", {
        _event_id: targetEventId,
      });

      if (error) throw error;
      return data as GenerateResult;
    },
    onSuccess: (result, targetEventId) => {
      queryClient.invalidateQueries({ queryKey: ["post-event-followups"] });
      queryClient.invalidateQueries({ queryKey: ["due-followups"] });
      queryClient.invalidateQueries({ queryKey: ["action-queue"] });
      queryClient.invalidateQueries({ queryKey: ["event-invites", targetEventId] });
      
      // Track without PII
      logEvent("post_event_followups_generated", {
        event_ref: "present",
        total_bucket: getBucket(result.scheduled_total),
      });

      if (result.scheduled_total > 0) {
        toast.success(`${result.scheduled_total} follow-ups agendados para 12h!`);
      } else {
        toast.info("Nenhum contato novo para agendar");
      }
    },
    onError: (error: Error) => {
      console.error("Error generating follow-ups:", error);
      toast.error("Erro ao agendar follow-ups");
    },
  });

  // Complete a specific follow-up
  const completeMutation = useMutation({
    mutationFn: async ({ targetEventId, contactId }: { targetEventId: string; contactId: string }) => {
      const { data, error } = await (supabase.rpc as any)("complete_post_event_followup", {
        _event_id: targetEventId,
        _contact_id: contactId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post-event-followups"] });
      queryClient.invalidateQueries({ queryKey: ["due-followups"] });
      queryClient.invalidateQueries({ queryKey: ["action-queue"] });
      queryClient.invalidateQueries({ queryKey: ["crm-contato", variables.contactId] });
      
      // Track without PII
      logEvent("post_event_followup_done", { kind: "unknown" });

      toast.success("Follow-up concluído!");
    },
    onError: (error: Error) => {
      console.error("Error completing follow-up:", error);
      toast.error("Erro ao concluir follow-up");
    },
  });

  // Tracking helpers
  const trackOpened = (kind: PostEventFollowupKind) => {
    logEvent("post_event_followup_opened", { kind });
  };

  const trackWhatsAppOpened = (kind: PostEventFollowupKind) => {
    logEvent("post_event_followup_whatsapp_opened", { kind });
  };

  return {
    // Data
    pendingFollowups: pendingQuery.data ?? [],
    isLoading: pendingQuery.isLoading,
    hasPending: (pendingQuery.data?.length ?? 0) > 0,

    // Mutations
    generate: (targetEventId: string) => generateMutation.mutateAsync(targetEventId),
    isGenerating: generateMutation.isPending,
    
    complete: (targetEventId: string, contactId: string) => 
      completeMutation.mutateAsync({ targetEventId, contactId }),
    isCompleting: completeMutation.isPending,

    // Tracking
    trackOpened,
    trackWhatsAppOpened,

    // Refetch
    refetch: pendingQuery.refetch,
  };
}

/**
 * Hook for coordinator metrics
 */
export function usePostEventFollowupMetrics(days: number = 14) {
  return useQuery({
    queryKey: ["post-event-followup-metrics", days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_scope_post_event_followup_metrics", {
        _days: days,
      });

      if (error) throw error;
      return data || [];
    },
    staleTime: 300000, // 5 min cache
  });
}
