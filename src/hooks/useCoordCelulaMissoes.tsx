/**
 * useCoordCelulaMissoes - Missions for a cell with evidence counts
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MISSION_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
  em_andamento: "Em andamento",
  enviada: "Enviada",
  validada: "Validada",
  reprovada: "Reprovada",
  concluida: "Concluída",
};

export interface CelulaMission {
  id: string;
  title: string;
  status: string | null;
  statusLabel: string;
  type: string;
  created_at: string;
  evidence_count: number;
}

export function useCoordCelulaMissoes(celulaId: string | undefined) {
  return useQuery({
    queryKey: ["coord-celula-missoes", celulaId],
    queryFn: async (): Promise<CelulaMission[]> => {
      if (!celulaId) return [];

      // Get missions
      const { data: missions, error } = await supabase
        .from("missions")
        .select("id, title, status, type, created_at")
        .eq("cell_id", celulaId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!missions?.length) return [];

      // Batch count evidences per mission
      const missionIds = missions.map((m) => m.id);
      const { data: evidences } = await supabase
        .from("evidences")
        .select("mission_id")
        .in("mission_id", missionIds);

      const countByMission: Record<string, number> = {};
      (evidences || []).forEach((e) => {
        countByMission[e.mission_id] = (countByMission[e.mission_id] || 0) + 1;
      });

      return missions.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        statusLabel: MISSION_STATUS_LABELS[m.status || ""] || m.status || "—",
        type: m.type,
        created_at: m.created_at,
        evidence_count: countByMission[m.id] || 0,
      }));
    },
    enabled: !!celulaId,
    staleTime: 1000 * 60 * 2,
  });
}

export { MISSION_STATUS_LABELS };
