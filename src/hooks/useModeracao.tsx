import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModerationQueueItem {
  report_id: string;
  created_at: string;
  motivo: string;
  categoria: string;
  status: string;
  target_type: string;
  target_id: string;
  target_author_id: string | null;
  author_nickname: string | null;
  report_count: number;
  content_preview: string | null;
  assigned_to: string | null;
  assigned_nickname: string | null;
}

export interface HiddenContent {
  id: string;
  content_type: string;
  content_preview: string | null;
  author_id: string;
  author_nickname: string | null;
  hidden_at: string;
  created_at: string;
}

export interface ActiveSanction {
  id: string;
  user_id: string;
  user_nickname: string | null;
  kind: string;
  starts_at: string;
  ends_at: string | null;
  reason: string | null;
  moderator_nickname: string | null;
}

export interface ModerationTemplate {
  id: string;
  scope_tipo: string;
  scope_id: string | null;
  title: string;
  body: string;
  created_by: string;
  created_at: string;
}

export interface ModerationMetrics {
  reports_open: number;
  hidden_posts: number;
  active_sanctions: number;
}

export interface ModerationFilters {
  status?: string;
  target_type?: string;
  my_assigned?: boolean;
  order_by?: "recent" | "most_reported";
}

// Hook para buscar fila de moderação
export function useModerationQueue(scopeTipo: string, scopeId: string, filters: ModerationFilters = {}) {
  return useQuery({
    queryKey: ["moderation-queue", scopeTipo, scopeId, filters],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_moderation_queue", {
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
        _filters_json: filters,
      });

      if (error) {
        console.error("Error fetching moderation queue:", error);
        throw error;
      }

      return data as ModerationQueueItem[];
    },
    enabled: !!scopeTipo && !!scopeId,
    staleTime: 30000,
  });
}

// Hook para buscar conteúdo oculto
export function useHiddenContent(scopeTipo: string, scopeId: string, targetType: string = "all") {
  return useQuery({
    queryKey: ["hidden-content", scopeTipo, scopeId, targetType],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_hidden_content", {
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
        _target_type: targetType,
      });

      if (error) {
        console.error("Error fetching hidden content:", error);
        throw error;
      }

      return data as HiddenContent[];
    },
    enabled: !!scopeTipo && !!scopeId,
    staleTime: 30000,
  });
}

// Hook para buscar sanções ativas
export function useActiveSanctions(scopeTipo: string, scopeId: string) {
  return useQuery({
    queryKey: ["active-sanctions", scopeTipo, scopeId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_active_sanctions", {
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
      });

      if (error) {
        console.error("Error fetching active sanctions:", error);
        throw error;
      }

      return data as ActiveSanction[];
    },
    enabled: !!scopeTipo && !!scopeId,
    staleTime: 30000,
  });
}

// Hook para métricas de moderação
export function useModerationMetrics(scopeTipo: string, scopeId: string) {
  return useQuery({
    queryKey: ["moderation-metrics", scopeTipo, scopeId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_moderation_metrics", {
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
      });

      if (error) {
        console.error("Error fetching moderation metrics:", error);
        throw error;
      }

      return data as ModerationMetrics;
    },
    enabled: !!scopeTipo && !!scopeId,
    staleTime: 30000,
  });
}

// Hook para templates de moderação
export function useModerationTemplates(scopeTipo: string, scopeId: string | null) {
  return useQuery({
    queryKey: ["moderation-templates", scopeTipo, scopeId],
    queryFn: async () => {
      let query = supabase
        .from("moderacao_templates")
        .select("*")
        .order("title");

      // Include global templates and scope-specific templates
      if (scopeId) {
        query = query.or(`scope_tipo.eq.global,and(scope_tipo.eq.${scopeTipo},scope_id.eq.${scopeId})`);
      } else {
        query = query.eq("scope_tipo", "global");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching moderation templates:", error);
        throw error;
      }

      return data as ModerationTemplate[];
    },
    enabled: !!scopeTipo,
    staleTime: 60000,
  });
}

// Mutation para executar ação de moderação
export function useModerateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      actionType,
      payload,
    }: {
      reportId: string;
      actionType: string;
      payload?: {
        note?: string;
        duration_hours?: number;
        template_id?: string;
        action_taken?: string;
        assign_to_me?: boolean;
      };
    }) => {
      const { data, error } = await (supabase.rpc as any)("moderate_action", {
        _report_id: reportId,
        _action_type: actionType,
        _payload_json: payload || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderation-queue"] });
      queryClient.invalidateQueries({ queryKey: ["hidden-content"] });
      queryClient.invalidateQueries({ queryKey: ["active-sanctions"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-metrics"] });
      toast.success("Ação de moderação executada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Mutation para ação direta (sem report)
export function useDirectModerateAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scopeTipo,
      scopeId,
      targetType,
      targetId,
      actionType,
      payload,
    }: {
      scopeTipo: string;
      scopeId: string;
      targetType: string;
      targetId: string;
      actionType: string;
      payload?: {
        note?: string;
        duration_hours?: number;
      };
    }) => {
      const { data, error } = await (supabase.rpc as any)("direct_moderate_action", {
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
        _target_type: targetType,
        _target_id: targetId,
        _action_type: actionType,
        _payload_json: payload || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hidden-content"] });
      queryClient.invalidateQueries({ queryKey: ["active-sanctions"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
      toast.success("Ação executada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Mutation para remover sanção
export function useRemoveSanction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sanctionId,
      note,
    }: {
      sanctionId: string;
      note?: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)("remove_sanction", {
        _sanction_id: sanctionId,
        _note: note,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sanctions"] });
      queryClient.invalidateQueries({ queryKey: ["moderation-metrics"] });
      toast.success("Sanção removida!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Mutation para criar template
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scopeTipo,
      scopeId,
      title,
      body,
    }: {
      scopeTipo: string;
      scopeId?: string;
      title: string;
      body: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("moderacao_templates").insert({
        scope_tipo: scopeTipo,
        scope_id: scopeId || null,
        title,
        body,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderation-templates"] });
      toast.success("Template criado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Mutation para deletar template
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("moderacao_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderation-templates"] });
      toast.success("Template removido!");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Constantes de categorias de report
export const REPORT_CATEGORIES = [
  { value: "spam", label: "Spam", emoji: "🚫" },
  { value: "assedio", label: "Assédio", emoji: "⚠️" },
  { value: "desinformacao", label: "Desinformação", emoji: "❌" },
  { value: "offtopic", label: "Fora do Tema", emoji: "📋" },
  { value: "outro", label: "Outro", emoji: "❓" },
] as const;

// Constantes de ações de sanção
export const SANCTION_ACTIONS = [
  { value: "warning", label: "Advertência", duration: null, icon: "⚠️" },
  { value: "mute", label: "Mute 24h", duration: 24, icon: "🔇" },
  { value: "mute", label: "Mute 7 dias", duration: 168, icon: "🔇" },
  { value: "ban", label: "Ban 7 dias", duration: 168, icon: "🚫" },
] as const;
