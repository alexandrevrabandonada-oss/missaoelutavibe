import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";
import type { SquadTask, SquadTaskPrioridade } from "./useSquads";

// Types
export interface CycleTaskLink {
  id: string;
  ciclo_id: string;
  meta_key: string;
  task_id: string;
  created_at: string;
}

export interface MetaTaskMapping {
  meta_key: string;
  titulo: string;
  descricao?: string;
  squad_id: string;
  prioridade?: SquadTaskPrioridade;
  prazo_em?: string;
  assigned_to?: string;
}

export interface CycleTasksMetrics {
  abertas: number;
  feitas: number;
  bloqueadas: number;
  vencendo_7d: number;
  total: number;
  metas_total: number;
  metas_com_tarefa: number;
  metas_sem_tarefa: number;
}

// Extended SquadTask with squad name and ciclo_id
export interface CycleTask extends SquadTask {
  squad_nome?: string;
  ciclo_id?: string | null;
}

/**
 * Hook for managing cycle backlog (tasks linked to a cycle)
 */
export function useCycleBacklog(cicloId: string | undefined) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();
  const queryClient = useQueryClient();

  // Get tasks for this cycle
  const tasksQuery = useQuery({
    queryKey: ["cycle-tasks", cicloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_tasks")
        .select(`
          *,
          squad:squads(nome)
        `)
        .eq("ciclo_id", cicloId!)
        .order("status")
        .order("prioridade", { ascending: false })
        .order("prazo_em", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        squad_nome: t.squad?.nome,
      })) as CycleTask[];
    },
    enabled: !!user?.id && !!cicloId && isCoordinator(),
  });

  // Get task links for dedupe checking
  const linksQuery = useQuery({
    queryKey: ["cycle-task-links", cicloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ciclo_task_links")
        .select("*")
        .eq("ciclo_id", cicloId!);

      if (error) throw error;
      return (data || []) as CycleTaskLink[];
    },
    enabled: !!user?.id && !!cicloId && isCoordinator(),
  });

  // Get metrics for this cycle
  const metricsQuery = useQuery({
    queryKey: ["cycle-tasks-metrics", cicloId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_cycle_tasks_metrics", {
        _ciclo_id: cicloId,
      });

      if (error) throw error;
      return data as CycleTasksMetrics;
    },
    enabled: !!user?.id && !!cicloId && isCoordinator(),
  });

  // Create tasks from metas
  const createTasksMutation = useMutation({
    mutationFn: async (mappings: MetaTaskMapping[]) => {
      const { data, error } = await (supabase.rpc as any)("create_tasks_from_cycle_metas", {
        _ciclo_id: cicloId,
        _mappings: mappings,
      });

      if (error) throw error;
      return data as { created: number; skipped: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-tasks", cicloId] });
      queryClient.invalidateQueries({ queryKey: ["cycle-task-links", cicloId] });
      queryClient.invalidateQueries({ queryKey: ["cycle-tasks-metrics", cicloId] });
      queryClient.invalidateQueries({ queryKey: ["admin-squad-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["squad-tasks"] });
    },
  });

  // Check if a meta already has a linked task
  const isMetaLinked = (metaKey: string): boolean => {
    return (linksQuery.data || []).some((link) => link.meta_key === metaKey);
  };

  // Get linked task for a meta
  const getLinkedTask = (metaKey: string): CycleTask | undefined => {
    const link = (linksQuery.data || []).find((l) => l.meta_key === metaKey);
    if (!link) return undefined;
    return (tasksQuery.data || []).find((t) => t.id === link.task_id);
  };

  return {
    tasks: tasksQuery.data ?? [],
    isLoadingTasks: tasksQuery.isLoading,
    
    links: linksQuery.data ?? [],
    isLoadingLinks: linksQuery.isLoading,
    
    metrics: metricsQuery.data,
    isLoadingMetrics: metricsQuery.isLoading,
    
    isMetaLinked,
    getLinkedTask,
    
    createTasksFromMetas: createTasksMutation.mutateAsync,
    isCreatingTasks: createTasksMutation.isPending,
    
    refetch: () => {
      tasksQuery.refetch();
      linksQuery.refetch();
      metricsQuery.refetch();
    },
  };
}

/**
 * Hook for volunteer to get their cycle tasks
 */
export function useMyCycleTasks(cicloId: string | undefined) {
  const { user } = useAuth();

  const tasksQuery = useQuery({
    queryKey: ["my-cycle-tasks", cicloId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_my_cycle_tasks", {
        _ciclo_id: cicloId,
      });

      if (error) throw error;
      
      // Fetch squad names separately
      const tasks = (data || []) as SquadTask[];
      const squadIds = [...new Set(tasks.map(t => t.squad_id))];
      
      if (squadIds.length > 0) {
        const { data: squads } = await supabase
          .from("squads")
          .select("id, nome")
          .in("id", squadIds);
        
        const squadMap = new Map(squads?.map(s => [s.id, s.nome]) || []);
        return tasks.map(t => ({
          ...t,
          squad_nome: squadMap.get(t.squad_id),
        })) as CycleTask[];
      }
      
      return tasks as CycleTask[];
    },
    enabled: !!user?.id && !!cicloId,
  });

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    refetch: tasksQuery.refetch,
  };
}
