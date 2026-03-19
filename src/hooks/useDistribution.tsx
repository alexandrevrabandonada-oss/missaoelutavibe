import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DistributionMetrics {
  links_abertos_7d: number;
  links_abertos_30d: number;
  top_cidades: Array<{
    cidade: string;
    count: number;
  }>;
  top_sources: Array<{
    source: string;
    count: number;
  }>;
}

export function useDistributionMetrics(periodDays: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["distribution-metrics", periodDays],
    queryFn: async (): Promise<DistributionMetrics> => {
      const now = new Date();
      const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const date30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get territory_link_open events
      const { data: events7d, error: error7d } = await supabase
        .from("growth_events")
        .select("id, meta")
        .eq("event_type", "territory_link_open")
        .gte("occurred_at", date7d);

      const { data: events30d, error: error30d } = await supabase
        .from("growth_events")
        .select("id, meta")
        .eq("event_type", "territory_link_open")
        .gte("occurred_at", date30d);

      if (error7d || error30d) {
        console.error("Error fetching distribution metrics:", error7d || error30d);
        throw error7d || error30d;
      }

      // Count by cidade from meta
      const cidadeCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {};

      (events30d || []).forEach((event) => {
        const meta = event.meta as Record<string, any> | null;
        if (meta?.cidade) {
          cidadeCounts[meta.cidade] = (cidadeCounts[meta.cidade] || 0) + 1;
        }
        if (meta?.utm_source) {
          sourceCounts[meta.utm_source] = (sourceCounts[meta.utm_source] || 0) + 1;
        }
      });

      // Sort and get top 5
      const topCidades = Object.entries(cidadeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cidade, count]) => ({ cidade, count }));

      const topSources = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([source, count]) => ({ source, count }));

      return {
        links_abertos_7d: events7d?.length || 0,
        links_abertos_30d: events30d?.length || 0,
        top_cidades: topCidades,
        top_sources: topSources,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}

// Helper to get prefill city from sessionStorage
export function getPrefillCidade(): string | null {
  try {
    return sessionStorage.getItem("prefill_cidade");
  } catch {
    return null;
  }
}

// Helper to clear prefill city
export function clearPrefillCidade(): void {
  try {
    sessionStorage.removeItem("prefill_cidade");
  } catch {
    // ignore
  }
}

// Helper to get stored UTM params
export function getStoredUtmParams(): Record<string, string> | null {
  try {
    const stored = sessionStorage.getItem("utm_params");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
