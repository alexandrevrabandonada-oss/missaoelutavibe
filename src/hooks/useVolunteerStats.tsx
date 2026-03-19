import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserCells } from "./useUserCells";

export function useVolunteerStats() {
  const { user } = useAuth();
  const { userCellIds } = useUserCells();

  // Available missions count
  const availableMissionsQuery = useQuery({
    queryKey: ["volunteer-stats-available-missions", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("missions")
        .select("*", { count: "exact", head: true })
        .eq("status", "publicada")
        .or(`assigned_to.is.null,assigned_to.eq.${user.id}`);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  // My in-progress missions count
  const inProgressMissionsQuery = useQuery({
    queryKey: ["volunteer-stats-in-progress-missions", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("missions")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .in("status", ["em_andamento", "enviada"]);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  // My pending evidences count
  const pendingEvidencesQuery = useQuery({
    queryKey: ["volunteer-stats-pending-evidences", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("evidences")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pendente");

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  // My open demandas count
  const openDemandasQuery = useQuery({
    queryKey: ["volunteer-stats-open-demandas", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("demandas")
        .select("*", { count: "exact", head: true })
        .eq("criada_por", user.id)
        .in("status", ["nova", "triagem", "atribuida", "agendada"]);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  // Recent debates count (global + user's cells)
  const recentDebatesQuery = useQuery({
    queryKey: ["volunteer-stats-recent-debates", user?.id, userCellIds],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Get debates from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let query = supabase
        .from("topicos")
        .select("*", { count: "exact", head: true })
        .eq("oculto", false)
        .gte("updated_at", sevenDaysAgo.toISOString());

      const { count, error } = await query;

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  const isLoading =
    availableMissionsQuery.isLoading ||
    inProgressMissionsQuery.isLoading ||
    pendingEvidencesQuery.isLoading ||
    openDemandasQuery.isLoading ||
    recentDebatesQuery.isLoading;

  return {
    availableMissions: availableMissionsQuery.data ?? 0,
    inProgressMissions: inProgressMissionsQuery.data ?? 0,
    pendingEvidences: pendingEvidencesQuery.data ?? 0,
    openDemandas: openDemandasQuery.data ?? 0,
    recentDebates: recentDebatesQuery.data ?? 0,
    isLoading,
  };
}
