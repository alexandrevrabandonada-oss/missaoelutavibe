import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";

// Types
export type SquadStatus = "ativo" | "pausado" | "encerrado";
export type SquadMembroPapel = "membro" | "lider" | "apoio";
export type SquadTaskStatus = "a_fazer" | "fazendo" | "feito" | "bloqueado";
export type SquadTaskPrioridade = "baixa" | "media" | "alta";
export type SquadTaskUpdateTipo = "comentario" | "evidencia" | "status" | "bloqueio";

export interface Squad {
  id: string;
  escopo_tipo: "celula" | "cidade";
  escopo_id: string;
  escopo_cidade: string | null;
  nome: string;
  objetivo: string | null;
  lider_user_id: string;
  status: SquadStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  lider?: { nickname: string; full_name: string | null };
  members_count?: number;
  tasks_count?: number;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  papel: SquadMembroPapel;
  created_at: string;
  profile?: { nickname: string; full_name: string | null; avatar_url: string | null };
}

export interface SquadTask {
  id: string;
  squad_id: string;
  titulo: string;
  descricao: string | null;
  status: SquadTaskStatus;
  prioridade: SquadTaskPrioridade;
  prazo_em: string | null;
  assigned_to: string | null;
  ligado_chamado_id: string | null;
  ligado_missao_id: string | null;
  ligado_atividade_id: string | null;
  mural_post_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  squad?: { nome: string };
  assigned_profile?: { nickname: string; full_name: string | null };
  chamado?: { titulo: string };
}

export interface SquadTaskUpdate {
  id: string;
  task_id: string;
  author_user_id: string;
  tipo: SquadTaskUpdateTipo;
  texto: string | null;
  anexo_url: string | null;
  created_at: string;
  author?: { nickname: string; full_name: string | null };
}

export const TASK_STATUS_LABELS: Record<SquadTaskStatus, { label: string; color: string }> = {
  a_fazer: { label: "A Fazer", color: "bg-muted text-muted-foreground" },
  fazendo: { label: "Fazendo", color: "bg-blue-100 text-blue-800" },
  feito: { label: "Feito", color: "bg-green-100 text-green-800" },
  bloqueado: { label: "Bloqueado", color: "bg-red-100 text-red-800" },
};

export const TASK_PRIORITY_LABELS: Record<SquadTaskPrioridade, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-gray-100 text-gray-800" },
  media: { label: "Média", color: "bg-yellow-100 text-yellow-800" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-800" },
};

export const SQUAD_STATUS_LABELS: Record<SquadStatus, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800" },
  pausado: { label: "Pausado", color: "bg-yellow-100 text-yellow-800" },
  encerrado: { label: "Encerrado", color: "bg-gray-100 text-gray-800" },
};

// ============================================
// VOLUNTEER HOOKS
// ============================================

export function useMySquads() {
  const { user } = useAuth();

  const squadsQuery = useQuery({
    queryKey: ["my-squads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_members")
        .select(`
          squad_id,
          papel,
          squad:squads(*)
        `)
        .eq("user_id", user!.id);

      if (error) throw error;
      return data.map((m: any) => ({
        ...m.squad,
        my_papel: m.papel,
      })) as (Squad & { my_papel: SquadMembroPapel })[];
    },
    enabled: !!user?.id,
  });

  return {
    squads: squadsQuery.data ?? [],
    isLoading: squadsQuery.isLoading,
    error: squadsQuery.error,
    refetch: squadsQuery.refetch,
  };
}

export function useMyTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["my-tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_tasks")
        .select(`
          *,
          squad:squads(nome),
          chamado:chamados_talentos(titulo)
        `)
        .eq("assigned_to", user!.id)
        .in("status", ["a_fazer", "fazendo", "bloqueado"])
        .order("prazo_em", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as SquadTask[];
    },
    enabled: !!user?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: SquadTaskStatus }) => {
      const { error } = await supabase
        .from("squad_tasks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["squad-tasks"] });
    },
  });

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    refetch: tasksQuery.refetch,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending,
  };
}

export function useSquadTasks(squadId: string | undefined) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["squad-tasks", squadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_tasks")
        .select(`
          *,
          chamado:chamados_talentos(titulo)
        `)
        .eq("squad_id", squadId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch assigned profiles separately
      const tasks = data as any[];
      const userIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nickname, full_name")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        tasks.forEach(t => {
          if (t.assigned_to) {
            t.assigned_profile = profileMap.get(t.assigned_to);
          }
        });
      }
      
      return tasks as SquadTask[];
    },
    enabled: !!squadId,
  });

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    refetch: tasksQuery.refetch,
  };
}

