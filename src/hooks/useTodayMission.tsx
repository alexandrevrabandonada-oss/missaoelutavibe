/**
 * useTodayMission - Deterministic "Sua missão de hoje"
 * 
 * Uses seeded PRNG (user_id + YYYY-MM-DD) so the pick is stable across reloads.
 * Funnel priority: Convite > Contato > Escuta > Rua.
 * Yesterday's #1 won't repeat today. Completed-today missions are excluded.
 * 
 * Pilot mode: only canonical + cycle missions are candidates.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useDailyCheckin } from "./useCadencia";
import { useCiclos } from "./useCiclos";
import { useCycleMissions } from "./useCycleMissions";
import { getDailyRecommendations } from "@/lib/missionRecommendation";
import { filterPilotMissions } from "@/lib/pilotMissionFilter";
import { usePilotMode } from "./usePilotMode";
import type { Tables } from "@/integrations/supabase/types";

type Mission = Tables<"missions">;

interface FallbackOption {
  id: string;
  label: string;
  description: string;
  icon: "message-circle" | "map-pin" | "user-plus";
  action: "conversa" | "rua" | "crm";
}

const FALLBACK_OPTIONS: FallbackOption[] = [
  {
    id: "fb-conversa",
    label: "Enviar mensagem para 1 contato",
    description: "~5 min · Mande uma mensagem de apoio via WhatsApp",
    icon: "message-circle",
    action: "conversa",
  },
  {
    id: "fb-rua",
    label: "Missão rápida de rua",
    description: "~10 min · Converse com vizinhos no seu bairro",
    icon: "map-pin",
    action: "rua",
  },
  {
    id: "fb-crm",
    label: "Salvar 1 contato novo",
    description: "~2 min · Registre alguém que você conhece",
    icon: "user-plus",
    action: "crm",
  },
];

export function useTodayMission() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { hasCheckedInToday } = useDailyCheckin();
  const { activeCycle } = useCiclos();
  const { activeMissions: cycleMissions } = useCycleMissions(activeCycle?.id);
  const { isPilotMode } = usePilotMode();

  const isFirstAction = !profileLoading && profile && !profile.first_action_at;

  // Fetch published missions
  const missionsQuery = useQuery({
    queryKey: ["today-mission-candidates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("status", "publicada")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Mission[];
    },
    enabled: !!user?.id && hasCheckedInToday,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch ALL completed mission IDs
  const completedQuery = useQuery({
    queryKey: ["completed-mission-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const { data, error } = await supabase
        .from("missions")
        .select("id")
        .eq("assigned_to", user.id)
        .in("status", ["concluida", "enviada", "validada"]);
      if (error) return new Set<string>();
      return new Set(data.map((d) => d.id));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch missions completed TODAY (for exclusion from top picks)
  const completedTodayQuery = useQuery({
    queryKey: ["completed-today-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return new Set<string>();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("missions")
        .select("id")
        .eq("assigned_to", user.id)
        .in("status", ["concluida", "enviada", "validada"])
        .gte("updated_at", todayStart.toISOString());
      if (error) return new Set<string>();
      return new Set(data.map((d) => d.id));
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Deterministic recommendation
  const recommendation = useMemo(() => {
    if (
      !hasCheckedInToday ||
      !profile ||
      !user?.id ||
      !missionsQuery.data ||
      missionsQuery.data.length === 0
    ) {
      return { todayMission: null, recommended: [] };
    }

    let missions = missionsQuery.data;
    
    // Pilot mode: filter to canonical + cycle missions only
    if (isPilotMode) {
      const cycleMissionIds = new Set(cycleMissions.map((m) => m.id));
      missions = filterPilotMissions(missions, cycleMissionIds, user.id);
    }
    
    // Boost cycle missions by injecting them if not already present
    const cycleMissionIds = new Set(cycleMissions.map((m) => m.id));
    if (cycleMissionIds.size > 0) {
      const existingIds = new Set(missions.map(m => m.id));
      const missingCycle = cycleMissions.filter(m => !existingIds.has(m.id));
      missions = [...missingCycle, ...missions];
    }

    const result = getDailyRecommendations(
      missions,
      profile,
      user.id,
      completedTodayQuery.data ?? new Set(),
      completedQuery.data ?? new Set(),
    );

    return {
      todayMission: result.todayMission,
      recommended: result.recommended,
    };
  }, [
    hasCheckedInToday,
    profile,
    user?.id,
    missionsQuery.data,
    completedQuery.data,
    completedTodayQuery.data,
    cycleMissions,
    isPilotMode,
  ]);

  return {
    recommendedMission: recommendation.todayMission,
    extraRecommended: recommendation.recommended,
    isLoading:
      profileLoading || missionsQuery.isLoading || completedQuery.isLoading,
    hasCheckedIn: hasCheckedInToday,
    isFirstAction: isFirstAction ?? false,
    fallbackOptions: FALLBACK_OPTIONS,
  };
}

export type { FallbackOption };
