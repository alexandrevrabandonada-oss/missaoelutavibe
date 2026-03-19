import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useLogGrowthEvent } from "./useGrowth";

export interface FirstActivationState {
  showModal: boolean;
  missionType: "invite" | "checkin" | null;
  missionId: string | null;
  hasShared: boolean;
  isLoading: boolean;
}

/**
 * Hook to manage the "5 minutes" activation flow after approval
 * Checks if user just got approved and shows the activation modal
 */
export function useFirstActivation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const logGrowthEvent = useLogGrowthEvent();

  // Check if user has a first mission assigned
  const { data: firstMission, isLoading: missionLoading } = useQuery({
    queryKey: ["first-mission", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("missions")
        .select("id, title, type, status")
        .eq("assigned_to", user.id)
        .eq("is_first_mission", true)
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching first mission:", error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Check if user has seen the activation modal
  const { data: hasSeenModal, isLoading: seenLoading } = useQuery({
    queryKey: ["activation-modal-seen", user?.id],
    queryFn: async () => {
      if (!user?.id) return true; // Default to true to not show

      // Check localStorage first for immediate feedback
      const localKey = `activation_modal_seen_${user.id}`;
      if (localStorage.getItem(localKey) === "true") {
        return true;
      }

      // Also check growth events for cross-device persistence
      const { data, error } = await supabase
        .from("growth_events")
        .select("id")
        .eq("user_id", user.id)
        .in("event_type", ["first_share_opened", "first_share_completed"])
        .limit(1);

      if (error) {
        console.error("Error checking modal seen:", error);
        return false;
      }

      const hasSeen = (data?.length || 0) > 0;
      if (hasSeen) {
        localStorage.setItem(localKey, "true");
      }

      return hasSeen;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Check if user has shared (for determining modal type)
  const { data: hasShared, isLoading: sharedLoading } = useQuery({
    queryKey: ["activation-has-shared", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("growth_events")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_type", "invite_shared")
        .limit(1);

      if (error) {
        console.error("Error checking invite shared:", error);
        return false;
      }

      return (data?.length || 0) > 0;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Dismiss modal mutation
  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      // Mark as seen locally
      localStorage.setItem(`activation_modal_seen_${user.id}`, "true");

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activation-modal-seen", user?.id] });
    },
  });

  // Log share opened event
  const logShareOpened = () => {
    logGrowthEvent.mutate({
      eventType: "first_share_opened",
      meta: { mission_id: firstMission?.id },
    });
    // Also mark as seen
    if (user?.id) {
      localStorage.setItem(`activation_modal_seen_${user.id}`, "true");
    }
    queryClient.invalidateQueries({ queryKey: ["activation-modal-seen", user?.id] });
  };

  // Log share completed event
  const logShareCompleted = () => {
    logGrowthEvent.mutate({
      eventType: "first_share_completed",
      meta: { mission_id: firstMission?.id },
    });
  };

  // Determine mission type from first mission
  const getMissionType = (): "invite" | "checkin" | null => {
    if (!firstMission) return null;
    // Check title to determine type
    if (firstMission.title?.toLowerCase().includes("convide")) return "invite";
    if (firstMission.title?.toLowerCase().includes("check-in")) return "checkin";
    // Fallback based on hasShared
    return hasShared ? "checkin" : "invite";
  };

  const isLoading = missionLoading || seenLoading || sharedLoading;
  const missionType = getMissionType();

  // Show modal if:
  // 1. Has first mission
  // 2. Hasn't seen the modal yet
  // 3. Not loading
  const showModal = !isLoading && !!firstMission && !hasSeenModal;

  return {
    showModal,
    missionType,
    missionId: firstMission?.id || null,
    hasShared: hasShared || false,
    isLoading,
    dismissModal: dismissMutation.mutate,
    logShareOpened,
    logShareCompleted,
  };
}

/**
 * Hook to get first activation metrics for admin dashboard
 */
export function useFirstActivationMetrics() {
  return useQuery({
    queryKey: ["first-activation-metrics"],
    queryFn: async () => {
      const now = new Date();
      const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Count first_mission_assigned events
      const { data: assigned, error: assignedError } = await supabase
        .from("growth_events")
        .select("id")
        .eq("event_type", "first_mission_assigned")
        .gte("occurred_at", date7d);

      if (assignedError) {
        console.error("Error fetching assigned metrics:", assignedError);
        throw assignedError;
      }

      // Count first_share_opened events
      const { data: opened, error: openedError } = await supabase
        .from("growth_events")
        .select("id")
        .eq("event_type", "first_share_opened")
        .gte("occurred_at", date7d);

      if (openedError) throw openedError;

      // Count first_share_completed events
      const { data: completed, error: completedError } = await supabase
        .from("growth_events")
        .select("id")
        .eq("event_type", "first_share_completed")
        .gte("occurred_at", date7d);

      if (completedError) throw completedError;

      // Calculate approved -> first_action rate
      const { data: approved, error: approvedError } = await supabase
        .from("growth_events")
        .select("id")
        .eq("event_type", "approved")
        .gte("occurred_at", date7d);

      if (approvedError) throw approvedError;

      const { data: firstAction, error: firstActionError } = await supabase
        .from("growth_events")
        .select("id")
        .eq("event_type", "first_action")
        .gte("occurred_at", date7d);

      if (firstActionError) throw firstActionError;

      const approvedCount = approved?.length || 0;
      const firstActionCount = firstAction?.length || 0;
      const conversionRate = approvedCount > 0 
        ? Math.round((firstActionCount / approvedCount) * 100) 
        : 0;

      return {
        missions_assigned_7d: assigned?.length || 0,
        modal_opened_7d: opened?.length || 0,
        share_completed_7d: completed?.length || 0,
        approved_to_first_action_rate: conversionRate,
        approved_7d: approvedCount,
        first_action_7d: firstActionCount,
      };
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
