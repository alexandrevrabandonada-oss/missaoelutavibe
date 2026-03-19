import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObservability } from "./useObservability";
import { useEffect, useRef } from "react";

export interface ContractCheck {
  key: string;
  ok: boolean;
  detail: string;
}

export interface DbContractHealthResult {
  ok: boolean;
  checks: ContractCheck[];
  failed_keys: string[];
  ts: string;
  error?: string;
}

const FALLBACK_RESULT: DbContractHealthResult = {
  ok: false,
  checks: [],
  failed_keys: [],
  ts: new Date().toISOString(),
  error: "fetch_failed",
};

export function useDbContractHealth() {
  const { report } = useObservability();
  const hasLoggedError = useRef(false);
  const hasLoggedFail = useRef(false);

  const query = useQuery({
    queryKey: ["db-contract-health"],
    queryFn: async (): Promise<DbContractHealthResult> => {
      try {
        const { data, error } = await (supabase.rpc as any)("get_db_contract_health");

        if (error) {
          throw error;
        }

        return data as DbContractHealthResult;
      } catch (err) {
        // Silent fallback - log to observability
        if (!hasLoggedError.current) {
          hasLoggedError.current = true;
          report({
            code: "DB_CONTRACT_HEALTH_FAIL",
            severity: "warn",
            meta: {
              stage: "fetch",
              component: "useDbContractHealth",
            },
          });
        }
        return FALLBACK_RESULT;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });

  // Log when health check fails (ok=false)
  useEffect(() => {
    if (query.data && !query.data.ok && !hasLoggedFail.current && !query.data.error) {
      hasLoggedFail.current = true;
      report({
        code: "DB_CONTRACT_HEALTH_FAIL",
        severity: "warn",
        meta: {
          stage: "check",
          component: "useDbContractHealth",
          hint: query.data.failed_keys?.slice(0, 5).join(",") || "unknown",
        },
      });
    }
  }, [query.data, report]);

  // Track growth event for viewing
  const trackViewed = async () => {
    try {
      await supabase.from("growth_events").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: "db_contract_health_viewed",
        meta: {},
      });
    } catch {
      // Silent
    }
  };

  // Track growth event for failure
  const trackFailed = async (failedKeys: string[]) => {
    try {
      await supabase.from("growth_events").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: "db_contract_health_failed",
        meta: { failed_count: failedKeys.length },
      });
    } catch {
      // Silent
    }
  };

  return {
    data: query.data ?? FALLBACK_RESULT,
    isLoading: query.isLoading,
    refetch: query.refetch,
    trackViewed,
    trackFailed,
  };
}
