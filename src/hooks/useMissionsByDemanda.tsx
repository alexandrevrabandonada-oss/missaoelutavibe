import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

/**
 * Hook to get missions that originated from specific demands
 * Useful for showing "Virou missão" badge on demand cards
 */
export function useMissionsByDemandas(demandaIds: string[]) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["missions-by-demandas", demandaIds],
    queryFn: async () => {
      if (demandaIds.length === 0) return {};

      const { data, error } = await supabase
        .from("missions")
        .select("id, title, status, demanda_origem_id")
        .in("demanda_origem_id", demandaIds);

      if (error) throw error;

      // Map demanda_id -> mission
      const demandaToMission: Record<string, Mission> = {};
      (data || []).forEach((m: any) => {
        if (m.demanda_origem_id) {
          demandaToMission[m.demanda_origem_id] = m;
        }
      });

      return demandaToMission;
    },
    enabled: !!user?.id && demandaIds.length > 0,
  });

  return {
    demandaToMission: query.data ?? {},
    isLoading: query.isLoading,
  };
}
