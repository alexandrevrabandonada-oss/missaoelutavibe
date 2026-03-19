import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCallback, useRef } from "react";

export interface ValidationFeedbackItem {
  evidence_id: string;
  mission_id: string;
  mission_title: string;
  status: "validado" | "rejeitado";
  reason_code: string | null;
  reason_text: string | null;
  how_to_fix: string | null;
  validated_at: string;
  href: string;
}

export const REJECTION_REASON_LABELS: Record<string, string> = {
  foto_ruim: "Foto precisa melhorar",
  falta_contexto: "Falta contexto",
  sem_prova: "Ação não identificada",
  outro: "Outro motivo",
};

// Get São Paulo day key for dedup
function getSPDayKey(): string {
  const now = new Date();
  const spTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return spTime.toISOString().split("T")[0];
}

export function useValidationFeedback(limit: number = 5) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const viewedTodayRef = useRef<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["validation-feedback", limit],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_validation_feedback", {
        p_limit: limit,
      });
      if (error) throw error;
      return (data?.items || []) as ValidationFeedbackItem[];
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });

  // Track view (dedup by day)
  const trackView = useCallback(async () => {
    if (!data || data.length === 0) return;
    
    const dayKey = getSPDayKey();
    if (viewedTodayRef.current === dayKey) return;
    
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: "validation_feedback_shown",
        _meta: { count: data.length },
      });
      viewedTodayRef.current = dayKey;
    } catch (err) {
      console.warn("Failed to track validation feedback view:", err);
    }
  }, [data]);

  // Track opening a specific feedback
  const trackOpen = useCallback(async (status: string) => {
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: "validation_feedback_opened",
        _meta: { status },
      });
    } catch (err) {
      console.warn("Failed to track validation feedback open:", err);
    }
  }, []);

  // Track resubmit click
  const trackResubmitClick = useCallback(async (reasonCode: string | null) => {
    try {
      await (supabase.rpc as any)("log_growth_event", {
        _event_type: "evidence_resubmit_clicked",
        _meta: { reason_code: reasonCode },
      });
    } catch (err) {
      console.warn("Failed to track resubmit click:", err);
    }
  }, []);

  // Filter by status
  const approvedItems = data?.filter(item => item.status === "validado") || [];
  const rejectedItems = data?.filter(item => item.status === "rejeitado") || [];

  // Check if there are any items to show
  const hasItems = data && data.length > 0;

  return {
    items: data || [],
    approvedItems,
    rejectedItems,
    hasItems,
    isLoading,
    error,
    refetch,
    trackView,
    trackOpen,
    trackResubmitClick,
  };
}
