import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface ReplicacaoStatus {
  exists: boolean;
  has_mission: boolean;
  has_task: boolean;
  mission_id?: string;
  task_id?: string;
}

export interface ReplicacoesMetrics {
  criadas_missao: number;
  criadas_tarefa: number;
  concluidas_missao: number;
  pendentes: number;
  total: number;
}

export interface CreateMissionOptions {
  titulo: string;
  descricao?: string;
  publicar_no_mural?: boolean;
}

export interface CreateTaskOptions {
  titulo: string;
  descricao?: string;
  prioridade?: "baixa" | "media" | "alta";
  prazo_em?: string;
  assigned_to?: string;
}

// Check if an item has been replicated
export function useCheckReplicacao(
  weekStart: string,
  scopeTipo: string,
  scopeId: string,
  sourceType: string,
  sourceId: string
) {
  return useQuery({
    queryKey: ["replicacao-status", weekStart, scopeTipo, scopeId, sourceType, sourceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_replicacao_exists", {
        _week_start: weekStart,
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
        _source_type: sourceType,
        _source_id: sourceId,
      });
      
      if (error) throw error;
      const result = data as unknown as ReplicacaoStatus;
      return result ?? { exists: false, has_mission: false, has_task: false };
    },
    enabled: !!weekStart && !!scopeTipo && !!scopeId && !!sourceType && !!sourceId,
  });
}

// Get replicacoes metrics for a week/scope
export function useReplicacoesMetrics(
  weekStart: string,
  scopeTipo: string,
  scopeId: string
) {
  return useQuery({
    queryKey: ["replicacoes-metrics", weekStart, scopeTipo, scopeId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_replicacoes_metrics", {
        _week_start: weekStart,
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
      });
      
      if (error) throw error;
      const result = data as unknown as ReplicacoesMetrics;
      return result ?? { criadas_missao: 0, criadas_tarefa: 0, concluidas_missao: 0, pendentes: 0, total: 0 };
    },
    enabled: !!weekStart && !!scopeTipo && !!scopeId,
  });
}

// Create replicable mission from top item
export function useCreateReplicableMission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      weekStart,
      scopeTipo,
      scopeId,
      sourceType,
      sourceId,
      options,
    }: {
      weekStart: string;
      scopeTipo: string;
      scopeId: string;
      sourceType: string;
      sourceId: string;
      options: CreateMissionOptions;
    }) => {
      const optionsJson: Json = {
        titulo: options.titulo,
        descricao: options.descricao ?? "",
        publicar_no_mural: options.publicar_no_mural ?? false,
      };
      
      const { data, error } = await supabase.rpc("create_replicable_mission_from_top", {
        _week_start: weekStart,
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
        _source_type: sourceType,
        _source_id: sourceId,
        _options_json: optionsJson,
      });
      
      if (error) throw error;
      
      const result = data as unknown as { success: boolean; error?: string; mission_id?: string; mural_post_id?: string };
      if (!result.success) {
        throw new Error(result.error || "Falha ao criar missão");
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success("Missão replicável criada!");
      queryClient.invalidateQueries({ queryKey: ["replicacao-status"] });
      queryClient.invalidateQueries({ queryKey: ["replicacoes-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Create task from top item
export function useCreateTaskFromTop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      weekStart,
      scopeTipo,
      scopeId,
      sourceType,
      sourceId,
      squadId,
      options,
    }: {
      weekStart: string;
      scopeTipo: string;
      scopeId: string;
      sourceType: string;
      sourceId: string;
      squadId: string;
      options: CreateTaskOptions;
    }) => {
      const optionsJson: Json = {
        titulo: options.titulo,
        descricao: options.descricao ?? "",
        prioridade: options.prioridade ?? "media",
        prazo_em: options.prazo_em ?? null,
        assigned_to: options.assigned_to ?? null,
      };
      
      const { data, error } = await supabase.rpc("create_task_from_top", {
        _week_start: weekStart,
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
        _source_type: sourceType,
        _source_id: sourceId,
        _squad_id: squadId,
        _options_json: optionsJson,
      });
      
      if (error) throw error;
      
      const result = data as unknown as { success: boolean; error?: string; task_id?: string };
      if (!result.success) {
        throw new Error(result.error || "Falha ao criar tarefa");
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success("Tarefa criada!");
      queryClient.invalidateQueries({ queryKey: ["replicacao-status"] });
      queryClient.invalidateQueries({ queryKey: ["replicacoes-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["squad-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-squad-tasks"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Helper to check if a mission is replicavel/oficial
export function isReplicableMission(metaJson: unknown): boolean {
  if (!metaJson || typeof metaJson !== "object") return false;
  const meta = metaJson as Record<string, unknown>;
  return meta.oficial === true && meta.kind === "replicavel";
}
