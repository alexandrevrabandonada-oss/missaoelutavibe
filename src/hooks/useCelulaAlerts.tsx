/**
 * useCelulaAlerts - Lightweight operational alerts for cell coordination
 * F7.1: 4 alert types, parallel queries, zero noise when clean
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CelulaAlertType =
  | "pendentes_antigos"
  | "ajuste_sem_reenvio"
  | "ciclo_fim_proximo"
  | "ciclo_sem_sintese"
  | "ciclo_frio";

export interface CelulaAlert {
  type: CelulaAlertType;
  count: number;
  message: string;
  /** "tab:registros" = switch tab, "action:editar_sintese" = custom callback, or a route string for Link */
  action?: string;
  actionLabel?: string;
  /** Extra payload for action handlers */
  meta?: Record<string, unknown>;
}

export function useCelulaAlerts(cellId: string | undefined) {
  return useQuery({
    queryKey: ["celula-alerts", cellId],
    queryFn: async (): Promise<CelulaAlert[]> => {
      if (!cellId) return [];

      const now = new Date();
      const ago48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const ago72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
      const ago3d = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

      const [pendentesRes, ajusteRes, cicloFimRes, cicloSemSinteseRes, recentActivityRes, activeCycleCountRes] = await Promise.all([
        // 1. Registros pendentes há >48h
        supabase
          .from("evidences")
          .select("*", { count: "exact", head: true })
          .eq("cell_id", cellId)
          .eq("status", "enviado")
          .lt("created_at", ago48h),

        // 2. Registros em precisa_ajuste há >72h
        supabase
          .from("evidences")
          .select("*", { count: "exact", head: true })
          .eq("cell_id", cellId)
          .eq("status", "precisa_ajuste")
          .lt("updated_at", ago72h),

        // 3. Ciclo ativo com fim < 48h
        supabase
          .from("ciclos_semanais")
          .select("id", { count: "exact", head: true })
          .eq("celula_id", cellId)
          .eq("status", "ativo")
          .lt("fim", in48h)
          .gte("fim", now.toISOString()),

        // 4. Ciclos encerrados sem síntese (últimos 4)
        supabase
          .from("ciclos_semanais")
          .select("id, fechamento_json")
          .eq("celula_id", cellId)
          .eq("status", "encerrado")
          .order("fim", { ascending: false })
          .limit(4),

        // 5. Recent evidence submissions (last 3 days) for cold-cycle detection
        supabase
          .from("evidences")
          .select("*", { count: "exact", head: true })
          .eq("cell_id", cellId)
          .gte("created_at", ago3d),

        // 6. Active cycle count
        supabase
          .from("ciclos_semanais")
          .select("id", { count: "exact", head: true })
          .eq("celula_id", cellId)
          .eq("status", "ativo"),
      ]);

      const alerts: CelulaAlert[] = [];

      const pendentes = pendentesRes.count ?? 0;
      if (pendentes > 0) {
        alerts.push({
          type: "pendentes_antigos",
          count: pendentes,
          message: `${pendentes} registro${pendentes > 1 ? "s" : ""} pendente${pendentes > 1 ? "s" : ""} há mais de 48h`,
          action: "registros:enviado",
          actionLabel: "Ver pendentes →",
        });
      }

      const ajuste = ajusteRes.count ?? 0;
      if (ajuste > 0) {
        alerts.push({
          type: "ajuste_sem_reenvio",
          count: ajuste,
          message: `${ajuste} registro${ajuste > 1 ? "s" : ""} em ajuste há mais de 72h sem reenvio`,
          action: "registros:precisa_ajuste",
          actionLabel: "Ver ajustes →",
        });
      }

      const cicloFim = cicloFimRes.count ?? 0;
      if (cicloFim > 0) {
        alerts.push({
          type: "ciclo_fim_proximo",
          count: cicloFim,
          message: "O ciclo ativo encerra em menos de 48h",
        });
      }

      // Check cycles without synopsis
      const ciclosEncerrados = cicloSemSinteseRes.data ?? [];
      const ciclosSemSintese = ciclosEncerrados.filter((c) => {
        const fj = c.fechamento_json as any;
        return !fj?.resumo || (typeof fj.resumo === "string" && fj.resumo.trim() === "");
      });
      const semSintese = ciclosSemSintese.length;

      if (semSintese > 0) {
        alerts.push({
          type: "ciclo_sem_sintese",
          count: semSintese,
          message: `${semSintese} ciclo${semSintese > 1 ? "s" : ""} encerrado${semSintese > 1 ? "s" : ""} sem síntese`,
          action: "action:editar_sintese",
          actionLabel: "Editar síntese →",
          meta: { cicloId: ciclosSemSintese[0].id },
        });
      }

      // 5. Cold cycle: active cycle but 0 submissions in 3 days
      const recentActivity = recentActivityRes.count ?? 0;
      const hasActiveCycle = (activeCycleCountRes.count ?? 0) > 0;
      if (hasActiveCycle && recentActivity === 0) {
        alerts.push({
          type: "ciclo_frio",
          count: 0,
          message: "Ciclo ativo sem registros nos últimos 3 dias",
          action: "tab:missoes",
          actionLabel: "Ver missões →",
        });
      }

      return alerts;
    },
    enabled: !!cellId,
    staleTime: 1000 * 60 * 3,
  });
}
