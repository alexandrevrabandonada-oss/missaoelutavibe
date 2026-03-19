import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CelulaStats {
  totalVoluntarios: number;
  voluntariosAtivos: number;
  missoesSemana: number;
  missoesValidadas: number;
  registrosPendentes: number;
  registrosPrecisaAjuste: number;
}

export function useCelulaStats(celulaId: string | undefined) {
  const statsQuery = useQuery({
    queryKey: ["celula-stats", celulaId],
    queryFn: async (): Promise<CelulaStats> => {
      if (!celulaId) throw new Error("celulaId required");

      // Parallel queries
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const since = sevenDaysAgo.toISOString();

      const [membersRes, activeMembersRes, missionsRes, validatedRes, pendingRes, ajusteRes] =
        await Promise.all([
          // Total members
          supabase
            .from("cell_memberships")
            .select("*", { count: "exact", head: true })
            .eq("cell_id", celulaId),
          // Active/approved members
          supabase
            .from("cell_memberships")
            .select("*", { count: "exact", head: true })
            .eq("cell_id", celulaId)
            .in("status", ["aprovado", "active", "approved"]),
          // Missions this week
          supabase
            .from("missions")
            .select("*", { count: "exact", head: true })
            .eq("cell_id", celulaId)
            .gte("created_at", since),
          // Validated evidences this week
          supabase
            .from("evidences")
            .select("*", { count: "exact", head: true })
            .eq("cell_id", celulaId)
            .eq("status", "validado")
            .gte("validated_at", since),
          // Pending evidences
          supabase
            .from("evidences")
            .select("*", { count: "exact", head: true })
            .eq("cell_id", celulaId)
            .eq("status", "enviado"),
          // Needs adjustment
          supabase
            .from("evidences")
            .select("*", { count: "exact", head: true })
            .eq("cell_id", celulaId)
            .eq("status", "precisa_ajuste"),
        ]);

      return {
        totalVoluntarios: membersRes.count ?? 0,
        voluntariosAtivos: activeMembersRes.count ?? 0,
        missoesSemana: missionsRes.count ?? 0,
        missoesValidadas: validatedRes.count ?? 0,
        registrosPendentes: pendingRes.count ?? 0,
        registrosPrecisaAjuste: ajusteRes.count ?? 0,
      };
    },
    enabled: !!celulaId,
    staleTime: 1000 * 60 * 2,
  });

  // Recent evidences for validation queue preview
  const queueQuery = useQuery({
    queryKey: ["celula-validation-queue", celulaId],
    queryFn: async () => {
      if (!celulaId) return [];
      const { data, error } = await supabase
        .from("evidences")
        .select("id, resumo, status, created_at, user_id, missions(title)")
        .eq("cell_id", celulaId)
        .in("status", ["enviado", "precisa_ajuste"])
        .order("created_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!celulaId,
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    queue: queueQuery.data ?? [],
    isQueueLoading: queueQuery.isLoading,
  };
}
