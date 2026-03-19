import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";

export interface OpsFunnelMetrics {
  period_days: number;
  scope_cidade: string | null;
  scope_cell_id: string | null;
  ativacoes: {
    onboarding_complete: number;
    active_7d: number;
  };
  rua: {
    geradas: number;
    concluidas: number;
    taxa_conversao: number | null;
  };
  conversa: {
    geradas: number;
    concluidas: number;
    taxa_conversao: number | null;
  };
  crm: {
    quick_add_saved: number;
  };
  followup: {
    done: number;
  };
  secundarias: {
    script_copied: number;
    whatsapp_opened: number;
  };
  top_cidades: Array<{
    cidade: string;
    concluidas: number;
    followups: number;
    total: number;
  }>;
  top_celulas: Array<{
    celula_id: string;
    celula_nome: string;
    concluidas: number;
    followups: number;
    total: number;
  }>;
  generated_at: string;
}

export function useOpsFunnel(
  periodDays: number = 7,
  scopeCidade?: string | null,
  scopeCellId?: string | null
) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  return useQuery({
    queryKey: ["ops-funnel", periodDays, scopeCidade, scopeCellId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_ops_funnel_metrics", {
        _period_days: periodDays,
        _scope_cidade: scopeCidade || null,
        _scope_cell_id: scopeCellId || null,
      });

      if (error) {
        console.error("Error fetching ops funnel:", error);
        throw error;
      }

      // Check for error response
      if (data?.error) {
        throw new Error(data.error);
      }

      return data as OpsFunnelMetrics;
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
