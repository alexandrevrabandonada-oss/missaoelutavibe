import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useUserRoles } from "./useUserRoles";
import type { Database } from "@/integrations/supabase/types";

// Skill type definitions
export type SkillNivel = Database["public"]["Enums"]["skill_nivel"];

export interface PerfilSkill {
  id: string;
  user_id: string;
  skill: string;
  nivel: SkillNivel;
  disponibilidade_horas: number | null;
  disponibilidade_tags: string[];
  portfolio_url: string | null;
  created_at: string;
  updated_at: string;
}

// Available skills - aligned with interests from Onboarding
export const AVAILABLE_SKILLS = [
  { value: "rua", label: "Rua", desc: "Panfletagem, mutirões, ações de rua" },
  { value: "conteudo", label: "Conteúdo", desc: "Posts, vídeos, design gráfico" },
  { value: "escuta", label: "Escuta", desc: "Conversas, acolhimento, mediação" },
  { value: "dados", label: "Dados", desc: "Mapeamento, organização, análise" },
  { value: "tech", label: "Tech", desc: "Desenvolvimento, sistemas, automação" },
  { value: "formacao", label: "Formação", desc: "Estudar e ensinar, facilitação" },
  { value: "juridico", label: "Jurídico", desc: "Orientação legal, documentos" },
  { value: "logistica", label: "Logística", desc: "Transporte, materiais, operações" },
  { value: "comunicacao", label: "Comunicação", desc: "Redação, assessoria, redes" },
  { value: "audiovisual", label: "Audiovisual", desc: "Foto, vídeo, edição" },
  { value: "gestao", label: "Gestão", desc: "Planejamento, coordenação, projetos" },
] as const;

export const SKILL_NIVEL_LABELS: Record<SkillNivel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const DISPONIBILIDADE_TAGS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "fds", label: "Fim de semana" },
  { value: "flexivel", label: "Flexível" },
] as const;

// Hook for managing user's own skills
export function useMySkills() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const skillsQuery = useQuery({
    queryKey: ["my-skills", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("perfil_skills")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PerfilSkill[];
    },
    enabled: !!user?.id,
  });

  const addSkillMutation = useMutation({
    mutationFn: async (skill: {
      skill: string;
      nivel?: SkillNivel;
      disponibilidade_horas?: number;
      disponibilidade_tags?: string[];
      portfolio_url?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("perfil_skills")
        .insert({
          user_id: user.id,
          skill: skill.skill,
          nivel: skill.nivel || "iniciante",
          disponibilidade_horas: skill.disponibilidade_horas || null,
          disponibilidade_tags: skill.disponibilidade_tags || [],
          portfolio_url: skill.portfolio_url || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-skills", user?.id] });
    },
  });

  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerfilSkill> & { id: string }) => {
      const { data, error } = await supabase
        .from("perfil_skills")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-skills", user?.id] });
    },
  });

  const removeSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const { error } = await supabase
        .from("perfil_skills")
        .delete()
        .eq("id", skillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-skills", user?.id] });
    },
  });

  return {
    skills: skillsQuery.data ?? [],
    isLoading: skillsQuery.isLoading,
    addSkill: addSkillMutation.mutateAsync,
    isAdding: addSkillMutation.isPending,
    updateSkill: updateSkillMutation.mutateAsync,
    isUpdating: updateSkillMutation.isPending,
    removeSkill: removeSkillMutation.mutateAsync,
    isRemoving: removeSkillMutation.isPending,
  };
}

