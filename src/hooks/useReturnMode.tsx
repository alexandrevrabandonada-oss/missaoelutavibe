/**
 * useReturnMode - Hook for 48h+ inactive user reactivation
 * 
 * Fetches reactivation status and provides tracking + actions
 * for the Return Mode flow.
 */

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ReactivationStatus {
  is_at_risk: boolean;
  hours_since_last_action: number;
  suggested_micro_action_kind: "contact" | "followup" | "mission";
  suggested_micro_action_cta: string;
  reason: string | null;
}

// Track return mode events (no PII)
async function logReturnModeEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[ReturnMode] Tracking error:", error);
  }
}

// Update last action after completing any action
export async function updateLastAction(kind: string) {
  try {
    await supabase.rpc("update_last_action", { _kind: kind });
  } catch (error) {
    console.warn("[ReturnMode] Update last action error:", error);
  }
}

export function useReturnMode() {
  const { user } = useAuth();
  const shownTrackedRef = useRef(false);
  const startTimeRef = useRef<Date | null>(null);

  const statusQuery = useQuery({
    queryKey: ["reactivation-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_reactivation_status");
      if (error) throw error;
      return data as unknown as ReactivationStatus;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });

  const isAtRisk = statusQuery.data?.is_at_risk ?? false;
  const hoursSinceLastAction = statusQuery.data?.hours_since_last_action ?? 0;
  const suggestedKind = statusQuery.data?.suggested_micro_action_kind ?? "contact";
  const suggestedCta = statusQuery.data?.suggested_micro_action_cta ?? "Salvar 1 contato";

  // Track shown once per day
  useEffect(() => {
    if (isAtRisk && !shownTrackedRef.current) {
      shownTrackedRef.current = true;
      logReturnModeEvent("return_mode_shown", {
        hours_inactive: hoursSinceLastAction,
      });
    }
  }, [isAtRisk, hoursSinceLastAction]);

  // Track when user starts a micro action
  const trackStarted = useCallback((kind: string) => {
    startTimeRef.current = new Date();
    logReturnModeEvent("return_mode_started", { kind });
  }, []);

  // Track when user completes a micro action
  const trackCompleted = useCallback((kind: string) => {
    const durationSeconds = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current.getTime()) / 1000)
      : 0;
    
    logReturnModeEvent("return_mode_completed", {
      kind,
      duration_seconds: durationSeconds,
    });
    startTimeRef.current = null;

    // Update last action
    updateLastAction(kind);
  }, []);

  // Track dismissed
  const trackDismissed = useCallback(() => {
    logReturnModeEvent("return_mode_dismissed", {});
  }, []);

  // Track help opened
  const trackHelpOpened = useCallback(() => {
    logReturnModeEvent("return_mode_help_opened", {});
  }, []);

  return {
    // Status
    isAtRisk,
    hoursSinceLastAction,
    suggestedKind,
    suggestedCta,
    isLoading: statusQuery.isLoading,
    
    // Tracking
    trackStarted,
    trackCompleted,
    trackDismissed,
    trackHelpOpened,
    
    // Refetch
    refetch: statusQuery.refetch,
  };
}
