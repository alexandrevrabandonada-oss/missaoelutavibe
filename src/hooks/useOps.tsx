import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";

// Types for ops data
export interface CicloAtivoInfo {
  id: string;
  titulo: string;
  status: string;
  inicio: string;
  fim: string;
  metas_count: number;
  tem_plano: boolean;
  tem_recibo: boolean;
}

export interface VoluntariosMetrics {
  aprovados_total: number;
  pendentes_validacao: number;
  ativos_7d: number;
}

export interface MissoesMetrics {
  abertas: number;
  em_execucao: number;
  concluidas: number;
  pendentes_validacao: number;
}

export interface DemandasMetrics {
  novas: number;
  em_triagem: number;
  virou_missao: number;
  arquivadas_7d: number;
}

export interface Agenda7dMetrics {
  atividades_publicadas: number;
  proximas_48h: number;
  rsvp_vou: number;
  rsvp_talvez: number;
  concluidas_7d: number;
  pendente_recibo: number;
  checkins_7d: number;
}

export interface TicketsMetrics {
  abertos: number;
  aguardando_resposta: number;
  mais_antigo_dias: number;
}

export interface OrigemFunilMetrics {
  convites_7d: number;
  leads_7d: number;
  aprovados_7d: number;
}

export interface OpsOverview {
  ciclo_ativo: CicloAtivoInfo | null;
  voluntarios: VoluntariosMetrics;
  missoes: MissoesMetrics;
  demandas: DemandasMetrics;
  agenda_7d: Agenda7dMetrics;
  tickets: TicketsMetrics;
  origem_funil: OrigemFunilMetrics;
  generated_at: string;
}

export interface OpsCycle {
  ciclo: {
    id: string;
    titulo: string;
    status: string;
    inicio: string;
    fim: string;
    cidade: string | null;
    celula_id: string | null;
    metas_json: any;
    fechamento_json: any;
    fechado_em: string | null;
  };
  missoes: {
    total: number;
    por_status: Record<string, number>;
  };
  evidencias_pendentes: number;
  atividades: {
    total: number;
    publicadas: number;
    rsvp_vou: number;
    rsvp_talvez: number;
  };
  anuncios: number;
}

export type ScopeType = "all" | "cidade" | "celula" | "global";

export function useOps(scopeType?: ScopeType, scopeCidade?: string | null, scopeCelulaId?: string | null) {
  const { user } = useAuth();
  const { getScope, isCoordinator } = useUserRoles();

  // Auto-determine scope if not provided
  const userScope = getScope();
  const effectiveScopeType = scopeType ?? (userScope.type === "none" ? "all" : userScope.type);
  const effectiveCidade = scopeCidade ?? userScope.cidade;
  const effectiveCelulaId = scopeCelulaId ?? userScope.cellId;

  const overviewQuery = useQuery({
    queryKey: ["ops-overview", effectiveScopeType, effectiveCidade, effectiveCelulaId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("ops_overview", {
        _scope_type: effectiveScopeType,
        _scope_cidade: effectiveCidade,
        _scope_celula_id: effectiveCelulaId,
      });

      if (error) {
        console.error("Error fetching ops overview:", error);
        throw error;
      }

      return data as OpsOverview;
    },
    enabled: !!user?.id && isCoordinator(),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  return {
    overview: overviewQuery.data,
    isLoading: overviewQuery.isLoading,
    error: overviewQuery.error,
    refetch: overviewQuery.refetch,
    
    // Expose scope for UI
    effectiveScope: {
      type: effectiveScopeType,
      cidade: effectiveCidade,
      celulaId: effectiveCelulaId,
    },
  };
}

export function useOpsCycle(cycleId: string | undefined) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  const cycleQuery = useQuery({
    queryKey: ["ops-cycle", cycleId],
    queryFn: async () => {
      if (!cycleId) return null;

      const { data, error } = await (supabase.rpc as any)("ops_cycle", {
        _cycle_id: cycleId,
      });

      if (error) {
        console.error("Error fetching ops cycle:", error);
        throw error;
      }

      return data as OpsCycle;
    },
    enabled: !!user?.id && !!cycleId && isCoordinator(),
    staleTime: 30000,
  });

  return {
    cycleData: cycleQuery.data,
    isLoading: cycleQuery.isLoading,
    error: cycleQuery.error,
    refetch: cycleQuery.refetch,
  };
}
