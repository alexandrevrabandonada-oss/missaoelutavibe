import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

type Demanda = Database["public"]["Tables"]["demandas"]["Row"];
type DemandaInsert = Database["public"]["Tables"]["demandas"]["Insert"];
type DemandaUpdate = Database["public"]["Tables"]["demandas"]["Update"];

export type DemandaTipo = Database["public"]["Enums"]["demanda_tipo"];
export type DemandaStatus = Database["public"]["Enums"]["demanda_status"];
export type DemandaPrioridade = Database["public"]["Enums"]["demanda_prioridade"];

export const DEMANDA_TIPO_LABELS: Record<DemandaTipo, string> = {
  roda_conversa: "Roda de Conversa",
  material: "Material",
  duvida: "Dúvida",
  evento: "Evento",
  denuncia: "Denúncia",
  outro: "Outro",
  sugestao_base: "Sugestão da Base",
};

export const DEMANDA_STATUS_LABELS: Record<DemandaStatus, string> = {
  nova: "Nova",
  triagem: "Triagem",
  atribuida: "Atribuída",
  agendada: "Agendada",
  concluida: "Concluída",
  arquivada: "Arquivada",
};

export const DEMANDA_PRIORIDADE_LABELS: Record<DemandaPrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export function useDemandas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's own demandas
  const userDemandasQuery = useQuery({
    queryKey: ["demandas", "user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("demandas")
        .select("*")
        .eq("criada_por", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Demanda[];
    },
    enabled: !!user?.id,
  });

  // Get all demandas (for coordinators)
  const allDemandasQuery = useQuery({
    queryKey: ["demandas", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Demanda[];
    },
  });

  // Create demanda
  const createMutation = useMutation({
    mutationFn: async (demanda: Omit<DemandaInsert, "criada_por">) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("demandas")
        .insert({ ...demanda, criada_por: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
    },
  });

  // Update demanda
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DemandaUpdate> & { id: string }) => {
      const { data, error } = await supabase
        .from("demandas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
    },
  });

  // Get demandas count by status
  const demandasCountQuery = useQuery({
    queryKey: ["demandas", "count"],
    queryFn: async () => {
      const { count: novasCount } = await supabase
        .from("demandas")
        .select("*", { count: "exact", head: true })
        .eq("status", "nova");

      const { count: triagemCount } = await supabase
        .from("demandas")
        .select("*", { count: "exact", head: true })
        .eq("status", "triagem");

      const { count: emAndamentoCount } = await supabase
        .from("demandas")
        .select("*", { count: "exact", head: true })
        .in("status", ["atribuida", "agendada"]);

      return {
        novas: novasCount ?? 0,
        triagem: triagemCount ?? 0,
        emAndamento: emAndamentoCount ?? 0,
        pendentes: (novasCount ?? 0) + (triagemCount ?? 0),
      };
    },
  });

  return {
    userDemandas: userDemandasQuery.data ?? [],
    allDemandas: allDemandasQuery.data ?? [],
    isLoading: userDemandasQuery.isLoading,
    isLoadingAll: allDemandasQuery.isLoading,
    createDemanda: createMutation.mutateAsync,
    updateDemanda: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    demandasCount: demandasCountQuery.data ?? { novas: 0, triagem: 0, emAndamento: 0, pendentes: 0 },
    refetch: () => {
      userDemandasQuery.refetch();
      allDemandasQuery.refetch();
      demandasCountQuery.refetch();
    },
  };
}
