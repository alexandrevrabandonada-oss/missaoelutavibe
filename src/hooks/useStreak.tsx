/**
 * useStreak - Hook for "Hábito de Luta (3 dias)" streak tracking
 * 
 * Fetches streak metrics from RPC, caches per session, and handles tracking.
 * Follows privacy-first approach: no PII in events.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface StreakMetrics {
  current_streak: number;
  last_active_date: string | null;
  days_in_last_7: number;
  goal3_progress: number; // 0–3
  goal3_completed_before: boolean;
  is_active_today: boolean;
}

// Track streak events (no PII)
async function logStreakEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[Streak] Tracking error:", error);
  }
}

export function useStreak() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Track if we've logged "viewed" and "goal3_completed" this session
  const viewedTrackedRef = useRef(false);
  const goal3TrackedRef = useRef(false);

  // Fetch streak metrics from RPC
  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["streak-metrics", user?.id],
    queryFn: async (): Promise<StreakMetrics | null> => {
      if (!user?.id) return null;

      const { data, error } = await (supabase.rpc as any)("get_my_streak_metrics");

      if (error) {
        console.warn("[Streak] RPC error:", error);
        return null;
      }

      return data as StreakMetrics;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1, // Only retry once
    refetchOnWindowFocus: false,
  });

  // Track card viewed (1x/day deduped via session)
  const trackViewed = useCallback(() => {
    if (viewedTrackedRef.current) return;
    viewedTrackedRef.current = true;
    logStreakEvent("streak_card_viewed", {
      goal3_progress: metrics?.goal3_progress || 0,
      current_streak: metrics?.current_streak || 0,
    });
  }, [metrics?.goal3_progress, metrics?.current_streak]);

  // Track goal3 completed (1x ever, dedupe via goal3_completed_before)
  useEffect(() => {
    if (!metrics) return;
    if (goal3TrackedRef.current) return;
    
    // Fire only when reaching 3 for the first time
    if (metrics.goal3_progress >= 3 && !metrics.goal3_completed_before) {
      goal3TrackedRef.current = true;
      logStreakEvent("streak_goal3_completed", {
        current_streak: metrics.current_streak,
        days_in_last_7: metrics.days_in_last_7,
      });
    }
  }, [metrics]);

  // Track info opened
  const trackInfoOpened = useCallback(() => {
    logStreakEvent("streak_info_opened", {
      goal3_progress: metrics?.goal3_progress || 0,
    });
  }, [metrics?.goal3_progress]);

  // Get message based on progress
  const getMessage = useCallback(() => {
    if (!metrics) return "";
    
    const { goal3_progress, current_streak } = metrics;
    
    if (goal3_progress === 0) {
      return "Faz 30s hoje e conta.";
    } else if (goal3_progress === 1) {
      return "Boa! Mais 2 dias pra firmar.";
    } else if (goal3_progress === 2) {
      return "Tá perto: amanhã fecha 3.";
    } else {
      // 3+ days
      if (current_streak > 7) {
        return `${current_streak} dias no ritmo. Você é raiz.`;
      }
      return "Você tá no ritmo. Mantém leve.";
    }
  }, [metrics]);

  // Invalidate cache after action completion (called externally)
  const invalidateStreak = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["streak-metrics"] });
  }, [queryClient]);

  return {
    metrics,
    isLoading,
    hasError: !!error,
    refetch,
    trackViewed,
    trackInfoOpened,
    getMessage,
    invalidateStreak,
    // Convenience getters
    goalProgress: metrics?.goal3_progress ?? 0,
    currentStreak: metrics?.current_streak ?? 0,
    isActiveToday: metrics?.is_active_today ?? false,
  };
}
