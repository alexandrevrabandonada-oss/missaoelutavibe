import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Types
export type LGPDRequestTipo = "export" | "exclusao" | "correcao";
export type LGPDRequestStatus = "aberto" | "em_andamento" | "concluido" | "negado";

export interface LGPDRequest {
  id: string;
  user_id: string;
  tipo: LGPDRequestTipo;
  status: LGPDRequestStatus;
  motivo: string | null;
  resposta: string | null;
  processado_por: string | null;
  processado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface RetentionPolicy {
  id: string;
  nome: string;
  tabela: string;
  dias_reter: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const LGPD_TIPO_LABELS: Record<LGPDRequestTipo, string> = {
  export: "Exportação de Dados",
  exclusao: "Exclusão de Dados",
  correcao: "Correção de Dados",
};

export const LGPD_STATUS_LABELS: Record<LGPDRequestStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  negado: "Negado",
};

// Hook for LGPD requests (admin view)
export function useLGPDRequests() {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["lgpd-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lgpd_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LGPDRequest[];
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({
      id,
      status,
      resposta,
    }: {
      id: string;
      status: LGPDRequestStatus;
      resposta?: string;
    }) => {
      const { user } = (await supabase.auth.getUser()).data;
      const { error } = await supabase
        .from("lgpd_requests")
        .update({
          status,
          resposta,
          processado_por: user?.id,
          processado_em: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lgpd-requests"] });
      queryClient.invalidateQueries({ queryKey: ["lgpd-pending-count"] });
    },
  });

  const pendingCount = requests.filter(
    (r) => r.status === "aberto" || r.status === "em_andamento"
  ).length;

  return {
    requests,
    isLoading,
    updateRequest,
    pendingCount,
  };
}

// Hook for user's own LGPD requests
export function useMyLGPDRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-lgpd-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("lgpd_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LGPDRequest[];
    },
    enabled: !!user,
  });

  const createRequest = useMutation({
    mutationFn: async ({
      tipo,
      motivo,
    }: {
      tipo: LGPDRequestTipo;
      motivo?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("lgpd_requests").insert({
        user_id: user.id,
        tipo,
        motivo,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lgpd-requests"] });
    },
  });

  return {
    requests,
    isLoading,
    createRequest,
  };
}

// Hook for pending count (ops dashboard)
export function useLGPDPendingCount() {
  const { data: count = 0 } = useQuery({
    queryKey: ["lgpd-pending-count"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lgpd_pending_count");
      if (error) throw error;
      return data as number;
    },
  });

  return count;
}

// Hook for generating user export (admin only)
export function useLGPDExport() {
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data, error } = await supabase.rpc("generate_lgpd_export", {
        _target_user_id: targetUserId,
      });

      if (error) throw error;
      return data;
    },
  });
}

// Hook for retention policies
export function useRetentionPolicies() {
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["retention-policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retention_policies")
        .select("*")
        .order("tabela");

      if (error) throw error;
      return data as RetentionPolicy[];
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({
      id,
      dias_reter,
      ativo,
    }: {
      id: string;
      dias_reter?: number;
      ativo?: boolean;
    }) => {
      const updates: Partial<RetentionPolicy> = {};
      if (dias_reter !== undefined) updates.dias_reter = dias_reter;
      if (ativo !== undefined) updates.ativo = ativo;

      const { error } = await supabase
        .from("retention_policies")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retention-policies"] });
    },
  });

  const applyRetention = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("apply_retention_policies");
      if (error) throw error;
      return data;
    },
  });

  return {
    policies,
    isLoading,
    updatePolicy,
    applyRetention,
  };
}

// Hook for audit logs (admin view)
export function useAuditLogs(options?: { entityType?: string; limit?: number }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", options?.entityType, options?.limit],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(options?.limit || 100);

      if (options?.entityType) {
        query = query.eq("entity_type", options.entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return { logs, isLoading };
}
