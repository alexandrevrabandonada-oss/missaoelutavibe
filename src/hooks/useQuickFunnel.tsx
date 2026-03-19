import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface QuickFunnelMetrics {
  // Last 7 days
  signup: number;
  approved: number;
  checkin_submitted: number;
  next_action_completed: number;
  invite_shared: number;
  contact_created: number;
  // Today (D0)
  checkins_today: number;
  actions_today: number;
  // Variation (vs previous 7 days)
  signup_variation: number;
  approved_variation: number;
  checkin_variation: number;
  action_variation: number;
}

export function useQuickFunnel() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quick-funnel-metrics"],
    queryFn: async (): Promise<QuickFunnelMetrics> => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      
      // 7 days ago
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();
      
      // 14 days ago (for variation calculation)
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const fourteenDaysAgoStr = fourteenDaysAgo.toISOString();

      // Fetch counts for last 7 days from growth_events
      const eventTypes = [
        "signup",
        "approved", 
        "checkin_submitted",
        "next_action_completed",
        "invite_shared",
        "contact_created",
      ];

      // Get current period counts (last 7 days)
      const currentPromises = eventTypes.map(async (eventType) => {
        const { count, error } = await supabase
          .from("growth_events")
          .select("*", { count: "exact", head: true })
          .eq("event_type", eventType)
          .gte("occurred_at", sevenDaysAgoStr);
        
        if (error) {
          console.warn(`Error fetching ${eventType}:`, error.message);
          return { eventType, count: 0 };
        }
        return { eventType, count: count || 0 };
      });

      // Get previous period counts (7-14 days ago) for variation
      const previousPromises = ["signup", "approved", "checkin_submitted", "next_action_completed"].map(async (eventType) => {
        const { count, error } = await supabase
          .from("growth_events")
          .select("*", { count: "exact", head: true })
          .eq("event_type", eventType)
          .gte("occurred_at", fourteenDaysAgoStr)
          .lt("occurred_at", sevenDaysAgoStr);
        
        if (error) {
          console.warn(`Error fetching previous ${eventType}:`, error.message);
          return { eventType, count: 0 };
        }
        return { eventType, count: count || 0 };
      });

      // Get today's counts
      const todayStart = `${today}T00:00:00.000Z`;
      const todayPromises = [
        supabase
          .from("growth_events")
          .select("*", { count: "exact", head: true })
          .eq("event_type", "checkin_submitted")
          .gte("occurred_at", todayStart),
        supabase
          .from("growth_events")
          .select("*", { count: "exact", head: true })
          .eq("event_type", "next_action_completed")
          .gte("occurred_at", todayStart),
      ];

      const [currentResults, previousResults, todayResults] = await Promise.all([
        Promise.all(currentPromises),
        Promise.all(previousPromises),
        Promise.all(todayPromises),
      ]);

      // Map current results
      const currentMap: Record<string, number> = {};
      currentResults.forEach(({ eventType, count }) => {
        currentMap[eventType] = count;
      });

      // Map previous results for variation
      const previousMap: Record<string, number> = {};
      previousResults.forEach(({ eventType, count }) => {
        previousMap[eventType] = count;
      });

      // Calculate variations (percentage change)
      const calcVariation = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      return {
        signup: currentMap.signup || 0,
        approved: currentMap.approved || 0,
        checkin_submitted: currentMap.checkin_submitted || 0,
        next_action_completed: currentMap.next_action_completed || 0,
        invite_shared: currentMap.invite_shared || 0,
        contact_created: currentMap.contact_created || 0,
        checkins_today: todayResults[0].count || 0,
        actions_today: todayResults[1].count || 0,
        signup_variation: calcVariation(currentMap.signup || 0, previousMap.signup || 0),
        approved_variation: calcVariation(currentMap.approved || 0, previousMap.approved || 0),
        checkin_variation: calcVariation(currentMap.checkin_submitted || 0, previousMap.checkin_submitted || 0),
        action_variation: calcVariation(currentMap.next_action_completed || 0, previousMap.next_action_completed || 0),
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
