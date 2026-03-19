import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useUserCells } from "./useUserCells";

// Types for ciclos_semanais (using any until types are regenerated)
export type CicloStatus = "rascunho" | "ativo" | "encerrado";

export interface Ciclo {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  cidade: string | null;
  celula_id: string | null;
  status: CicloStatus;
  criado_por: string | null;
  metas_json: Record<string, unknown> | unknown[] | null;
  created_at: string;
  updated_at: string;
}

export interface CicloInsert {
  titulo: string;
  inicio: string;
  fim: string;
  cidade?: string | null;
  celula_id?: string | null;
  status?: CicloStatus;
  criado_por?: string;
}

// Helper to access table not yet in generated types
const ciclosTable = () => (supabase.from as any)("ciclos_semanais");

export function useCiclos() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { userCellIds } = useUserCells();
  const queryClient = useQueryClient();

  // Get all cycles (for coordinators)
  const ciclosQuery = useQuery({
    queryKey: ["ciclos"],
    queryFn: async () => {
      const { data, error } = await ciclosTable()
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as Ciclo[];
    },
    enabled: !!user?.id,
  });

  // Get active cycle for user's scope (cell priority > city > global)
  const activeCycleQuery = useQuery({
    queryKey: ["active-cycle", profile?.city, userCellIds],
    queryFn: async () => {
      // Priority 1: Check for cycle by user's cell
      if (userCellIds.length > 0) {
        const { data: cellCycle, error: cellError } = await ciclosTable()
          .select("*")
          .eq("status", "ativo")
          .in("celula_id", userCellIds)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (cellError) throw cellError;
        if (cellCycle) return cellCycle as Ciclo;
      }

      // Priority 2: Check for cycle by user's city
      if (profile?.city) {
        const { data: cityCycle, error: cityError } = await ciclosTable()
          .select("*")
          .eq("status", "ativo")
          .eq("cidade", profile.city)
          .is("celula_id", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (cityError) throw cityError;
        if (cityCycle) return cityCycle as Ciclo;
      }

      // Priority 3: Check for global cycle
      const { data: globalCycle, error: globalError } = await ciclosTable()
        .select("*")
        .eq("status", "ativo")
        .is("cidade", null)
        .is("celula_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (globalError) throw globalError;
      return globalCycle as Ciclo | null;
    },
    enabled: !!user?.id,
  });

  // Create cycle
  const createMutation = useMutation({
    mutationFn: async (ciclo: Omit<CicloInsert, "criado_por">) => {
      const { data, error } = await ciclosTable()
        .insert({
          ...ciclo,
          criado_por: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Ciclo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycle"] });
    },
  });

  // Activate cycle (deactivate others in same scope first)
  const activateCycleMutation = useMutation({
    mutationFn: async (cicloId: string) => {
      // Get the cycle to know its scope
      const { data: ciclo } = await ciclosTable()
        .select("*")
        .eq("id", cicloId)
        .single();

      if (!ciclo) throw new Error("Ciclo não encontrado");

      // Deactivate any other active cycles in the same scope
      await ciclosTable()
        .update({ status: "encerrado" })
        .eq("status", "ativo")
        .eq("cidade", ciclo.cidade || "")
        .neq("id", cicloId);

      // Activate this cycle
      const { data, error } = await ciclosTable()
        .update({ status: "ativo" })
        .eq("id", cicloId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Ciclo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycle"] });
    },
  });

  // End cycle
  const endCycleMutation = useMutation({
    mutationFn: async (cicloId: string) => {
      const { data, error } = await ciclosTable()
        .update({ status: "encerrado" })
        .eq("id", cicloId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Ciclo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycle"] });
    },
  });

  // Get cycles for a specific scope (for admin dropdowns)
  const getCyclesForScope = (cidade: string | null, celulaId: string | null) => {
    return ciclosQuery.data?.filter((c) => {
      // Global cycles are always included
      if (c.cidade === null && c.celula_id === null) return true;
      // Match by cell
      if (celulaId && c.celula_id === celulaId) return true;
      // Match by city (if no specific cell)
      if (cidade && c.cidade === cidade && c.celula_id === null) return true;
      return false;
    }) ?? [];
  };

  return {
    ciclos: ciclosQuery.data ?? [],
    activeCycle: activeCycleQuery.data,
    isLoading: ciclosQuery.isLoading,
    isLoadingActive: activeCycleQuery.isLoading,
    
    getCyclesForScope,
    
    createCycle: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    
    activateCycle: activateCycleMutation.mutateAsync,
    isActivating: activateCycleMutation.isPending,
    
    endCycle: endCycleMutation.mutateAsync,
    isEnding: endCycleMutation.isPending,
  };
}
