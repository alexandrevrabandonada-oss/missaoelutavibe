import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";

export interface Bring1ProgressData {
  /**
   * Number of referrals who completed first_action within 48h of user's first_action
   */
  activatedCount: number;
  /**
   * Number of invite link clicks (proxy when activation can't be attributed)
   */
  clickCount: number;
  /**
   * Whether we're using click count as fallback (imprecise)
   */
  isFallback: boolean;
  /**
   * User's first_action timestamp (if any)
   */
  firstActionAt: string | null;
  /**
   * Whether 48h window has passed
   */
  windowExpired: boolean;
  /**
   * Goal achieved (at least 1 activated)
   */
  goalAchieved: boolean;
}

/**
 * Hook to track "Bring +1 in 48h" progress
 * - Counts referrals who completed first_action within 48h of user's activation
 * - Falls back to invite click count if precise attribution unavailable
 */
export function useBring1Progress() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const firstActionAt = profile?.first_action_at || null;
  const hasCompletedFirstAction = !!firstActionAt;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bring1-progress", user?.id, firstActionAt],
    queryFn: async (): Promise<Bring1ProgressData> => {
      if (!user?.id || !firstActionAt) {
        return {
          activatedCount: 0,
          clickCount: 0,
          isFallback: false,
          firstActionAt: null,
          windowExpired: false,
          goalAchieved: false,
        };
      }

      const activationTime = new Date(firstActionAt);
      const windowEnd = new Date(activationTime.getTime() + 48 * 60 * 60 * 1000);
      const now = new Date();
      const windowExpired = now > windowEnd;

      // Get activated referrals within 48h window
      // Look for profiles with referrer_user_id = current user AND first_action_at within window
      const { data: activatedReferrals, error: activatedError } = await supabase
        .from("profiles")
        .select("id, first_action_at")
        .eq("referrer_user_id", user.id)
        .not("first_action_at", "is", null)
        .gte("first_action_at", firstActionAt)
        .lte("first_action_at", windowEnd.toISOString());

      if (activatedError) {
        console.error("Error fetching activated referrals:", activatedError);
      }

      const activatedCount = activatedReferrals?.length || 0;

      // If we have precise count, use it
      if (activatedCount > 0) {
        return {
          activatedCount,
          clickCount: 0,
          isFallback: false,
          firstActionAt,
          windowExpired,
          goalAchieved: activatedCount >= 1,
        };
      }

      // Fallback: count invite link clicks (territory_link_open) with user's invite code
      // This is imprecise but gives some feedback
      const { data: inviteCodes } = await supabase
        .from("convites")
        .select("code")
        .eq("criado_por", user.id)
        .eq("ativo", true)
        .limit(10);

      let clickCount = 0;
      if (inviteCodes && inviteCodes.length > 0) {
        const codes = inviteCodes.map(c => c.code);
        
        const { data: clicks, error: clicksError } = await supabase
          .from("growth_events")
          .select("id")
          .eq("event_type", "territory_link_open")
          .in("invite_code", codes)
          .gte("occurred_at", firstActionAt)
          .lte("occurred_at", windowEnd.toISOString());

        if (clicksError) {
          console.error("Error fetching click count:", clicksError);
        }

        clickCount = clicks?.length || 0;
      }

      return {
        activatedCount: 0,
        clickCount,
        isFallback: clickCount > 0,
        firstActionAt,
        windowExpired,
        goalAchieved: false,
      };
    },
    enabled: hasCompletedFirstAction && !!user?.id,
    staleTime: 60000, // 1 min
    refetchInterval: 120000, // 2 min
  });

  return {
    progress: data,
    isLoading,
    refetch,
    hasCompletedFirstAction,
  };
}