// Hook for coordinators to search skills (for matching)
export function useSkillsSearch(filters?: { skill?: string; cidade?: string; cellId?: string }) {
  const { isCoordinator } = useUserRoles();

  const searchQuery = useQuery({
    queryKey: ["skills-search", filters],
    queryFn: async () => {
      let query = supabase
        .from("perfil_skills")
        .select(`
          *,
          profiles:user_id (
            id,
            nickname,
            full_name,
            city,
            neighborhood,
            availability
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.skill) {
        query = query.eq("skill", filters.skill);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by city/cell on client side (profiles data)
      let filtered = data || [];
      if (filters?.cidade) {
        filtered = filtered.filter((s: any) => s.profiles?.city === filters.cidade);
      }

      return filtered;
    },
    enabled: isCoordinator(),
  });

  return {
    results: searchQuery.data ?? [],
    isLoading: searchQuery.isLoading,
    refetch: searchQuery.refetch,
  };
}

// Chamado type definitions
export type ChamadoUrgencia = Database["public"]["Enums"]["chamado_urgencia"];
export type ChamadoStatus = Database["public"]["Enums"]["chamado_status"];
export type ChamadoEscopoTipo = Database["public"]["Enums"]["chamado_escopo_tipo"];
export type CandidaturaStatus = Database["public"]["Enums"]["candidatura_status"];

export interface ChamadoTalento {
  id: string;
  escopo_tipo: ChamadoEscopoTipo;
  escopo_id: string;
  escopo_cidade: string | null;
  titulo: string;
  descricao: string;
  skills_requeridas: string[];
  urgencia: ChamadoUrgencia;
  status: ChamadoStatus;
  created_by: string;
  mural_post_id: string | null;
  mission_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Candidatura {
  id: string;
  chamado_id: string;
  user_id: string;
  mensagem: string | null;
  status: CandidaturaStatus;
  created_at: string;
  updated_at: string;
}

export const CHAMADO_URGENCIA_LABELS: Record<ChamadoUrgencia, { label: string; color: string }> = {
  baixa: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  media: { label: "Média", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  alta: { label: "Alta", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export const CHAMADO_STATUS_LABELS: Record<ChamadoStatus, { label: string; color: string }> = {
  aberto: { label: "Aberto", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  em_andamento: { label: "Em andamento", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  fechado: { label: "Fechado", color: "bg-muted text-muted-foreground" },
};

export const CANDIDATURA_STATUS_LABELS: Record<CandidaturaStatus, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  aceito: { label: "Aceito", color: "bg-green-100 text-green-800" },
  recusado: { label: "Recusado", color: "bg-red-100 text-red-800" },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

// Hook for volunteers to see open chamados in their territory
export function useChamadosAbertos(filters?: { skill?: string }) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const chamadosQuery = useQuery({
    queryKey: ["chamados-abertos", user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("chamados_talentos")
        .select("*")
        .eq("status", "aberto")
        .order("urgencia", { ascending: false })
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data || [];
      if (filters?.skill) {
        filtered = filtered.filter((c) => c.skills_requeridas.includes(filters.skill));
      }

      return filtered as ChamadoTalento[];
    },
    enabled: !!user?.id,
  });

  return {
    chamados: chamadosQuery.data ?? [],
    isLoading: chamadosQuery.isLoading,
    refetch: chamadosQuery.refetch,
  };
}

// Hook for coordinators to manage chamados
export function useChamadosAdmin() {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();
  const queryClient = useQueryClient();

  const chamadosQuery = useQuery({
    queryKey: ["chamados-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados_talentos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ChamadoTalento[];
    },
    enabled: !!user?.id && isCoordinator(),
  });

  const createChamadoMutation = useMutation({
    mutationFn: async (chamado: {
      escopo_tipo: ChamadoEscopoTipo;
      escopo_id: string;
      escopo_cidade?: string;
      titulo: string;
      descricao: string;
      skills_requeridas: string[];
      urgencia?: ChamadoUrgencia;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("chamados_talentos")
        .insert({
          ...chamado,
          created_by: user.id,
          escopo_cidade: chamado.escopo_cidade || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamados-admin"] });
      queryClient.invalidateQueries({ queryKey: ["chamados-abertos"] });
    },
  });

  const updateChamadoMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChamadoTalento> & { id: string }) => {
      const { data, error } = await supabase
        .from("chamados_talentos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamados-admin"] });
      queryClient.invalidateQueries({ queryKey: ["chamados-abertos"] });
    },
  });

  const deleteChamadoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chamados_talentos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chamados-admin"] });
    },
  });

  return {
    chamados: chamadosQuery.data ?? [],
    isLoading: chamadosQuery.isLoading,
    createChamado: createChamadoMutation.mutateAsync,
    isCreating: createChamadoMutation.isPending,
    updateChamado: updateChamadoMutation.mutateAsync,
    isUpdating: updateChamadoMutation.isPending,
    deleteChamado: deleteChamadoMutation.mutateAsync,
    isDeleting: deleteChamadoMutation.isPending,
    refetch: chamadosQuery.refetch,
  };
}

// Hook for managing candidaturas (volunteer side)
export function useMyCandidaturas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const candidaturasQuery = useQuery({
    queryKey: ["my-candidaturas", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("candidaturas_chamados")
        .select(`
          *,
          chamado:chamado_id (
            id,
            titulo,
            status,
            urgencia
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const candidatarMutation = useMutation({
    mutationFn: async ({ chamadoId, mensagem }: { chamadoId: string; mensagem?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("candidaturas_chamados")
        .insert({
          chamado_id: chamadoId,
          user_id: user.id,
          mensagem: mensagem || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-candidaturas", user?.id] });
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: async (candidaturaId: string) => {
      const { error } = await supabase
        .from("candidaturas_chamados")
        .delete()
        .eq("id", candidaturaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-candidaturas", user?.id] });
    },
  });

  const hasCandidatura = (chamadoId: string) => {
    return candidaturasQuery.data?.some((c) => c.chamado_id === chamadoId) ?? false;
  };

  return {
    candidaturas: candidaturasQuery.data ?? [],
    isLoading: candidaturasQuery.isLoading,
    candidatar: candidatarMutation.mutateAsync,
    isCandidatando: candidatarMutation.isPending,
    cancelar: cancelarMutation.mutateAsync,
    isCancelando: cancelarMutation.isPending,
    hasCandidatura,
  };
}

// Hook for coordinators to manage candidaturas
export function useCandidaturasAdmin(chamadoId?: string) {
  const { isCoordinator } = useUserRoles();
  const queryClient = useQueryClient();

  const candidaturasQuery = useQuery({
    queryKey: ["candidaturas-admin", chamadoId],
    queryFn: async () => {
      let query = supabase
        .from("candidaturas_chamados")
        .select(`
          *,
          profile:user_id (
            id,
            nickname,
            full_name,
            city
          )
        `)
        .order("created_at", { ascending: false });

      if (chamadoId) {
        query = query.eq("chamado_id", chamadoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isCoordinator(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CandidaturaStatus }) => {
      const { data, error } = await supabase
        .from("candidaturas_chamados")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidaturas-admin"] });
    },
  });

  return {
    candidaturas: candidaturasQuery.data ?? [],
    isLoading: candidaturasQuery.isLoading,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending,
    refetch: candidaturasQuery.refetch,
  };
}

// Hook for OPS metrics
export function useTalentosMetrics() {
  const { isCoordinator } = useUserRoles();

  const metricsQuery = useQuery({
    queryKey: ["talentos-metrics"],
    queryFn: async () => {
      // Get open chamados count
      const { count: chamadosAbertos } = await supabase
        .from("chamados_talentos")
        .select("*", { count: "exact", head: true })
        .eq("status", "aberto");

      // Get pending candidaturas count
      const { count: candidaturasPendentes } = await supabase
        .from("candidaturas_chamados")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");

      return {
        chamadosAbertos: chamadosAbertos ?? 0,
        candidaturasPendentes: candidaturasPendentes ?? 0,
      };
    },
    enabled: isCoordinator(),
  });

  return {
    metrics: metricsQuery.data ?? { chamadosAbertos: 0, candidaturasPendentes: 0 },
    isLoading: metricsQuery.isLoading,
  };
}
