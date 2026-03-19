import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingVolunteers: number;
  totalMissions: number;
  completedMissions: number;
  pendingEvidences: number;
  totalCells: number;
  missionsThisWeek: number;
  newUsersThisWeek: number;
  conversionRate: number;
  completionRate: number;
}

export function useAdminStats() {
  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      // Use secure RPC function that validates coordinator access
      const { data, error } = await supabase.rpc('get_admin_stats');
      
      if (error) {
        console.error("Error fetching admin stats:", error);
        throw error;
      }

      const stats = data as {
        totalUsers: number;
        activeUsers: number;
        pendingVolunteers: number;
        totalMissions: number;
        completedMissions: number;
        pendingEvidences: number;
        totalCells: number;
        missionsThisWeek: number;
        newUsersThisWeek: number;
      };

      return {
        ...stats,
        conversionRate: stats.totalUsers ? Math.round(stats.activeUsers / stats.totalUsers * 100) : 0,
        completionRate: stats.totalMissions ? Math.round(stats.completedMissions / stats.totalMissions * 100) : 0,
      } as AdminStats;
    },
    refetchInterval: 30000,
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    refetch: statsQuery.refetch,
  };
}
