import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";
import { toast } from "@/hooks/use-toast";

// Types
export type RoteiroObjetivo = 'convidar' | 'explicar' | 'objecao' | 'fechamento';
export type RoteiroStatus = 'rascunho' | 'revisao' | 'aprovado' | 'arquivado';
export type RoteiroEscopoTipo = 'global' | 'estado' | 'cidade' | 'celula';
export type RoteiroActionType = 'copiou' | 'abriu_whatsapp' | 'usei';

export interface RoteiroVersoes {
  curta: string;
  media: string;
  longa: string;
}

// Use Json type for DB compatibility
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Roteiro {
  id: string;
  titulo: string;
  objetivo: RoteiroObjetivo;
  texto_base: string;
  versoes_json: Json;
  tags: string[];
  status: RoteiroStatus;
  escopo_tipo: RoteiroEscopoTipo;
  escopo_estado: string | null;
  escopo_cidade: string | null;
  escopo_celula_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRoteiroInput {
  titulo: string;
  objetivo: RoteiroObjetivo;
  texto_base: string;
  versoes_json?: Json;
  tags?: string[];
  status?: RoteiroStatus;
  escopo_tipo?: RoteiroEscopoTipo;
  escopo_estado?: string | null;
  escopo_cidade?: string | null;
  escopo_celula_id?: string | null;
}

export interface UpdateRoteiroInput extends Partial<CreateRoteiroInput> {
  id: string;
}

export interface RoteiroMetrics {
  total_roteiros: number;
  roteiros_revisao: number;
  acoes_periodo: number;
  usuarios_ativos: number;
  top_roteiros: Array<{
    id: string;
    titulo: string;
    objetivo: string;
    total_acoes: number;
    usos: number;
  }>;
  por_objetivo: Record<string, number>;
}

// Constants
export const OBJETIVO_LABELS: Record<RoteiroObjetivo, string> = {
  convidar: "Convidar",
  explicar: "Explicar",
  objecao: "Objeção",
  fechamento: "Fechamento",
};

export const OBJETIVO_COLORS: Record<RoteiroObjetivo, string> = {
  convidar: "bg-green-100 text-green-800",
  explicar: "bg-blue-100 text-blue-800",
  objecao: "bg-orange-100 text-orange-800",
  fechamento: "bg-purple-100 text-purple-800",
};

export const STATUS_LABELS: Record<RoteiroStatus, string> = {
  rascunho: "Rascunho",
  revisao: "Em Revisão",
  aprovado: "Aprovado",
  arquivado: "Arquivado",
};

export const STATUS_COLORS: Record<RoteiroStatus, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  revisao: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-green-100 text-green-800",
  arquivado: "bg-red-100 text-red-800",
};

export const ESCOPO_LABELS: Record<RoteiroEscopoTipo, string> = {
  global: "Global",
  estado: "Estado",
  cidade: "Cidade",
  celula: "Célula",
};

// Hook for volunteers to fetch approved roteiros
export function useRoteirosAprovados(objetivo?: RoteiroObjetivo) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["roteiros-aprovados", objetivo],
    queryFn: async () => {
      let query = supabase
        .from("roteiros_conversa")
        .select("*")
        .eq("status", "aprovado")
        .order("updated_at", { ascending: false });

      if (objetivo) {
        query = query.eq("objetivo", objetivo);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching roteiros:", error);
        throw error;
      }

      return data as Roteiro[];
    },
    enabled: !!user?.id,
  });
}

// Hook for admin to fetch all roteiros with filters
export function useRoteirosAdmin(status?: RoteiroStatus) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  return useQuery({
    queryKey: ["roteiros-admin", status],
    queryFn: async () => {
      let query = supabase
        .from("roteiros_conversa")
        .select("*")
        .order("updated_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching roteiros:", error);
        throw error;
      }

      return data as Roteiro[];
    },
    enabled: !!user?.id && isCoordinator(),
  });
}

// Hook for single roteiro
export function useRoteiro(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["roteiro", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("roteiros_conversa")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching roteiro:", error);
        throw error;
      }

      return data as Roteiro;
    },
    enabled: !!user?.id && !!id,
  });
}

// Hook for CRUD mutations
export function useRoteirosMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createMutation = useMutation({
    mutationFn: async (input: CreateRoteiroInput) => {
      const { data, error } = await supabase
        .from("roteiros_conversa")
        .insert({
          ...input,
          created_by: user?.id,
          versoes_json: input.versoes_json || { curta: "", media: "", longa: "" },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roteiros-admin"] });
      toast({ title: "Roteiro criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar roteiro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateRoteiroInput) => {
      const { id, ...rest } = input;
      const { data, error } = await supabase
        .from("roteiros_conversa")
        .update(rest)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roteiros-admin"] });
      queryClient.invalidateQueries({ queryKey: ["roteiros-aprovados"] });
      queryClient.invalidateQueries({ queryKey: ["roteiro"] });
      toast({ title: "Roteiro atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar roteiro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("roteiros_conversa")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roteiros-admin"] });
      toast({ title: "Roteiro excluído!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir roteiro", description: error.message, variant: "destructive" });
    },
  });

  const publishToMuralMutation = useMutation({
    mutationFn: async ({ roteiroId, cellId, tituloOverride }: { roteiroId: string; cellId: string; tituloOverride?: string }) => {
      const { data, error } = await (supabase.rpc as any)("publish_roteiro_to_mural", {
        p_roteiro_id: roteiroId,
        p_cell_id: cellId,
        p_titulo_override: tituloOverride || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Roteiro publicado no mural!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao publicar no mural", description: error.message, variant: "destructive" });
    },
  });

  return {
    createRoteiro: createMutation,
    updateRoteiro: updateMutation,
    deleteRoteiro: deleteMutation,
    publishToMural: publishToMuralMutation,
  };
}

// Hook for tracking actions
export function useRoteiroActions() {
  const queryClient = useQueryClient();

  const trackAction = useMutation({
    mutationFn: async ({ roteiroId, actionType }: { roteiroId: string; actionType: RoteiroActionType }) => {
      const { data, error } = await (supabase.rpc as any)("track_roteiro_action", {
        p_roteiro_id: roteiroId,
        p_action_type: actionType,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roteiros-metrics"] });
    },
  });

  return { trackAction };
}

// Hook for metrics
export function useRoteirosMetrics(days: number = 7) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  return useQuery({
    queryKey: ["roteiros-metrics", days],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_roteiros_metrics", {
        p_days: days,
      });

      if (error) {
        console.error("Error fetching roteiros metrics:", error);
        throw error;
      }

      return data as RoteiroMetrics;
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000, // 1 minute
  });
}

// Hook to get "roteiro do dia" - random approved roteiro
export function useRoteiroDoDia() {
  const { data: roteiros, isLoading } = useRoteirosAprovados();

  const roteiroDoDia = roteiros && roteiros.length > 0
    ? roteiros[Math.floor(Math.random() * roteiros.length)]
    : null;

  return { roteiroDoDia, isLoading };
}
