import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;
type MissionInsert = TablesInsert<"missions">;

export function useMissions(cicloId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get missions filtered by cycle if provided
  const missionsQuery = useQuery({
    queryKey: ["missions", user?.id, cicloId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from("missions")
        .select("*")
        .order("created_at", { ascending: false });
      
      // If cycle is provided, filter by it
      if (cicloId) {
        query = query.eq("ciclo_id", cicloId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Mission[];
    },
    enabled: !!user?.id,
  });

  // Get fallback missions (last 7 days, no cycle filter) for when there's no active cycle
  const fallbackMissionsQuery = useQuery({
    queryKey: ["missions-fallback", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("status", "publicada")
        .or(`ciclo_id.is.null,created_at.gte.${sevenDaysAgo.toISOString()}`)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Mission[];
    },
    enabled: !!user?.id && !cicloId,
  });

  const currentMissionQuery = useQuery({
    queryKey: ["current-mission", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("assigned_to", user.id)
        .in("status", ["publicada", "em_andamento", "enviada"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as Mission | null;
    },
    enabled: !!user?.id,
  });

  const createMissionMutation = useMutation({
    mutationFn: async (mission: MissionInsert) => {
      const { data, error } = await supabase
        .from("missions")
        .insert(mission)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["current-mission"] });
    },
  });

  const createMissionAsync = async (mission: MissionInsert) => {
    const { data, error } = await supabase
      .from("missions")
      .insert(mission)
      .select()
      .single();
    
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["missions"] });
    queryClient.invalidateQueries({ queryKey: ["current-mission"] });
    return data;
  };

  const updateMissionStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Mission["status"] }) => {
      const { data, error } = await supabase
        .from("missions")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["current-mission"] });
    },
  });

  return {
    missions: missionsQuery.data ?? [],
    fallbackMissions: fallbackMissionsQuery.data ?? [],
    currentMission: currentMissionQuery.data,
    isLoading: missionsQuery.isLoading,
    isLoadingFallback: fallbackMissionsQuery.isLoading,
    isLoadingCurrent: currentMissionQuery.isLoading,
    createMission: createMissionAsync,
    isCreating: createMissionMutation.isPending,
    updateStatus: updateMissionStatus.mutate,
  };
}
