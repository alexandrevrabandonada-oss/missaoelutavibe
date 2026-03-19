/**
 * useCoordAudit - Hook for coord_audit_log (no PII)
 * 
 * Provides read access to audit logs for coordination operations.
 * Only accessible to Admin Master, COORD_GLOBAL, or COORD_CITY (scoped).
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type CoordAuditAction = 
  | "GRANT_ROLE"
  | "REVOKE_ROLE"
  | "UPSERT_CELL"
  | "APPROVE_ASSIGNMENT"
  | "CANCEL_ASSIGNMENT";

export interface CoordAuditEntry {
  id: string;
  created_at: string;
  actor_profile_id: string;
  action: CoordAuditAction;
  scope_type: "GLOBAL" | "CITY" | "CELL";
  city_id: string | null;
  cell_id: string | null;
  target_profile_id: string | null;
  meta_json: Record<string, unknown>;
}

export const AUDIT_ACTION_LABELS: Record<CoordAuditAction, string> = {
  GRANT_ROLE: "Papel concedido",
  REVOKE_ROLE: "Papel revogado",
  UPSERT_CELL: "Célula criada/editada",
  APPROVE_ASSIGNMENT: "Alocação aprovada",
  CANCEL_ASSIGNMENT: "Alocação cancelada",
};

export const AUDIT_ACTION_ICONS: Record<CoordAuditAction, string> = {
  GRANT_ROLE: "🎖️",
  REVOKE_ROLE: "❌",
  UPSERT_CELL: "🏠",
  APPROVE_ASSIGNMENT: "✅",
  CANCEL_ASSIGNMENT: "🚫",
};

export function useCoordAudit(days: number = 14, cityId?: string | null) {
  const { user } = useAuth();

  const auditQuery = useQuery({
    queryKey: ["coord-audit-log", days, cityId],
    queryFn: async () => {
      // Use type assertion since RPC is newly added and types not yet regenerated
      const { data, error } = await (supabase.rpc as any)("list_coord_audit_log", {
        p_days: days,
        p_city_id: cityId || null,
      });

      if (error) throw error;
      return (data as CoordAuditEntry[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 60000, // Cache for 1 minute
    retry: 1,
  });

  // Generate user code from profile_id (V#XXXXXX format)
  const generateUserCode = (profileId: string) => {
    return `V#${profileId.substring(0, 6).toUpperCase()}`;
  };

  return {
    entries: auditQuery.data || [],
    isLoading: auditQuery.isLoading,
    isError: auditQuery.isError,
    error: auditQuery.error,
    refetch: auditQuery.refetch,
    generateUserCode,
  };
}
