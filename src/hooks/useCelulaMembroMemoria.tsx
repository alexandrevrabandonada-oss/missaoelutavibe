/**
 * useCelulaMembroMemoria - Validated records + closed cycle receipts for member's memory tab
 * F5.1: Enriched records with full fields + validated_by profile
 * F5.2: Enriched cycles with participants, missions, personal contribution
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MemoriaRegistro {
  id: string;
  resumo: string | null;
  relato_texto: string | null;
  local_texto: string | null;
  mission_title: string | null;
  mission_type: string | null;
  media_urls: string[] | null;
  validated_at: string | null;
  validated_by_name: string | null;
  coord_feedback: string | null;
  created_at: string;
}

export interface MemoriaCiclo {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  fechamento_json: any;
  total_registros_celula: number;
  membros_participantes: number;
  missoes_cumpridas: number;
  meus_registros: number;
  sintese: string | null;
}

export function useCelulaMembroMemoria(cellId: string | undefined) {
  const { user } = useAuth();

  // Own validated records — enriched (F5.1)
  const registrosQuery = useQuery({
    queryKey: ["celula-memoria-registros", cellId, user?.id],
    queryFn: async (): Promise<MemoriaRegistro[]> => {
      if (!cellId || !user?.id) return [];

      const { data, error } = await supabase
        .from("evidences")
        .select("id, resumo, relato_texto, local_texto, media_urls, validated_at, validated_by, coord_feedback, created_at, missions(title, type)")
        .eq("cell_id", cellId)
        .eq("user_id", user.id)
        .eq("status", "validado")
        .order("validated_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const validatorIds = [...new Set(
        (data || []).map((r: any) => r.validated_by).filter(Boolean)
      )];

      let profileMap: Record<string, string> = {};
      if (validatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", validatorIds);
        if (profiles) {
          for (const p of profiles) {
            profileMap[p.id] = p.full_name || "";
          }
        }
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        resumo: row.resumo,
        relato_texto: row.relato_texto,
        local_texto: row.local_texto,
        mission_title: row.missions?.title || null,
        mission_type: row.missions?.type || null,
        media_urls: row.media_urls,
        validated_at: row.validated_at,
        validated_by_name: row.validated_by ? (profileMap[row.validated_by] || null) : null,
        coord_feedback: row.coord_feedback || null,
        created_at: row.created_at,
      }));
    },
    enabled: !!cellId && !!user?.id,
  });

  // Closed cycles — enriched (F5.2)
  const ciclosQuery = useQuery({
    queryKey: ["celula-memoria-ciclos", cellId, user?.id],
    queryFn: async (): Promise<MemoriaCiclo[]> => {
      if (!cellId) return [];

      const { data: ciclos, error } = await supabase
        .from("ciclos_semanais")
        .select("id, titulo, inicio, fim, fechamento_json")
        .eq("celula_id", cellId)
        .eq("status", "encerrado")
        .order("fim", { ascending: false })
        .limit(12);

      if (error) throw error;
      if (!ciclos?.length) return [];

      const results: MemoriaCiclo[] = [];

      for (const ciclo of ciclos) {
        // Single query: get user_id + mission_id for all validated evidences in the period
        const { data: evidenceRows } = await supabase
          .from("evidences")
          .select("user_id, mission_id")
          .eq("cell_id", cellId)
          .eq("status", "validado")
          .gte("created_at", ciclo.inicio)
          .lte("created_at", ciclo.fim);

        const rows = evidenceRows || [];
        const uniqueUsers = new Set(rows.map((r) => r.user_id));
        const uniqueMissions = new Set(rows.map((r) => r.mission_id).filter(Boolean));
        const myCount = user?.id ? rows.filter((r) => r.user_id === user.id).length : 0;

        // Extract synopsis from fechamento_json
        const fj = ciclo.fechamento_json as any;
        const sintese = fj?.resumo || fj?.sintese || fj?.summary || null;

        results.push({
          ...ciclo,
          total_registros_celula: rows.length,
          membros_participantes: uniqueUsers.size,
          missoes_cumpridas: uniqueMissions.size,
          meus_registros: myCount,
          sintese: typeof sintese === "string" ? sintese : null,
        });
      }

      return results;
    },
    enabled: !!cellId,
  });

  return {
    registros: registrosQuery.data ?? [],
    isLoadingRegistros: registrosQuery.isLoading,
    ciclos: ciclosQuery.data ?? [],
    isLoadingCiclos: ciclosQuery.isLoading,
  };
}
