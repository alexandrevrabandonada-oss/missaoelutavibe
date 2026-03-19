/**
 * useCelulaMembroData - Data hook for member's cell view
 * 
 * Fetches membership status, active cycle, personal stats, and missions.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MembershipInfo {
  status: string | null;
  cellName: string;
  city: string;
  state: string;
  neighborhood: string | null;
}

export interface MemberCycleInfo {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  status: string;
  metas_json: any;
  /** Whether this cycle is cell-specific or a city-level fallback */
  isCityFallback: boolean;
}

export interface MemberPersonalStats {
  missoesParticipadas: number;
  registrosEnviados: number;
  registrosValidados: number;
}

export interface MemberMission {
  id: string;
  title: string;
  status: string | null;
  type: string;
  created_at: string;
  myEvidenceCount: number;
  myLatestStatus: string | null;
}

export function useCelulaMembroData(cellId: string | undefined) {
  const { user } = useAuth();

  // Membership check
  const membershipQuery = useQuery({
    queryKey: ["celula-membership", cellId, user?.id],
    queryFn: async (): Promise<MembershipInfo | null> => {
      if (!cellId || !user?.id) return null;

      const { data, error } = await supabase
        .from("cell_memberships")
        .select("status, cells:cell_id(name, city, state, neighborhood)")
        .eq("cell_id", cellId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const cell = data.cells as any;
      return {
        status: data.status,
        cellName: cell?.name || "Célula",
        city: cell?.city || "",
        state: cell?.state || "",
        neighborhood: cell?.neighborhood || null,
      };
    },
    enabled: !!cellId && !!user?.id,
  });

  // Active cycle for this cell
  const cycleQuery = useQuery({
    queryKey: ["celula-membro-cycle", cellId],
    queryFn: async (): Promise<MemberCycleInfo | null> => {
      if (!cellId) return null;

      // Try cell-specific cycle first, then city/global
      const { data, error } = await supabase
        .from("ciclos_semanais")
        .select("id, titulo, inicio, fim, status, metas_json")
        .eq("status", "ativo")
        .eq("celula_id", cellId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) return { ...data, isCityFallback: false } as MemberCycleInfo;

      // Fallback: city-level cycle (need cell city)
      const cellInfo = membershipQuery.data;
      if (cellInfo?.city) {
        const { data: cityCycle } = await supabase
          .from("ciclos_semanais")
          .select("id, titulo, inicio, fim, status, metas_json")
          .eq("status", "ativo")
          .eq("cidade", cellInfo.city)
          .is("celula_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cityCycle) return { ...cityCycle, isCityFallback: true } as MemberCycleInfo;
      }

      return null;
    },
    enabled: !!cellId && membershipQuery.data?.status === "aprovado",
  });

  // Personal stats
  const personalStatsQuery = useQuery({
    queryKey: ["celula-membro-stats", cellId, user?.id],
    queryFn: async (): Promise<MemberPersonalStats> => {
      if (!cellId || !user?.id) return { missoesParticipadas: 0, registrosEnviados: 0, registrosValidados: 0 };

      const [enviados, validados, missoesComRegistro] = await Promise.all([
        supabase
          .from("evidences")
          .select("*", { count: "exact", head: true })
          .eq("cell_id", cellId)
          .eq("user_id", user.id),
        supabase
          .from("evidences")
          .select("*", { count: "exact", head: true })
          .eq("cell_id", cellId)
          .eq("user_id", user.id)
          .eq("status", "validado"),
        supabase
          .from("evidences")
          .select("mission_id")
          .eq("cell_id", cellId)
          .eq("user_id", user.id),
      ]);

      // Count distinct missions the member participated in
      const distinctMissions = new Set((missoesComRegistro.data || []).map((e: any) => e.mission_id));

      return {
        missoesParticipadas: distinctMissions.size,
        registrosEnviados: enviados.count ?? 0,
        registrosValidados: validados.count ?? 0,
      };
    },
    enabled: !!cellId && !!user?.id && membershipQuery.data?.status === "aprovado",
  });

  // Missions (exclude rascunho) with personal evidence status
  const missionsQuery = useQuery({
    queryKey: ["celula-membro-missoes", cellId, user?.id],
    queryFn: async (): Promise<MemberMission[]> => {
      if (!cellId || !user?.id) return [];

      const { data: missions, error } = await supabase
        .from("missions")
        .select("id, title, status, type, created_at")
        .eq("cell_id", cellId)
        .in("status", ["publicada", "em_andamento", "concluida"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!missions?.length) return [];

      // Get user's evidences for these missions
      const missionIds = missions.map((m) => m.id);
      const { data: evidences } = await supabase
        .from("evidences")
        .select("mission_id, status, created_at")
        .in("mission_id", missionIds)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const evidencesByMission: Record<string, { count: number; latestStatus: string | null }> = {};
      (evidences || []).forEach((e) => {
        if (!evidencesByMission[e.mission_id]) {
          // First seen = most recent (ordered desc)
          evidencesByMission[e.mission_id] = { count: 0, latestStatus: e.status };
        }
        evidencesByMission[e.mission_id].count++;
      });

      return missions.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        type: m.type,
        created_at: m.created_at,
        myEvidenceCount: evidencesByMission[m.id]?.count || 0,
        myLatestStatus: evidencesByMission[m.id]?.latestStatus || null,
      }));
    },
    enabled: !!cellId && !!user?.id && membershipQuery.data?.status === "aprovado",
  });

  return {
    membership: membershipQuery.data,
    isLoadingMembership: membershipQuery.isLoading,
    cycle: cycleQuery.data,
    isLoadingCycle: cycleQuery.isLoading,
    personalStats: personalStatsQuery.data,
    isLoadingStats: personalStatsQuery.isLoading,
    missions: missionsQuery.data ?? [],
    isLoadingMissions: missionsQuery.isLoading,
  };
}
