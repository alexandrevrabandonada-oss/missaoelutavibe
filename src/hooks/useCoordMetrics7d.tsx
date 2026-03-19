import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MetricSource {
  key: string;
  label: string;
  table: string;
  value: number;
  ok: boolean;
  error?: string;
}

export interface CoordMetrics7d {
  sources: MetricSource[];
  failedSources: MetricSource[];
  isFullyLoaded: boolean;
}

const SEVEN_DAYS_AGO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
};

async function countSafe(
  table: string,
  filters: Record<string, any>,
  dateCol: string,
): Promise<{ count: number; ok: boolean; error?: string }> {
  try {
    let query = supabase.from(table as any).select("*", { count: "exact", head: true });

    for (const [key, val] of Object.entries(filters)) {
      query = query.eq(key, val);
    }

    query = query.gte(dateCol, SEVEN_DAYS_AGO());

    const { count, error } = await query;
    if (error) return { count: 0, ok: false, error: error.message };
    return { count: count ?? 0, ok: true };
  } catch (err: any) {
    return { count: 0, ok: false, error: err?.message || "unknown" };
  }
}

export function useCoordMetrics7d(scopeCidade?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["coord-metrics-7d", user?.id, scopeCidade],
    queryFn: async (): Promise<CoordMetrics7d> => {
      const results: MetricSource[] = [];

      // 1. Novos cadastros (profiles)
      const newSignups = await countSafe("profiles", {}, "created_at");
      results.push({
        key: "new_signups",
        label: "Novos cadastros",
        table: "profiles",
        value: newSignups.count,
        ok: newSignups.ok,
        error: newSignups.error,
      });

      // 2. Aprovados (profiles com volunteer_status = ativo)
      const approved = await countSafe("profiles", { volunteer_status: "ativo" }, "updated_at");
      results.push({
        key: "approved",
        label: "Aprovados",
        table: "profiles",
        value: approved.count,
        ok: approved.ok,
        error: approved.error,
      });

      // 3. Check-ins (atividade_rsvp com checkin_em not null nos últimos 7d)
      const checkins = await (async () => {
        try {
          const { count, error } = await supabase
            .from("atividade_rsvp")
            .select("*", { count: "exact", head: true })
            .not("checkin_em", "is", null)
            .gte("checkin_em", SEVEN_DAYS_AGO());
          if (error) return { count: 0, ok: false, error: error.message };
          return { count: count ?? 0, ok: true };
        } catch (err: any) {
          return { count: 0, ok: false, error: err?.message };
        }
      })();
      results.push({
        key: "checkins",
        label: "Check-ins",
        table: "atividade_rsvp",
        value: checkins.count,
        ok: checkins.ok,
        error: checkins.error,
      });

      // 4. Missões aceitas (mission_progress)
      const missionsAccepted = await countSafe("mission_progress", {}, "created_at");
      results.push({
        key: "missions_accepted",
        label: "Missões aceitas",
        table: "mission_progress",
        value: missionsAccepted.count,
        ok: missionsAccepted.ok,
        error: missionsAccepted.error,
      });

      // 5. Evidências enviadas
      const evidencesSent = await countSafe("evidences", {}, "created_at");
      results.push({
        key: "evidences_sent",
        label: "Evidências enviadas",
        table: "evidences",
        value: evidencesSent.count,
        ok: evidencesSent.ok,
        error: evidencesSent.error,
      });

      // 6. Evidências validadas — status enum migrado para 'validado'
      const evidencesValidated = await countSafe("evidences", { status: "validado" }, "created_at");
      results.push({
        key: "evidences_validated",
        label: "Evidências validadas",
        table: "evidences",
        value: evidencesValidated.count,
        ok: evidencesValidated.ok,
        error: evidencesValidated.error,
      });

      // 7. Contatos CRM
      const crmContacts = await countSafe("crm_contatos", {}, "created_at");
      results.push({
        key: "crm_contacts",
        label: "Contatos cadastrados (CRM)",
        table: "crm_contatos",
        value: crmContacts.count,
        ok: crmContacts.ok,
        error: crmContacts.error,
      });

      const failedSources = results.filter((r) => !r.ok);

      return {
        sources: results,
        failedSources,
        isFullyLoaded: failedSources.length === 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
