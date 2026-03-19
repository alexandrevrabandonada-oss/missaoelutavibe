import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isArchivedMission } from "@/lib/pilotMissionFilter";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

interface CycleMissionLink {
  id: string;
  ciclo_id: string;
  mission_id: string;
  ordem: number;
  added_by: string | null;
  created_at: string;
}

// Access table not yet in generated types
const table = () => (supabase.from as any)("ciclo_missoes_ativas");

/**
 * Hook for managing curated cycle missions (up to 6 per cycle)
 */
export function useCycleMissions(cicloId: string | undefined | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get links for this cycle
  const linksQuery = useQuery({
    queryKey: ["cycle-mission-links", cicloId],
    queryFn: async () => {
      const { data, error } = await table()
        .select("*")
        .eq("ciclo_id", cicloId!)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []) as CycleMissionLink[];
    },
    enabled: !!user?.id && !!cicloId,
  });

  // Get the actual mission objects for linked missions
  const missionIds = linksQuery.data?.map((l) => l.mission_id) ?? [];

  const missionsQuery = useQuery({
    queryKey: ["cycle-active-missions", cicloId, missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .in("id", missionIds);
      if (error) throw error;
      // Sort by the order in links, exclude archived
      const orderMap = new Map(linksQuery.data!.map((l) => [l.mission_id, l.ordem]));
      return (data as Mission[])
        .filter(m => !isArchivedMission(m))
        .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    },
    enabled: !!user?.id && missionIds.length > 0,
  });

  // Add a mission to the cycle
  const addMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const currentLinks = linksQuery.data ?? [];
      if (currentLinks.length >= 6) throw new Error("Máximo de 6 missões por ciclo");
      if (currentLinks.some((l) => l.mission_id === missionId))
        throw new Error("Missão já está no ciclo");

      const { error } = await table().insert({
        ciclo_id: cicloId,
        mission_id: missionId,
        ordem: currentLinks.length,
        added_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-mission-links", cicloId] });
      queryClient.invalidateQueries({ queryKey: ["cycle-active-missions", cicloId] });
    },
  });

  // Remove a mission from the cycle
  const removeMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const { error } = await table()
        .delete()
        .eq("ciclo_id", cicloId!)
        .eq("mission_id", missionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-mission-links", cicloId] });
      queryClient.invalidateQueries({ queryKey: ["cycle-active-missions", cicloId] });
    },
  });

  return {
    activeMissions: missionsQuery.data ?? [],
    links: linksQuery.data ?? [],
    isLoading: linksQuery.isLoading || missionsQuery.isLoading,
    isFull: (linksQuery.data?.length ?? 0) >= 6,
    count: linksQuery.data?.length ?? 0,

    addMission: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    removeMission: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,

    isMissionInCycle: (missionId: string) =>
      (linksQuery.data ?? []).some((l) => l.mission_id === missionId),
  };
}
