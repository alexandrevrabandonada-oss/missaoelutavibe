import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useLogGrowthEvent } from "./useGrowth";
import { useEffect, useRef } from "react";

export interface ImpactMetrics {
  ok: boolean;
  actions_completed: number;
  contacts_added: number;
  invites_shared: number;
  current_streak: number;
  goal_label: string;
  goal_progress: number;
  goal_target: number;
  window_days: number;
  error?: string;
}

const FALLBACK_METRICS: ImpactMetrics = {
  ok: false,
  actions_completed: 0,
  contacts_added: 0,
  invites_shared: 0,
  current_streak: 0,
  goal_label: "Meta da semana: 3 ações",
  goal_progress: 0,
  goal_target: 3,
  window_days: 7,
  error: "fallback",
};

export function useImpactMetrics(windowDays: number = 7) {
  const { user } = useAuth();
  const logEvent = useLogGrowthEvent();
  const hasTrackedView = useRef(false);

  const query = useQuery({
    queryKey: ["impact_metrics", user?.id, windowDays],
    queryFn: async (): Promise<ImpactMetrics> => {
      if (!user) return FALLBACK_METRICS;

      const { data, error } = await supabase.rpc("get_my_impact_metrics", {
        _window_days: windowDays,
      });

      if (error) {
        console.warn("Failed to fetch impact metrics:", error);
        return FALLBACK_METRICS;
      }

      return data as unknown as ImpactMetrics;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Track view once per session
  useEffect(() => {
    if (query.data?.ok && !hasTrackedView.current) {
      hasTrackedView.current = true;
      logEvent.mutate({
        eventType: "impact_viewed",
        meta: { window_days: windowDays },
      });
    }
  }, [query.data?.ok, windowDays, logEvent]);

  const trackShareOpened = (format: "1:1" | "4:5") => {
    logEvent.mutate({
      eventType: "impact_share_opened",
      meta: { format },
    });
  };

  const trackShared = (format: "1:1" | "4:5") => {
    logEvent.mutate({
      eventType: "impact_shared",
      meta: { format },
    });
  };

  const trackCtaClicked = (cta: "agir_agora" | "convidar") => {
    logEvent.mutate({
      eventType: "impact_cta_clicked",
      meta: { cta },
    });
  };

  const trackInfoOpened = () => {
    logEvent.mutate({
      eventType: "impact_info_opened",
      meta: {},
    });
  };

  return {
    metrics: query.data ?? FALLBACK_METRICS,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    trackShareOpened,
    trackShared,
    trackCtaClicked,
    trackInfoOpened,
  };
}
