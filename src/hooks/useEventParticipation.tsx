/**
 * useEventParticipation - Hook for event participation cycle
 * 
 * Handles check-in, post-event completion, and attendance marking
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useLogGrowthEvent } from "./useGrowth";

export type ParticipationStatus = "planned" | "checked_in" | "completed" | "skipped";
export type EventStage = "pre" | "day_of" | "post" | "none";

export interface NextEventPrompt {
  event_id: string;
  starts_at: string;
  ends_at: string | null;
  title: string;
  location: string | null;
  has_any_invites: boolean;
  my_participation_status: string;
  suggested_stage: EventStage;
}

export interface EventParticipation {
  participation_id: string;
  status: ParticipationStatus;
  checkin_at: string | null;
  completed_at: string | null;
  actions_json: {
    brought_plus1?: boolean;
    qualified_contacts?: number;
    new_contacts?: number;
  };
}

export interface EventInviteForAttendance {
  invite_id: string;
  contact_id: string;
  contact_name: string;
  status: string;
  attended_at: string | null;
}

export interface EventParticipationMetrics {
  event_id: string;
  event_title: string;
  event_date: string;
  participations_planned: number;
  participations_checked_in: number;
  participations_completed: number;
  invites_attended_total: number;
}

function getBucket(count: number): string {
  if (count === 0) return "0";
  if (count === 1) return "1";
  if (count <= 3) return "2-3";
  return "4+";
}

/**
 * Hook for getting the next event prompt (for Hoje banner)
 */
export function useNextEventPrompt(windowHours = 36) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["next-event-prompt", windowHours],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_next_event_prompt", {
        _window_hours: windowHours,
      });

      if (error) {
        console.error("[useEventParticipation] Error fetching next event:", error);
        throw error;
      }

      // RPC returns array, get first row
      const result = Array.isArray(data) ? data[0] : data;
      return result as NextEventPrompt | null;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

/**
 * Hook for managing participation in a specific event
 */
export function useEventParticipation(eventId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { mutate: logEvent } = useLogGrowthEvent();

  // Get my participation
  const participationQuery = useQuery({
    queryKey: ["event-participation", eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const { data, error } = await (supabase.rpc as any)("get_my_event_participation", {
        _event_id: eventId,
      });

      if (error) {
        console.error("[useEventParticipation] Error fetching participation:", error);
        throw error;
      }

      const result = Array.isArray(data) ? data[0] : data;
      return result as EventParticipation | null;
    },
    enabled: !!eventId && !!user?.id,
    staleTime: 30 * 1000,
  });

  // Get invites for attendance marking
  const invitesQuery = useQuery({
    queryKey: ["event-invites-for-attendance", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await (supabase.rpc as any)("get_my_event_invites_for_attendance", {
        _event_id: eventId,
      });

      if (error) {
        console.error("[useEventParticipation] Error fetching invites:", error);
        throw error;
      }

      return (data || []) as EventInviteForAttendance[];
    },
    enabled: !!eventId && !!user?.id,
    staleTime: 30 * 1000,
  });

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async () => {
      logEvent({ eventType: "event_checkin_started", meta: {} });

      const { error } = await (supabase.rpc as any)("checkin_event", {
        _event_id: eventId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-participation", eventId] });
      queryClient.invalidateQueries({ queryKey: ["next-event-prompt"] });
      logEvent({ eventType: "event_checkin_completed", meta: {} });
    },
  });

  // Complete participation mutation
  const completeMutation = useMutation({
    mutationFn: async (actions: {
      brought_plus1?: boolean;
      qualified_contacts?: number;
      new_contacts?: number;
    }) => {
      const { error } = await (supabase.rpc as any)("complete_event_participation", {
        _event_id: eventId,
        _actions_json: actions,
      });

      if (error) throw error;
      return actions;
    },
    onSuccess: (actions) => {
      queryClient.invalidateQueries({ queryKey: ["event-participation", eventId] });
      queryClient.invalidateQueries({ queryKey: ["next-event-prompt"] });
      logEvent({
        eventType: "event_post_actions_saved",
        meta: {
          brought_plus1: actions.brought_plus1 || false,
          qualified_contacts_bucket: getBucket(actions.qualified_contacts || 0),
          new_contacts_bucket: getBucket(actions.new_contacts || 0),
        },
      });
      logEvent({ eventType: "event_completed", meta: {} });
    },
  });

  // Mark contact attended mutation
  const markAttendedMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await (supabase.rpc as any)("mark_event_invite_attended", {
        _event_id: eventId,
        _contact_id: contactId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-invites-for-attendance", eventId] });
      queryClient.invalidateQueries({ queryKey: ["my-event-invite-summary", eventId] });
    },
  });

  return {
    participation: participationQuery.data,
    isLoadingParticipation: participationQuery.isLoading,

    invites: invitesQuery.data || [],
    isLoadingInvites: invitesQuery.isLoading,

    checkin: checkinMutation.mutateAsync,
    isCheckingIn: checkinMutation.isPending,

    complete: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,

    markAttended: markAttendedMutation.mutateAsync,
    isMarkingAttended: markAttendedMutation.isPending,
  };
}

/**
 * Hook for coordinator metrics (aggregated, no PII)
 */
export function useScopeEventParticipationMetrics(days = 14) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scope-event-participation-metrics", days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_scope_event_participation_metrics", {
        _days: days,
      });

      if (error) {
        console.error("[useEventParticipation] Error fetching metrics:", error);
        throw error;
      }

      return (data || []) as EventParticipationMetrics[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
