/**
 * useDailyPlan - Hook for managing the 3-step daily plan
 * 
 * Fetches or generates a daily plan with 3 steps (30s, 5m, 15m)
 * and provides methods to complete steps with optimistic updates.
 * 
 * HARDENING: Silent fallback on RPC errors - never breaks /voluntario/hoje
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useRef } from "react";
import { useObservability } from "./useObservability";

export type StepKey = "step_30s" | "step_5m" | "step_15m";

export type ActionKind = 
  | "invite" 
  | "crm_add" 
  | "followup" 
  | "mission_conversa" 
  | "mission_rua" 
  | "script_copy"
  | "ask_referral"
  | "qualify_contact"
  | "invite_event";

export interface PlanStep {
  step_key: StepKey;
  action_kind: ActionKind;
  action_ref: string;
  completed_at: string | null;
}

export interface DailyPlan {
  day: string;
  steps: PlanStep[];
  generated: boolean;
  isFallback?: boolean;
}

// Get today's date in São Paulo timezone
function getTodaySP(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

// Default fallback steps when RPC fails — pilot-optimized order:
// 1. Convite (30s) → 2. Salvar contato (5m) → 3. Mini-escuta (15m)
function getFallbackPlan(): DailyPlan {
  return {
    day: getTodaySP(),
    steps: [
      { step_key: "step_30s", action_kind: "invite", action_ref: "fallback", completed_at: null },
      { step_key: "step_5m", action_kind: "crm_add", action_ref: "fallback", completed_at: null },
      { step_key: "step_15m", action_kind: "mission_conversa", action_ref: "fallback", completed_at: null },
    ],
    generated: false,
    isFallback: true,
  };
}

// Track growth events
async function logGrowthEvent(eventType: string, meta?: Record<string, unknown>) {
  try {
    await (supabase.rpc as any)("log_growth_event", {
      _event_type: eventType,
      _meta: meta || {},
    });
  } catch (error) {
    console.warn("[useDailyPlan] Tracking error:", error);
  }
}

export function useDailyPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { report } = useObservability();
  const shownTrackedRef = useRef(false);
  const fallbackTrackedRef = useRef(false);

  const queryKey = ["daily-plan", user?.id, getTodaySP()];

  // Fetch or generate daily plan with silent fallback
  const planQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<DailyPlan> => {
      if (!user?.id) return getFallbackPlan();

      try {
        const { data, error } = await (supabase.rpc as any)("get_my_daily_plan", {
          _day: getTodaySP(),
        });

        if (error) {
          console.warn("[useDailyPlan] RPC error, using fallback:", error.message);
          
          // Report to observability (no PII, use allowed meta keys)
          report({
            code: "DAILY_PLAN_RPC_ERROR",
            severity: "warn",
            meta: { 
              stage: "fetch", 
              component: "useDailyPlan",
              hint: error.code || "unknown"
            },
          });

          return getFallbackPlan();
        }

        // Validate response has steps
        if (!data?.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
          console.warn("[useDailyPlan] Invalid response, using fallback");
          return getFallbackPlan();
        }

        return data as DailyPlan;
      } catch (err) {
        console.warn("[useDailyPlan] Unexpected error, using fallback:", err);
        
        // Report to observability
        report({
          code: "DAILY_PLAN_RPC_ERROR",
          severity: "warn",
          meta: { 
            stage: "fetch", 
            component: "useDailyPlan",
            hint: "exception"
          },
        });

        return getFallbackPlan();
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Track fallback usage (once per mount)
  useEffect(() => {
    if (planQuery.data?.isFallback && !fallbackTrackedRef.current) {
      fallbackTrackedRef.current = true;
      logGrowthEvent("daily_plan_failed_fallback_used", { reason: "rpc_error" });
    }
  }, [planQuery.data?.isFallback]);

  // Track plan shown (once per session)
  useEffect(() => {
    if (planQuery.data?.steps && !planQuery.data?.isFallback && !shownTrackedRef.current) {
      shownTrackedRef.current = true;
      const steps = planQuery.data.steps;
      logGrowthEvent("daily_plan_shown", {
        has_30s: !!steps.find(s => s.step_key === "step_30s"),
        has_5m: !!steps.find(s => s.step_key === "step_5m"),
        has_15m: !!steps.find(s => s.step_key === "step_15m"),
      });
    }
  }, [planQuery.data?.steps, planQuery.data?.isFallback]);

  // Complete step mutation with optimistic update
  const completeStepMutation = useMutation({
    mutationFn: async (stepKey: StepKey) => {
      // Don't call RPC if using fallback plan
      if (planQuery.data?.isFallback) {
        return { success: true, fallback: true };
      }

      const { data, error } = await (supabase.rpc as any)("complete_daily_plan_step", {
        _day: getTodaySP(),
        _step_key: stepKey,
      });

      if (error) throw error;
      return data;
    },
    onMutate: async (stepKey) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousPlan = queryClient.getQueryData<DailyPlan>(queryKey);

      // Optimistically update
      if (previousPlan) {
        queryClient.setQueryData<DailyPlan>(queryKey, {
          ...previousPlan,
          steps: previousPlan.steps.map(step =>
            step.step_key === stepKey
              ? { ...step, completed_at: new Date().toISOString() }
              : step
          ),
        });
      }

      return { previousPlan };
    },
    onError: (_err, _stepKey, context) => {
      // Rollback on error
      if (context?.previousPlan) {
        queryClient.setQueryData(queryKey, context.previousPlan);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency (skip if fallback)
      if (!planQuery.data?.isFallback) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  // Track step started
  const trackStepStarted = (stepKey: StepKey, actionKind: ActionKind) => {
    logGrowthEvent("daily_plan_step_started", {
      step_key: stepKey,
      action_kind: actionKind,
    });
  };

  // Complete a step
  const completeStep = (stepKey: StepKey) => {
    return completeStepMutation.mutateAsync(stepKey);
  };

  // Get step by key
  const getStep = (stepKey: StepKey): PlanStep | undefined => {
    return planQuery.data?.steps?.find(s => s.step_key === stepKey);
  };

  // Check if all steps are completed
  const allCompleted = planQuery.data?.steps?.every(s => s.completed_at !== null) ?? false;

  // Count completed steps
  const completedCount = planQuery.data?.steps?.filter(s => s.completed_at !== null).length ?? 0;

  return {
    plan: planQuery.data,
    steps: planQuery.data?.steps ?? [],
    isLoading: planQuery.isLoading,
    isError: false, // Never expose error state - we have fallback
    isFallback: planQuery.data?.isFallback ?? false,
    getStep,
    completeStep,
    trackStepStarted,
    isCompleting: completeStepMutation.isPending,
    allCompleted,
    completedCount,
    refetch: planQuery.refetch,
  };
}
