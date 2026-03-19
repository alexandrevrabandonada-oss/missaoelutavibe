import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObservability } from "./useObservability";
import { useEffect, useRef } from "react";

export interface NorthStarScope {
  kind: "global" | "city" | "cell";
  value?: string;
}

export interface NorthStarMetrics {
  window_days: number;
  scope: { kind: string; value: string | null };
  period: { start: string; end: string };
  // Counts
  signup_count: number;
  approved_count: number;
  active_count: number;
  actions_completed: number;
  share_count: number;
  crm_contacts_created: number;
  crm_contacts_qualified: number;
  crm_support_hot: number;
  event_invites: number;
  event_rsvp_going: number;
  event_attended: number;
  return_completed: number;
  // Rates
  activation_rate: number;
  action_per_active: number;
  share_rate: number;
  crm_rate: number;
  qualify_rate: number;
  hot_support_rate: number;
  event_conversion: number;
  // Deltas (if available)
  delta_activation_rate?: number;
  delta_share_rate?: number;
  delta_crm_rate?: number;
  delta_qualify_rate?: number;
  delta_hot_support_rate?: number;
  delta_event_conversion?: number;
  has_deltas?: boolean;
  ts: string;
  error?: string;
}

export interface NorthStarAlert {
  key: string;
  severity: "warn" | "critical";
  value: number;
  target: number;
  hint: string;
}

export interface NorthStarAlertsResult {
  window_days: number;
  scope: { kind: string; value: string | null };
  alerts: NorthStarAlert[];
  alert_count: number;
  has_critical: boolean;
  ts: string;
  error?: string;
}

const FALLBACK_METRICS: NorthStarMetrics = {
  window_days: 7,
  scope: { kind: "global", value: null },
  period: { start: "", end: "" },
  signup_count: 0,
  approved_count: 0,
  active_count: 0,
  actions_completed: 0,
  share_count: 0,
  crm_contacts_created: 0,
  crm_contacts_qualified: 0,
  crm_support_hot: 0,
  event_invites: 0,
  event_rsvp_going: 0,
  event_attended: 0,
  return_completed: 0,
  activation_rate: 0,
  action_per_active: 0,
  share_rate: 0,
  crm_rate: 0,
  qualify_rate: 0,
  hot_support_rate: 0,
  event_conversion: 0,
  ts: new Date().toISOString(),
  error: "fetch_failed",
};

const FALLBACK_ALERTS: NorthStarAlertsResult = {
  window_days: 7,
  scope: { kind: "global", value: null },
  alerts: [],
  alert_count: 0,
  has_critical: false,
  ts: new Date().toISOString(),
  error: "fetch_failed",
};

export function useNorthStarMetrics(windowDays: number = 7, scope?: NorthStarScope) {
  const { report } = useObservability();
  const hasLoggedError = useRef(false);

  const scopeParam = scope ? { kind: scope.kind, value: scope.value } : null;

  const query = useQuery({
    queryKey: ["north-star-metrics", windowDays, scopeParam],
    queryFn: async (): Promise<NorthStarMetrics> => {
      try {
        const { data, error } = await (supabase.rpc as any)("get_north_star_deltas", {
          _window_days: windowDays,
          _scope: scopeParam,
        });

        if (error) throw error;
        return data as NorthStarMetrics;
      } catch (err) {
        if (!hasLoggedError.current) {
          hasLoggedError.current = true;
          report({
            code: "NORTH_STAR_METRICS_FAIL",
            severity: "warn",
            meta: {
              stage: "fetch",
              component: "useNorthStarMetrics",
            },
          });
        }
        return { ...FALLBACK_METRICS, window_days: windowDays };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });

  // Track view
  const trackViewed = async () => {
    try {
      await supabase.from("growth_events").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: "north_star_viewed",
        meta: { 
          window_days: windowDays, 
          scope_kind: scope?.kind || "global" 
        },
      });
    } catch {
      // Silent
    }
  };

  return {
    data: query.data ?? { ...FALLBACK_METRICS, window_days: windowDays },
    isLoading: query.isLoading,
    refetch: query.refetch,
    trackViewed,
  };
}

export function useNorthStarAlerts(windowDays: number = 7, scope?: NorthStarScope) {
  const { report } = useObservability();
  const hasLoggedError = useRef(false);
  const hasLoggedAlerts = useRef(false);

  const scopeParam = scope ? { kind: scope.kind, value: scope.value } : null;

  const query = useQuery({
    queryKey: ["north-star-alerts", windowDays, scopeParam],
    queryFn: async (): Promise<NorthStarAlertsResult> => {
      try {
        const { data, error } = await (supabase.rpc as any)("get_north_star_alerts", {
          _window_days: windowDays,
          _scope: scopeParam,
        });

        if (error) throw error;
        return data as NorthStarAlertsResult;
      } catch (err) {
        if (!hasLoggedError.current) {
          hasLoggedError.current = true;
          report({
            code: "NORTH_STAR_ALERTS_FAIL",
            severity: "warn",
            meta: {
              stage: "fetch",
              component: "useNorthStarAlerts",
            },
          });
        }
        return { ...FALLBACK_ALERTS, window_days: windowDays };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Log when alerts exist
  useEffect(() => {
    const alerts = query.data?.alerts || [];
    if (alerts.length > 0 && !hasLoggedAlerts.current && !query.data?.error) {
      hasLoggedAlerts.current = true;
      
      // Log to app_errors
      report({
        code: "NORTH_STAR_ALERT",
        severity: "warn",
        meta: {
          hint: alerts.map((a: NorthStarAlert) => a.key).slice(0, 5).join(","),
          mode: String(windowDays),
        },
      });

      // Track growth event (fire and forget)
      const trackAlert = async () => {
        try {
          const { data: userData } = await supabase.auth.getUser();
          await supabase.from("growth_events").insert({
            user_id: userData.user?.id,
            event_type: "north_star_alerts_shown",
            meta: { 
              count: alerts.length, 
              window_days: windowDays,
              scope_kind: scope?.kind || "global",
            },
          });
        } catch {
          // Silent
        }
      };
      trackAlert();
    }
  }, [query.data, report, windowDays, scope]);

  // Track copy click
  const trackCopyClicked = async () => {
    try {
      await supabase.from("growth_events").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: "north_star_copy_clicked",
        meta: {},
      });
    } catch {
      // Silent
    }
  };

  // Track action click
  const trackActionClicked = async (key: string) => {
    try {
      await supabase.from("growth_events").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: "north_star_recommended_action_clicked",
        meta: { key },
      });
    } catch {
      // Silent
    }
  };

  return {
    data: query.data ?? { ...FALLBACK_ALERTS, window_days: windowDays },
    isLoading: query.isLoading,
    refetch: query.refetch,
    trackCopyClicked,
    trackActionClicked,
  };
}
