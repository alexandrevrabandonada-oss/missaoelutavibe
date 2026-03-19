/**
 * useEventInvites - Hook for managing CRM event invites
 * 
 * Provides methods to invite contacts to events, update RSVP status,
 * and track outreach (WhatsApp/copy) without PII in logs.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useLogGrowthEvent } from "./useGrowth";
import { useAppMode } from "./useAppMode";

export type EventInviteStatus = 
  | "invited" 
  | "going" 
  | "maybe" 
  | "declined" 
  | "no_answer" 
  | "attended";

export interface EventInvite {
  invite_id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_location: string | null;
  status: EventInviteStatus;
  last_outreach_at: string | null;
  next_followup_at: string | null;
  created_at: string;
}

export interface UpcomingEvent {
  event_id: string;
  title: string;
  event_date: string;
  event_end: string | null;
  location: string | null;
  tipo: string;
  city: string | null;
}

export interface EventInviteMetrics {
  event_id: string;
  event_title: string;
  event_date: string;
  total_invited: number;
  going: number;
  maybe: number;
  declined: number;
  no_answer: number;
  attended: number;
}

export interface InviteSummary {
  total_invited: number;
  going: number;
  maybe: number;
  declined: number;
  no_answer: number;
  attended: number;
}

export const INVITE_STATUS_LABELS: Record<EventInviteStatus, string> = {
  invited: "Convidado",
  going: "Vai",
  maybe: "Talvez",
  declined: "Não vai",
  no_answer: "Sem resposta",
  attended: "Compareceu",
};

export const INVITE_STATUS_EMOJI: Record<EventInviteStatus, string> = {
  invited: "📨",
  going: "✅",
  maybe: "🤔",
  declined: "❌",
  no_answer: "🕒",
  attended: "🎉",
};

/**
 * Hook for managing event invites for a specific contact
 */
export function useContactEventInvites(contactId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { mutate: logEvent } = useLogGrowthEvent();
  const { mode } = useAppMode();

  // Get invites for this contact
  const invitesQuery = useQuery({
    queryKey: ["contact-event-invites", contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await (supabase.rpc as any)("get_contact_event_invites", {
        _contact_id: contactId,
      });

      if (error) {
        console.error("[useEventInvites] Error fetching invites:", error);
        throw error;
      }

      return (data || []) as EventInvite[];
    },
    enabled: !!contactId && !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  // Create/update invite
  const upsertMutation = useMutation({
    mutationFn: async ({
      eventId,
      nextFollowupAt,
      source = "crm_drawer",
    }: {
      eventId: string;
      nextFollowupAt?: Date;
      source?: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)("upsert_event_invite", {
        _contact_id: contactId,
        _event_id: eventId,
        _next_followup_at: nextFollowupAt?.toISOString() || null,
        _source: source,
      });

      if (error) throw error;
      return data as string; // Returns invite_id
    },
    onSuccess: (inviteId) => {
      queryClient.invalidateQueries({ queryKey: ["contact-event-invites", contactId] });
      logEvent({
        eventType: "event_invite_created",
        meta: { source: "crm_drawer", mode },
      });
    },
  });

  // Set RSVP status
  const setStatusMutation = useMutation({
    mutationFn: async ({
      inviteId,
      status,
      nextFollowupAt,
    }: {
      inviteId: string;
      status: EventInviteStatus;
      nextFollowupAt?: Date;
    }) => {
      const { error } = await (supabase.rpc as any)("set_event_invite_status", {
        _invite_id: inviteId,
        _status: status,
        _next_followup_at: nextFollowupAt?.toISOString() || null,
      });

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["contact-event-invites", contactId] });
      logEvent({
        eventType: "event_rsvp_set",
        meta: { status, mode },
      });
    },
  });

  // Mark outreach (WhatsApp opened / text copied)
  const markOutreachMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await (supabase.rpc as any)("mark_event_outreach", {
        _invite_id: inviteId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-event-invites", contactId] });
    },
  });

  return {
    invites: invitesQuery.data || [],
    isLoading: invitesQuery.isLoading,
    refetch: invitesQuery.refetch,

    upsertInvite: upsertMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,

    setStatus: setStatusMutation.mutateAsync,
    isSettingStatus: setStatusMutation.isPending,

    markOutreach: markOutreachMutation.mutateAsync,
    isMarkingOutreach: markOutreachMutation.isPending,
  };
}

/**
 * Hook to get upcoming events for the event picker
 */
export function useUpcomingEvents(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["upcoming-events-for-invite", limit],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_upcoming_events_for_invite", {
        _limit: limit,
      });

      if (error) {
        console.error("[useEventInvites] Error fetching events:", error);
        throw error;
      }

      return (data || []) as UpcomingEvent[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for coordinator/admin metrics (aggregated, no PII)
 */
export function useScopeEventInviteMetrics(days = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scope-event-invite-metrics", days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_scope_event_invite_metrics", {
        _days: days,
      });

      if (error) {
        console.error("[useEventInvites] Error fetching metrics:", error);
        throw error;
      }

      return (data || []) as EventInviteMetrics[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for user's own invite summary for a specific event
 */
export function useMyEventInviteSummary(eventId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-event-invite-summary", eventId],
    queryFn: async () => {
      if (!eventId) return null;

      const { data, error } = await (supabase.rpc as any)("get_my_event_invite_summary", {
        _event_id: eventId,
      });

      if (error) {
        console.error("[useEventInvites] Error fetching summary:", error);
        throw error;
      }

      // RPC returns array, get first row
      const summary = Array.isArray(data) ? data[0] : data;
      return summary as InviteSummary | null;
    },
    enabled: !!eventId && !!user?.id,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get invite script text based on mode
 */
export function getEventInviteScripts(mode: string, eventTitle: string, eventDate: string, eventLocation?: string | null) {
  const dateStr = new Date(eventDate).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeStr = new Date(eventDate).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const locationLine = eventLocation ? `📍 ${eventLocation}` : "";

  if (mode === "campanha") {
    return {
      invite: `🗳️ Olá! Quero te convidar para uma atividade importante da nossa campanha:\n\n📅 ${eventTitle}\n🗓️ ${dateStr} às ${timeStr}\n${locationLine}\n\nVamos juntos conquistar seu voto e o apoio do seu bairro! Posso contar com você?`,
      reminder: `Oi! Lembrete: amanhã temos "${eventTitle}" 🗳️\n\n🗓️ ${dateStr} às ${timeStr}\n${locationLine}\n\nTe espero lá!`,
    };
  }

  return {
    invite: `✊ Olá! Quero te convidar para uma atividade do nosso movimento:\n\n📅 ${eventTitle}\n🗓️ ${dateStr} às ${timeStr}\n${locationLine}\n\nSua presença faz toda diferença! Posso contar com você?`,
    reminder: `Oi! Lembrete: amanhã temos "${eventTitle}" ✊\n\n🗓️ ${dateStr} às ${timeStr}\n${locationLine}\n\nTe espero lá!`,
  };
}
