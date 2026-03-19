/**
 * useCoordCelulaRegistros - Evidences for a cell with safe identity + status counts
 * 
 * Single query fetches all records; filtering is done client-side for efficiency.
 * Identity follows safe display rules (first name only).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSafeDisplayName } from "@/lib/safeIdentity";

export type RegistroStatus = "enviado" | "precisa_ajuste" | "validado" | "rejeitado";

const ACTIVE_STATUSES: RegistroStatus[] = ["enviado", "precisa_ajuste", "validado", "rejeitado"];

export const REGISTRO_STATUS_LABELS: Record<RegistroStatus, string> = {
  enviado: "Enviado",
  precisa_ajuste: "Ajuste",
  validado: "Validado",
  rejeitado: "Rejeitado",
};

export interface CelulaRegistro {
  id: string;
  resumo: string | null;
  status: string | null;
  created_at: string;
  user_id: string;
  safe_name: string;
  mission_title: string | null;
  mission_type: string | null;
  // Detail fields (F4.2)
  local_texto: string | null;
  relato_texto: string | null;
  media_urls: string[] | null;
  how_to_fix: string | null;
  rejection_reason: string | null;
  coord_feedback: string | null;
  validated_at: string | null;
  validated_by: string | null;
}

export interface RegistroStatusCounts {
  enviado: number;
  precisa_ajuste: number;
  validado: number;
  rejeitado: number;
  total: number;
}

// Identity handled by central helper: src/lib/safeIdentity.ts

export function useCoordCelulaRegistros(celulaId: string | undefined) {
  return useQuery({
    queryKey: ["coord-celula-registros", celulaId],
    queryFn: async () => {
      if (!celulaId) return { records: [], counts: emptyCounts() };

      const { data, error } = await supabase
        .from("evidences")
        .select("id, resumo, status, created_at, user_id, local_texto, relato_texto, media_urls, how_to_fix, rejection_reason, coord_feedback, validated_at, validated_by, missions(title, type), profiles:user_id(full_name)")
        .eq("cell_id", celulaId)
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const records: CelulaRegistro[] = (data || []).map((row: any) => ({
        id: row.id,
        resumo: row.resumo,
        status: row.status,
        created_at: row.created_at,
        user_id: row.user_id,
        safe_name: getSafeDisplayName(row.profiles?.full_name),
        mission_title: row.missions?.title || null,
        mission_type: row.missions?.type || null,
        local_texto: row.local_texto || null,
        relato_texto: row.relato_texto || null,
        media_urls: row.media_urls || null,
        how_to_fix: row.how_to_fix || null,
        rejection_reason: row.rejection_reason || null,
        coord_feedback: row.coord_feedback || null,
        validated_at: row.validated_at || null,
        validated_by: row.validated_by || null,
      }));

      // Aggregate counts from full dataset
      const counts: RegistroStatusCounts = {
        enviado: 0,
        precisa_ajuste: 0,
        validado: 0,
        rejeitado: 0,
        total: records.length,
      };
      records.forEach((r) => {
        if (r.status && r.status in counts) {
          counts[r.status as RegistroStatus]++;
        }
      });

      return { records, counts };
    },
    enabled: !!celulaId,
    staleTime: 1000 * 60,
  });
}

function emptyCounts(): RegistroStatusCounts {
  return { enviado: 0, precisa_ajuste: 0, validado: 0, rejeitado: 0, total: 0 };
}
