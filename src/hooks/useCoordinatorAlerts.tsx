/**
 * useCoordinatorAlerts - Coordinator Playbooks v0
 * 
 * Fetches scoped alerts for coordinators with dismissal support.
 */

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useObservability } from "./useObservability";
import { useLogGrowthEvent } from "./useGrowth";

export interface CoordinatorAlert {
  key: string;
  severity: "warn" | "critical";
  hint: string;
  delta_percent?: number;
}

interface AlertsResult {
  ok: boolean;
  alerts: CoordinatorAlert[];
  scope_kind: string;
  scope_value: string;
  reason?: string;
}

export function useCoordinatorAlerts(windowDays: number = 7) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { report } = useObservability();
  const logGrowthEvent = useLogGrowthEvent();

  const track = useCallback(
    (eventType: string, meta?: Record<string, any>) => {
      logGrowthEvent.mutate({ eventType, meta });
    },
    [logGrowthEvent]
  );

  // Fetch alerts with dismissal filter applied
  const alertsQuery = useQuery({
    queryKey: ["coordinator-alerts", user?.id, windowDays],
    queryFn: async (): Promise<AlertsResult> => {
      try {
        const { data, error } = await (supabase.rpc as any)("get_my_coordinator_alerts", {
          _window_days: windowDays,
        });

        if (error) throw error;

        const result = data as AlertsResult;
        
        // Track alerts shown
        if (result.ok && result.alerts.length > 0) {
          track("coordinator_alerts_shown", {
            windowDays,
            count: result.alerts.length,
            scope_kind: result.scope_kind,
          });
        }

        return result;
      } catch (err) {
        report({
          code: "COORD_ALERTS_ERROR",
          severity: "warn",
          meta: { stage: "fetch" },
        });
        return {
          ok: false,
          alerts: [],
          scope_kind: "unknown",
          scope_value: "unknown",
          reason: "fetch_failed",
        };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Dismiss alert mutation
  const dismissMutation = useMutation({
    mutationFn: async ({ alertKey, hours = 24 }: { alertKey: string; hours?: number }) => {
      const { data, error } = await (supabase.rpc as any)("dismiss_coordinator_alert", {
        _alert_key: alertKey,
        _hours: hours,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["coordinator-alerts"] });
      track("coordinator_alert_dismissed", {
        alert_key: variables.alertKey,
        hours: variables.hours || 24,
      });
    },
    onError: (err) => {
      report({
        code: "COORD_ALERTS_ERROR",
        severity: "warn",
        meta: { stage: "dismiss" },
      });
    },
  });

  // Track opening an alert
  const trackAlertOpened = useCallback(
    (alertKey: string, scopeKind: string) => {
      track("coordinator_alert_opened", {
        alert_key: alertKey,
        scope_kind: scopeKind,
      });
    },
    [track]
  );

  // Track copying a message
  const trackCopyClicked = useCallback(
    (alertKey: string, variant: "short" | "mid" | "leader") => {
      track("coordinator_alert_copy_clicked", {
        alert_key: alertKey,
        variant,
      });
    },
    [track]
  );

  // Track creating announcement
  const trackCreateAnnouncementClicked = useCallback(
    (alertKey: string) => {
      track("coordinator_alert_create_announcement_clicked", {
        alert_key: alertKey,
      });
    },
    [track]
  );

  // Track opening action link
  const trackOpenActionClicked = useCallback(
    (alertKey: string, target: string) => {
      track("coordinator_alert_open_action_clicked", {
        alert_key: alertKey,
        target,
      });
    },
    [track]
  );

  return {
    alerts: alertsQuery.data?.alerts || [],
    scopeKind: alertsQuery.data?.scope_kind || "unknown",
    scopeValue: alertsQuery.data?.scope_value || "unknown",
    isLoading: alertsQuery.isLoading,
    isError: alertsQuery.isError || (alertsQuery.data?.ok === false),
    refetch: alertsQuery.refetch,
    
    // Dismiss
    dismissAlert: dismissMutation.mutateAsync,
    isDismissing: dismissMutation.isPending,
    
    // Tracking
    trackAlertOpened,
    trackCopyClicked,
    trackCreateAnnouncementClicked,
    trackOpenActionClicked,
  };
}
