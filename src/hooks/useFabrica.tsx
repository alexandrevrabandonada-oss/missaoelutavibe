import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";
import { toast } from "sonner";

export type FabricaObjetivo = 'denuncia' | 'convite' | 'mobilizacao' | 'servico' | 'formacao' | 'outro';
export type FabricaStatus = 'rascunho' | 'revisao' | 'aprovado' | 'arquivado';

export interface FabricaTemplate {
  id: string;
  scope_tipo: string;
  scope_id: string | null;
  titulo: string;
  tema_tags: string[];
  objetivo: FabricaObjetivo;
  status: FabricaStatus;
  texto_base: string | null;
  variacoes_json: {
    titulos?: string[];
    ctas?: string[];
    legendas_curta?: string[];
  };
  instrucoes: string | null;
  hashtags: string[];
  attachments_json: Array<{
    url: string;
    filename: string;
    type?: string;
  }>;
  aprovado_por: string | null;
  aprovado_em: string | null;
  mural_post_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FabricaTemplateWithStats extends FabricaTemplate {
  download_count: number;
  share_count: number;
  user_shared: boolean;
}

export interface FabricaMetrics {
  total_templates: number;
  aprovados_total: number;
  aprovados_7d: number;
  em_revisao: number;
  compartilhados_semana: number;
  downloads_semana: number;
  top_template: {
    id: string;
    titulo: string;
    shares: number;
  } | null;
  week_start: string;
}

export const OBJETIVO_LABELS: Record<FabricaObjetivo, string> = {
  denuncia: "Denúncia",
  convite: "Convite",
  mobilizacao: "Mobilização",
  servico: "Serviço",
  formacao: "Formação",
  outro: "Outro",
};

export const OBJETIVO_ICONS: Record<FabricaObjetivo, string> = {
  denuncia: "🔴",
  convite: "💌",
  mobilizacao: "✊",
  servico: "🛠️",
  formacao: "📚",
  outro: "📦",
};

export const STATUS_LABELS: Record<FabricaStatus, string> = {
  rascunho: "Rascunho",
  revisao: "Em Revisão",
  aprovado: "Aprovado",
  arquivado: "Arquivado",
};

// Hook for volunteers to list approved templates
export function useTemplatesForUser() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["fabrica-templates-user"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("list_templates_for_user");

      if (error) {
        console.error("Error fetching templates:", error);
        throw error;
      }

      return (data || []) as FabricaTemplateWithStats[];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}

// Hook for coordinators to manage templates
export function useFabricaAdmin(scopeTipo?: string, scopeId?: string | null) {
  const { user } = useAuth();
  const { getScope, isCoordinator } = useUserRoles();
  const queryClient = useQueryClient();

  const userScope = getScope();
  const effectiveScopeTipo = scopeTipo ?? (userScope.type === "none" ? "global" : userScope.type);
  const effectiveScopeId = scopeId ?? userScope.cidade ?? userScope.cellId ?? null;

  // Fetch all templates for admin (via direct query since RLS handles access)
  const templatesQuery = useQuery({
    queryKey: ["fabrica-templates-admin", effectiveScopeTipo, effectiveScopeId],
    queryFn: async () => {
      let query = supabase
        .from("fabrica_templates")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching admin templates:", error);
        throw error;
      }

      return (data || []) as FabricaTemplate[];
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 30000,
  });

  // Create template
  const createMutation = useMutation({
    mutationFn: async (template: Partial<FabricaTemplate>) => {
      const insertData = {
        titulo: template.titulo || "",
        scope_tipo: template.scope_tipo || "global",
        scope_id: template.scope_id || null,
        objetivo: template.objetivo || "outro",
        texto_base: template.texto_base || null,
        instrucoes: template.instrucoes || null,
        hashtags: template.hashtags || [],
        tema_tags: template.tema_tags || [],
        attachments_json: template.attachments_json || [],
        variacoes_json: template.variacoes_json || {},
        created_by: user!.id,
      };

      const { data, error } = await supabase
        .from("fabrica_templates")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Template criado!");
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-admin"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });

  // Update template
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FabricaTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("fabrica_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Template atualizado!");
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-admin"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Delete template (drafts only)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fabrica_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template excluído!");
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-admin"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  // Approve template
  const approveMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await (supabase.rpc as any)("approve_template", {
        p_template_id: templateId,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Template aprovado!");
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-admin"] });
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-user"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao aprovar: " + error.message);
    },
  });

  // Request review
  const requestReviewMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await (supabase.rpc as any)("request_review_template", {
        p_template_id: templateId,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Enviado para revisão!");
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-admin"] });
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });

  // Archive template
  const archiveMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await (supabase.rpc as any)("archive_template", {
        p_template_id: templateId,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Template arquivado!");
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-admin"] });
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-user"] });
    },
    onError: (error: Error) => {
      toast.error("Erro: " + error.message);
    },
  });

  // Publish to mural
  const publishToMuralMutation = useMutation({
    mutationFn: async ({ templateId, scopeTipo, scopeId }: { templateId: string; scopeTipo?: string; scopeId?: string }) => {
      const { data, error } = await (supabase.rpc as any)("publish_template_to_mural", {
        p_template_id: templateId,
        p_scope_tipo: scopeTipo || null,
        p_scope_id: scopeId || null,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Publicado no mural!");
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-admin"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao publicar: " + error.message);
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error,
    refetch: templatesQuery.refetch,

    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    approve: approveMutation.mutateAsync,
    requestReview: requestReviewMutation.mutateAsync,
    archive: archiveMutation.mutateAsync,
    publishToMural: publishToMuralMutation.mutateAsync,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isApproving: approveMutation.isPending,

    effectiveScope: {
      tipo: effectiveScopeTipo,
      id: effectiveScopeId,
    },
  };
}

// Hook for tracking template actions
export function useTrackTemplateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, action }: { templateId: string; action: 'copiou_texto' | 'baixou_imagem' | 'compartilhou' }) => {
      const { data, error } = await (supabase.rpc as any)("track_template_action", {
        p_template_id: templateId,
        p_action: action,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.action === 'compartilhou') {
        toast.success("📣 Marcado como compartilhado!");
      }
      queryClient.invalidateQueries({ queryKey: ["fabrica-templates-user"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook for fabrica metrics (Ops)
export function useFabricaMetrics(scopeTipo: string = 'global', scopeId: string | null = null) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  return useQuery({
    queryKey: ["fabrica-metrics", scopeTipo, scopeId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_fabrica_metrics", {
        p_scope_tipo: scopeTipo,
        p_scope_id: scopeId,
      });

      if (error) {
        console.error("Error fetching fabrica metrics:", error);
        throw error;
      }

      return data as FabricaMetrics;
    },
    enabled: !!user?.id && isCoordinator(),
    staleTime: 60000,
  });
}
