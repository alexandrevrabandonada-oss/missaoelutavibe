/**
 * useCoordValidationPulse - Compact observability signals for cell coordination
 * F13-B: Response time, stalled adjustments, activity pulse
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ValidationPulse {
  /** Oldest pending evidence age in hours */
  oldestPendingHours: number | null;
  /** Human-readable oldest pending age */
  oldestPendingLabel: string | null;
  /** Count of pending evidences */
  pendingCount: number;
  /** Average validation time in hours (last 7d) */
  avgValidationHours: number | null;
  /** Human-readable avg validation time */
  avgValidationLabel: string | null;
  /** Stalled adjustments (precisa_ajuste > 5 days without resubmission) */
  stalledAdjustments: number;
  /** Oldest stalled adjustment age in hours */
  oldestStalledHours: number | null;
  /** Evidences submitted in last 3 days */
  recentSubmissions: number;
  /** Whether cycle is active for this cell */
  hasCycleActive: boolean;
  /** Whether the cell looks "cold" (active cycle but 0 submissions in 3d) */
  isCold: boolean;
}

function hoursToLabel(hours: number): string {
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (days === 1 && remainingHours === 0) return "1 dia";
  if (days === 1) return `1d ${remainingHours}h`;
  return `${days}d`;
}

export function useCoordValidationPulse(cellId: string | undefined) {
  return useQuery({
    queryKey: ["coord-validation-pulse", cellId],
    queryFn: async (): Promise<ValidationPulse> => {
      if (!cellId) throw new Error("cellId required");

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

      const [oldestPendingRes, validatedRecentRes, stalledRes, recentSubmissionsRes, activeCycleRes] =
        await Promise.all([
          // 1. Oldest pending evidence
          supabase
            .from("evidences")
            .select("created_at")
            .eq("cell_id", cellId)
            .eq("status", "enviado")
            .order("created_at", { ascending: true })
            .limit(1),

          // 2. Recent validated evidences (for avg time calc)
          supabase
            .from("evidences")
            .select("created_at, validated_at")
            .eq("cell_id", cellId)
            .eq("status", "validado")
            .not("validated_at", "is", null)
            .gte("validated_at", sevenDaysAgo)
            .limit(50),

          // 3. Stalled adjustments (precisa_ajuste > 5 days)
          supabase
            .from("evidences")
            .select("updated_at", { count: "exact" })
            .eq("cell_id", cellId)
            .eq("status", "precisa_ajuste")
            .lt("updated_at", fiveDaysAgo),

          // 4. Submissions in last 3 days
          supabase
            .from("evidences")
            .select("*", { count: "exact", head: true })
            .eq("cell_id", cellId)
            .gte("created_at", threeDaysAgo),

          // 5. Active cycle
          supabase
            .from("ciclos_semanais")
            .select("id", { count: "exact", head: true })
            .eq("celula_id", cellId)
            .eq("status", "ativo"),
        ]);

      // Oldest pending
      let oldestPendingHours: number | null = null;
      let pendingCount = 0;
      if (oldestPendingRes.data?.length) {
        const oldest = new Date(oldestPendingRes.data[0].created_at);
        oldestPendingHours = (now.getTime() - oldest.getTime()) / (1000 * 60 * 60);
        // Get exact count from a separate head query result or estimate
        // We'll use the stalledRes pattern — but for simplicity, query pending count
      }

      // Get pending count separately (we already have oldest)
      const { count: pCount } = await supabase
        .from("evidences")
        .select("*", { count: "exact", head: true })
        .eq("cell_id", cellId)
        .eq("status", "enviado");
      pendingCount = pCount ?? 0;

      // Avg validation time
      let avgValidationHours: number | null = null;
      const validated = validatedRecentRes.data ?? [];
      if (validated.length > 0) {
        const totalMs = validated.reduce((sum, e) => {
          const created = new Date(e.created_at).getTime();
          const validatedAt = new Date(e.validated_at!).getTime();
          return sum + (validatedAt - created);
        }, 0);
        avgValidationHours = totalMs / validated.length / (1000 * 60 * 60);
      }

      // Stalled
      const stalledAdjustments = stalledRes.count ?? 0;
      let oldestStalledHours: number | null = null;
      if (stalledRes.data?.length) {
        const dates = stalledRes.data.map((r) => new Date(r.updated_at).getTime());
        const oldest = Math.min(...dates);
        oldestStalledHours = (now.getTime() - oldest) / (1000 * 60 * 60);
      }

      // Activity
      const recentSubmissions = recentSubmissionsRes.count ?? 0;
      const hasCycleActive = (activeCycleRes.count ?? 0) > 0;
      const isCold = hasCycleActive && recentSubmissions === 0;

      return {
        oldestPendingHours,
        oldestPendingLabel: oldestPendingHours !== null ? hoursToLabel(oldestPendingHours) : null,
        pendingCount,
        avgValidationHours,
        avgValidationLabel: avgValidationHours !== null ? hoursToLabel(avgValidationHours) : null,
        stalledAdjustments,
        oldestStalledHours,
        recentSubmissions,
        hasCycleActive,
        isCold,
      };
    },
    enabled: !!cellId,
    staleTime: 1000 * 60 * 3,
  });
}
