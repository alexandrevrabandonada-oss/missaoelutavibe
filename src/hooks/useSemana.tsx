import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCiclos, type Ciclo } from "./useCiclos";
import { usePinnedAnuncio } from "./usePinnedAnuncio";
import { useMissions } from "./useMissions";
import { useAtividades } from "./useAtividades";

// Extended Ciclo type with new fields
export interface CicloExtended extends Ciclo {
  metas_json: Record<string, unknown> | unknown[] | null;
  fechamento_json?: {
    feitos: string;
    travas: string;
    proximos_passos: string;
  } | null;
  fechado_em?: string | null;
  fechado_por?: string | null;
}

// Helper to access ciclos_semanais with new fields
const ciclosTable = () => (supabase.from as any)("ciclos_semanais");

export function useSemana() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeCycle, isLoadingActive } = useCiclos();
  const { pinnedAnuncio, isLoading: isPinnedLoading } = usePinnedAnuncio(activeCycle?.id);
  const { missions, isLoading: isMissionsLoading } = useMissions(activeCycle?.id);
  
  // Get activities for the active cycle
  const { atividades, isLoading: isAtividadesLoading } = useAtividades({
    cicloId: activeCycle?.id,
    limit: 10,
  });

  // Fetch full cycle data with extended fields
  const cycleDetailQuery = useQuery({
    queryKey: ["cycle-detail", activeCycle?.id],
    queryFn: async () => {
      if (!activeCycle?.id) return null;

      const { data, error } = await ciclosTable()
        .select("*")
        .eq("id", activeCycle.id)
        .single();

      if (error) throw error;
      return data as CicloExtended;
    },
    enabled: !!user?.id && !!activeCycle?.id,
  });

  // Update metas mutation
  const updateMetasMutation = useMutation({
    mutationFn: async ({ cicloId, metas }: { cicloId: string; metas: string[] }) => {
      const { data, error } = await supabase.rpc("update_cycle_metas" as any, {
        _ciclo_id: cicloId,
        _metas_json: metas,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail"] });
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
    },
  });

  // Close cycle mutation
  const closeCycleMutation = useMutation({
    mutationFn: async ({
      cicloId,
      fechamento,
    }: {
      cicloId: string;
      fechamento: { feitos: string; travas: string; proximos_passos: string };
    }) => {
      const { data, error } = await supabase.rpc("close_cycle" as any, {
        _ciclo_id: cicloId,
        _fechamento_json: fechamento,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail"] });
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycle"] });
    },
  });

  // Parse metas from JSON
  const parsedMetas = (() => {
    const metas = cycleDetailQuery.data?.metas_json;
    if (!metas || !Array.isArray(metas)) return [];
    return metas.map((m: any) => (typeof m === "string" ? m : m.titulo));
  })();

  return {
    // Cycle data
    activeCycle: cycleDetailQuery.data || (activeCycle as CicloExtended | null),
    hasCycle: !!activeCycle,
    isLoadingCycle: isLoadingActive || cycleDetailQuery.isLoading,

    // Weekly plan (pinned announcement)
    weeklyPlan: pinnedAnuncio,
    isLoadingPlan: isPinnedLoading,

    // Metas
    metas: parsedMetas,

    // Missions for the cycle
    missions: missions || [],
    isLoadingMissions: isMissionsLoading,

    // Activities for the cycle
    atividades: atividades || [],
    isLoadingAtividades: isAtividadesLoading,

    // Mutations
    updateMetas: updateMetasMutation.mutateAsync,
    isUpdatingMetas: updateMetasMutation.isPending,

    closeCycle: closeCycleMutation.mutateAsync,
    isClosingCycle: closeCycleMutation.isPending,
  };
}

// Hook for admin to get cycle by ID with full data
export function useCycleById(cicloId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cycleQuery = useQuery({
    queryKey: ["cycle-by-id", cicloId],
    queryFn: async () => {
      if (!cicloId) return null;

      const { data, error } = await ciclosTable()
        .select("*")
        .eq("id", cicloId)
        .single();

      if (error) throw error;
      return data as CicloExtended;
    },
    enabled: !!user?.id && !!cicloId,
  });

  // Update metas mutation
  const updateMetasMutation = useMutation({
    mutationFn: async (metas: string[]) => {
      if (!cicloId) throw new Error("Ciclo não encontrado");
      
      const { data, error } = await supabase.rpc("update_cycle_metas" as any, {
        _ciclo_id: cicloId,
        _metas_json: metas,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-by-id", cicloId] });
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
    },
  });

  // Close cycle mutation
  const closeCycleMutation = useMutation({
    mutationFn: async (fechamento: { feitos: string; travas: string; proximos_passos: string }) => {
      if (!cicloId) throw new Error("Ciclo não encontrado");
      
      const { data, error } = await supabase.rpc("close_cycle" as any, {
        _ciclo_id: cicloId,
        _fechamento_json: fechamento,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-by-id", cicloId] });
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycle"] });
    },
  });

  // Parse metas
  const parsedMetas = (() => {
    const metas = cycleQuery.data?.metas_json;
    if (!metas || !Array.isArray(metas)) return [];
    return metas.map((m: any) => (typeof m === "string" ? m : m.titulo));
  })();

  return {
    cycle: cycleQuery.data,
    isLoading: cycleQuery.isLoading,
    metas: parsedMetas,

    updateMetas: updateMetasMutation.mutateAsync,
    isUpdatingMetas: updateMetasMutation.isPending,

    closeCycle: closeCycleMutation.mutateAsync,
    isClosingCycle: closeCycleMutation.isPending,

    refetch: cycleQuery.refetch,
  };
}
