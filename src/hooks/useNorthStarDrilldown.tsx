/**
 * useNorthStarDrilldown - North Star Drilldown + Cohorts v0
 * 
 * Fetches funnel breakdown and cohort data for coordinators.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObservability } from "./useObservability";
import { useLogGrowthEvent } from "./useGrowth";
import { useCallback } from "react";

// Types
export interface DrilldownMetrics {
  signup: number;
  approved: number;
  checkin_submitted: number;
  next_action_started: number;
  next_action_completed: number;
  invite_shared: number;
  contact_created: number;
  support_qualified: number;
  event_invites_created: number;
  event_attended_marked: number;
}

export interface DrilldownBreakdown {
  label: string;
  total: number;
  active: number;
}

export interface DrilldownResult {
  ok: boolean;
  window_days: number;
  scope: { kind: string; value: string | null };
  period: { start: string; end: string };
  current: DrilldownMetrics;
  previous: Partial<DrilldownMetrics>;
  breakdown: DrilldownBreakdown[];
  ts: string;
  reason?: string;
}

export interface CohortMember {
  user_id: string;
  display_name: string;
  city: string | null;
  cell: string | null;
  last_action_at: string | null;
  status_resumo: string;
}

export interface CohortResult {
  ok: boolean;
  alert_key: string;
  window_days: number;
  scope: { kind: string; value: string | null };
  cohort: CohortMember[];
  count: number;
  ts: string;
  reason?: string;
}

export interface CohortTemplates {
  short: string;
  mid: string;
  leader: string;
}

export interface TemplatesResult {
  ok: boolean;
  alert_key: string;
  mode: string;
  templates: CohortTemplates;
  ts: string;
  reason?: string;
}

const FALLBACK_DRILLDOWN: DrilldownResult = {
  ok: false,
  window_days: 7,
  scope: { kind: "global", value: null },
  period: { start: "", end: "" },
  current: {
    signup: 0,
    approved: 0,
    checkin_submitted: 0,
    next_action_started: 0,
    next_action_completed: 0,
    invite_shared: 0,
    contact_created: 0,
    support_qualified: 0,
    event_invites_created: 0,
    event_attended_marked: 0,
  },
  previous: {},
  breakdown: [],
  ts: new Date().toISOString(),
  reason: "fetch_failed",
};

const FALLBACK_COHORT: CohortResult = {
  ok: false,
  alert_key: "",
  window_days: 7,
  scope: { kind: "global", value: null },
  cohort: [],
  count: 0,
  ts: new Date().toISOString(),
  reason: "fetch_failed",
};

const FALLBACK_TEMPLATES: TemplatesResult = {
  ok: false,
  alert_key: "",
  mode: "pre",
  templates: { short: "", mid: "", leader: "" },
  ts: new Date().toISOString(),
  reason: "fetch_failed",
};

export function useNorthStarDrilldown(
  windowDays: number = 7,
  scopeKind: string = "global",
  scopeValue: string | null = null
) {
  const { report } = useObservability();
  const logGrowthEvent = useLogGrowthEvent();

  const query = useQuery({
    queryKey: ["north-star-drilldown", windowDays, scopeKind, scopeValue],
    queryFn: async (): Promise<DrilldownResult> => {
      try {
        const { data, error } = await (supabase.rpc as any)("get_north_star_drilldown", {
          _window_days: windowDays,
          _scope_kind: scopeKind,
          _scope_value: scopeValue,
        });

        if (error) throw error;
        return data as DrilldownResult;
      } catch (err) {
        report({
          code: "NORTH_STAR_DRILLDOWN_FAIL",
          severity: "warn",
          meta: { stage: "fetch", component: "useNorthStarDrilldown" },
        });
        return { ...FALLBACK_DRILLDOWN, window_days: windowDays };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const trackOpened = useCallback(
    (alertKey: string) => {
      logGrowthEvent.mutate({
        eventType: "north_star_drilldown_opened",
        meta: { alert_key: alertKey, window_days: windowDays, scope_kind: scopeKind },
      });
    },
    [logGrowthEvent, windowDays, scopeKind]
  );

  return {
    data: query.data ?? { ...FALLBACK_DRILLDOWN, window_days: windowDays },
    isLoading: query.isLoading,
    refetch: query.refetch,
    trackOpened,
  };
}

export function useCohortForAlert(alertKey: string, windowDays: number = 7, enabled: boolean = true) {
  const { report } = useObservability();
  const logGrowthEvent = useLogGrowthEvent();

  const query = useQuery({
    queryKey: ["cohort-for-alert", alertKey, windowDays],
    queryFn: async (): Promise<CohortResult> => {
      try {
        const { data, error } = await (supabase.rpc as any)("get_cohort_for_alert", {
          _alert_key: alertKey,
          _window_days: windowDays,
        });

        if (error) throw error;
        
        const result = data as CohortResult;
        
        // Track cohort viewed
        if (result.ok && result.count > 0) {
          logGrowthEvent.mutate({
            eventType: "north_star_cohort_viewed",
            meta: { alert_key: alertKey, count: result.count },
          });
        }

        return result;
      } catch (err) {
        report({
          code: "NORTH_STAR_COHORT_FAIL",
          severity: "warn",
          meta: { stage: "fetch", component: "useCohortForAlert" },
        });
        return { ...FALLBACK_COHORT, alert_key: alertKey, window_days: windowDays };
      }
    },
    enabled: enabled && !!alertKey,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const trackMessageCopied = useCallback(
    (variant: "short" | "mid" | "leader") => {
      logGrowthEvent.mutate({
        eventType: "north_star_cohort_message_copied",
        meta: { alert_key: alertKey, variant },
      });
    },
    [logGrowthEvent, alertKey]
  );

  const trackWhatsAppOpened = useCallback(() => {
    logGrowthEvent.mutate({
      eventType: "north_star_cohort_whatsapp_opened",
      meta: { alert_key: alertKey },
    });
  }, [logGrowthEvent, alertKey]);

  return {
    data: query.data ?? { ...FALLBACK_COHORT, alert_key: alertKey, window_days: windowDays },
    isLoading: query.isLoading,
    refetch: query.refetch,
    trackMessageCopied,
    trackWhatsAppOpened,
  };
}

export function useCohortMessageTemplates(alertKey: string, enabled: boolean = true) {
  const { report } = useObservability();

  const query = useQuery({
    queryKey: ["cohort-message-templates", alertKey],
    queryFn: async (): Promise<TemplatesResult> => {
      try {
        const { data, error } = await (supabase.rpc as any)("get_cohort_message_templates", {
          _alert_key: alertKey,
        });

        if (error) throw error;
        return data as TemplatesResult;
      } catch (err) {
        report({
          code: "NORTH_STAR_TEMPLATES_FAIL",
          severity: "warn",
          meta: { stage: "fetch", component: "useCohortMessageTemplates" },
        });
        return { ...FALLBACK_TEMPLATES, alert_key: alertKey };
      }
    },
    enabled: enabled && !!alertKey,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    data: query.data ?? { ...FALLBACK_TEMPLATES, alert_key: alertKey },
    isLoading: query.isLoading,
  };
}