export function useTaskUpdates(taskId: string | undefined) {
  const queryClient = useQueryClient();

  const updatesQuery = useQuery({
    queryKey: ["task-updates", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_task_updates")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch author profiles separately
      const updates = data as any[];
      const userIds = [...new Set(updates.map(u => u.author_user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nickname, full_name")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        updates.forEach(u => {
          u.author = profileMap.get(u.author_user_id);
        });
      }
      
      return updates as SquadTaskUpdate[];
    },
    enabled: !!taskId,
  });

  const addUpdateMutation = useMutation({
    mutationFn: async (update: { tipo: SquadTaskUpdateTipo; texto?: string; anexo_url?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("squad_task_updates")
        .insert({
          task_id: taskId!,
          author_user_id: user!.id,
          tipo: update.tipo,
          texto: update.texto,
          anexo_url: update.anexo_url,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-updates", taskId] });
    },
  });

  return {
    updates: updatesQuery.data ?? [],
    isLoading: updatesQuery.isLoading,
    addUpdate: addUpdateMutation.mutateAsync,
    isAdding: addUpdateMutation.isPending,
  };
}

// ============================================
// ADMIN HOOKS
// ============================================

export function useSquadsAdmin(filters?: { status?: SquadStatus; escopo_tipo?: string; escopo_id?: string }) {
  const { isCoordinator } = useUserRoles();
  const queryClient = useQueryClient();

  const squadsQuery = useQuery({
    queryKey: ["admin-squads", filters],
    queryFn: async () => {
      let query = supabase
        .from("squads")
        .select(`
          *,
          members_count:squad_members(count),
          tasks_count:squad_tasks(count)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.escopo_tipo) {
        query = query.eq("escopo_tipo", filters.escopo_tipo);
      }
      if (filters?.escopo_id) {
        query = query.eq("escopo_id", filters.escopo_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data.map((s: any) => ({
        ...s,
        members_count: s.members_count?.[0]?.count ?? 0,
        tasks_count: s.tasks_count?.[0]?.count ?? 0,
      })) as Squad[];
    },
    enabled: isCoordinator(),
  });

  const createSquadMutation = useMutation({
    mutationFn: async (squad: {
      nome: string;
      objetivo?: string;
      escopo_tipo: "celula" | "cidade";
      escopo_id: string;
      escopo_cidade?: string;
      lider_user_id: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create squad
      const { data, error } = await supabase
        .from("squads")
        .insert({
          ...squad,
          created_by: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Add leader as member
      await supabase
        .from("squad_members")
        .insert({
          squad_id: data.id,
          user_id: squad.lider_user_id,
          papel: "lider",
        });

      return data as Squad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-squads"] });
    },
  });

  const updateSquadMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Squad> & { id: string }) => {
      const { error } = await supabase
        .from("squads")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-squads"] });
    },
  });

  return {
    squads: squadsQuery.data ?? [],
    isLoading: squadsQuery.isLoading,
    refetch: squadsQuery.refetch,
    createSquad: createSquadMutation.mutateAsync,
    isCreating: createSquadMutation.isPending,
    updateSquad: updateSquadMutation.mutateAsync,
    isUpdating: updateSquadMutation.isPending,
  };
}

export function useSquadMembers(squadId: string | undefined) {
  const queryClient = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ["squad-members", squadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_members")
        .select("*")
        .eq("squad_id", squadId!);

      if (error) throw error;
      
      // Fetch profiles separately
      const members = data as any[];
      const userIds = members.map(m => m.user_id);
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nickname, full_name, avatar_url")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        members.forEach(m => {
          m.profile = profileMap.get(m.user_id);
        });
      }
      
      return members as SquadMember[];
    },
    enabled: !!squadId,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, papel }: { userId: string; papel: SquadMembroPapel }) => {
      const { error } = await supabase
        .from("squad_members")
        .insert({
          squad_id: squadId!,
          user_id: userId,
          papel,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squad-members", squadId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("squad_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squad-members", squadId] });
    },
  });

  return {
    members: membersQuery.data ?? [],
    isLoading: membersQuery.isLoading,
    addMember: addMemberMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
    isAdding: addMemberMutation.isPending,
  };
}

export function useSquadTasksAdmin(squadId: string | undefined) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["admin-squad-tasks", squadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_tasks")
        .select(`
          *,
          chamado:chamados_talentos(titulo)
        `)
        .eq("squad_id", squadId!)
        .order("status")
        .order("prioridade", { ascending: false })
        .order("prazo_em", { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Fetch assigned profiles separately
      const tasks = data as any[];
      const userIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nickname, full_name")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        tasks.forEach(t => {
          if (t.assigned_to) {
            t.assigned_profile = profileMap.get(t.assigned_to);
          }
        });
      }
      
      return tasks as SquadTask[];
    },
    enabled: !!squadId,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: {
      titulo: string;
      descricao?: string;
      prioridade: SquadTaskPrioridade;
      prazo_em?: string;
      assigned_to?: string;
      ligado_chamado_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("squad_tasks")
        .insert({
          ...task,
          squad_id: squadId!,
          created_by: user!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-squad-tasks", squadId] });
      queryClient.invalidateQueries({ queryKey: ["squad-metrics"] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SquadTask> & { id: string }) => {
      const { error } = await supabase
        .from("squad_tasks")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-squad-tasks", squadId] });
      queryClient.invalidateQueries({ queryKey: ["squad-metrics"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("squad_tasks")
        .delete()
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-squad-tasks", squadId] });
      queryClient.invalidateQueries({ queryKey: ["squad-metrics"] });
    },
  });

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    refetch: tasksQuery.refetch,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
  };
}

export function useBlockedTasks() {
  const { isCoordinator } = useUserRoles();

  const blockedQuery = useQuery({
    queryKey: ["blocked-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squad_tasks")
        .select(`
          *,
          squad:squads(nome)
        `)
        .eq("status", "bloqueado")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      // Fetch assigned profiles separately
      const tasks = data as any[];
      const userIds = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nickname, full_name")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        tasks.forEach(t => {
          if (t.assigned_to) {
            t.assigned_profile = profileMap.get(t.assigned_to);
          }
        });
      }
      
      return tasks as SquadTask[];
    },
    enabled: isCoordinator(),
  });

  return {
    blockedTasks: blockedQuery.data ?? [],
    isLoading: blockedQuery.isLoading,
    refetch: blockedQuery.refetch,
  };
}

export function useSquadMetrics() {
  const { isCoordinator, getScope } = useUserRoles();
  const scope = getScope();

  const metricsQuery = useQuery({
    queryKey: ["squad-metrics", scope],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_squad_metrics", {
        _scope_type: scope.type === "none" ? "all" : scope.type,
        _scope_cidade: scope.cidade,
        _scope_celula_id: scope.cellId,
      });

      if (error) throw error;
      return data as {
        squads_ativos: number;
        tarefas_abertas: number;
        tarefas_bloqueadas: number;
        tarefas_vencendo_7d: number;
      };
    },
    enabled: isCoordinator(),
  });

  return {
    metrics: metricsQuery.data,
    isLoading: metricsQuery.isLoading,
    refetch: metricsQuery.refetch,
  };
}

// Accept candidatura and create task
export function useAcceptCandidaturaWithTask() {
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async (params: {
      candidaturaId: string;
      squadId: string;
      taskTitulo: string;
      taskPrioridade?: SquadTaskPrioridade;
      taskPrazo?: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)("accept_candidatura_create_task", {
        _candidatura_id: params.candidaturaId,
        _squad_id: params.squadId,
        _task_titulo: params.taskTitulo,
        _task_prioridade: params.taskPrioridade ?? "media",
        _task_prazo: params.taskPrazo ?? null,
      });

      if (error) throw error;
      return data as { success: boolean; task_id: string; member_added: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidaturas-admin"] });
      queryClient.invalidateQueries({ queryKey: ["admin-squad-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["squad-members"] });
      queryClient.invalidateQueries({ queryKey: ["squad-metrics"] });
    },
  });

  return {
    acceptWithTask: acceptMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,
  };
}

// Get squads for dropdown (quick selection)
export function useSquadsForScope(escopoTipo?: string, escopoId?: string) {
  const squadsQuery = useQuery({
    queryKey: ["squads-for-scope", escopoTipo, escopoId],
    queryFn: async () => {
      let query = supabase
        .from("squads")
        .select("id, nome, status")
        .eq("status", "ativo");

      if (escopoTipo && escopoId) {
        query = query.eq("escopo_tipo", escopoTipo).eq("escopo_id", escopoId);
      }

      const { data, error } = await query.order("nome");
      if (error) throw error;
      return data as { id: string; nome: string; status: SquadStatus }[];
    },
    enabled: !!escopoTipo,
  });

  return {
    squads: squadsQuery.data ?? [],
    isLoading: squadsQuery.isLoading,
  };
}
