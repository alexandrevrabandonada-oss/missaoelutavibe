/**
 * Governance Audit Hook v0
 * 
 * Provides access to governance audit logs for content workflows
 * (fabrica templates, roteiros, chamados, candidaturas)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRoles } from "./useUserRoles";

export type GovernanceEntityType = 
  | 'fabrica_template' 
  | 'roteiro_conversa' 
  | 'chamado_talentos' 
  | 'candidatura_chamado'
  | 'app_config';

export type GovernanceAction = 
  | 'status_change' 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'published_to_mural' 
  | 'approved' 
  | 'archived' 
  | 'requested_review'
  | 'accepted'
  | 'rejected';

export interface GovernanceAuditEntry {
  id: string;
  action: GovernanceAction;
  old_status: string | null;
  new_status: string | null;
  actor_nickname: string;
  meta: Record<string, any>;
  created_at: string;
}

// Labels for UI
export const ACTION_LABELS: Record<GovernanceAction, string> = {
  status_change: "Mudança de status",
  created: "Criado",
  updated: "Atualizado",
  deleted: "Excluído",
  published_to_mural: "Publicado no mural",
  approved: "Aprovado",
  archived: "Arquivado",
  requested_review: "Enviado para revisão",
  accepted: "Aceito",
  rejected: "Rejeitado",
};

export const ENTITY_TYPE_LABELS: Record<GovernanceEntityType, string> = {
  fabrica_template: "Template",
  roteiro_conversa: "Roteiro",
  chamado_talentos: "Chamado",
  candidatura_chamado: "Candidatura",
  app_config: "Configuração",
};

// Format status for display
export function formatStatus(status: string | null): string {
  if (!status) return "—";
  const labels: Record<string, string> = {
    rascunho: "Rascunho",
    revisao: "Em Revisão",
    aprovado: "Aprovado",
    arquivado: "Arquivado",
    aberto: "Aberto",
    em_andamento: "Em Andamento",
    fechado: "Fechado",
    pendente: "Pendente",
    aceito: "Aceito",
    recusado: "Recusado",
    enviado: "Enviado",
    retirado: "Retirado",
  };
  return labels[status] || status;
}

// Format date for display
export function formatAuditDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora";
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

/**
 * Hook to fetch audit history for a specific entity
 */
export function useEntityAudit(entityType: GovernanceEntityType, entityId: string | null) {
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();

  return useQuery({
    queryKey: ["governance-audit", entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];

      const { data, error } = await (supabase.rpc as any)("get_entity_audit", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_limit: 50,
      });

      if (error) {
        console.error("Error fetching entity audit:", error);
        throw error;
      }

      return (data || []) as GovernanceAuditEntry[];
    },
    enabled: !!user?.id && !!entityId && isCoordinator(),
    staleTime: 30000,
  });
}

/**
 * Hook to manually log a governance action (for explicit publish-to-mural, etc.)
 */
export function useLogGovernanceAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      action,
      oldStatus,
      newStatus,
      meta,
    }: {
      entityType: GovernanceEntityType;
      entityId: string;
      action: GovernanceAction;
      oldStatus?: string;
      newStatus?: string;
      meta?: Record<string, any>;
    }) => {
      const { data, error } = await (supabase.rpc as any)("log_governance_action", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_action: action,
        p_old_status: oldStatus || null,
        p_new_status: newStatus || null,
        p_meta: meta || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["governance-audit", variables.entityType, variables.entityId] 
      });
    },
  });
}
