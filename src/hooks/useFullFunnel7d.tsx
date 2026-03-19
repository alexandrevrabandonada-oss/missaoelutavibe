import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";

export interface FunnelStage {
  count: number;
  items: Array<{
    id: string;
    name?: string;
    user_id?: string;
    city?: string;
    title?: string;
    code?: string;
    used_by_name?: string;
    status?: string;
    at: string;
  }>;
}

export interface FullFunnel7d {
  cadastros: FunnelStage;
  aprovados: FunnelStage;
  checkins: FunnelStage;
  missoes_iniciadas: FunnelStage;
  evidencias_enviadas: FunnelStage;
  evidencias_validadas: FunnelStage;
  convites_gerados: FunnelStage;
  convites_convertidos: FunnelStage;
}

export function useFullFunnel7d(scopeCidade?: string | null) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  return useQuery({
    queryKey: ["full-funnel-7d", scopeCidade],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_full_funnel_7d", {
        _scope_cidade: scopeCidade || null,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as FullFunnel7d;
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
