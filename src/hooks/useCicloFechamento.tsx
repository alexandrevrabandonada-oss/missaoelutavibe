/**
 * useCicloFechamento - Active cycle data + closure stats + close mutation
 * F6.1/F6.2: Fetch active cycle for cell, compute stats, execute closure
 * F6.3: Optional mural publication via useMuralRecibos
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getSafeDisplayName } from "@/lib/safeIdentity";
import { useMuralRecibos } from "./useMuralRecibos";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CicloAtivo {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  status: string;
  fechado_em: string | null;
}

export interface CicloFechamentoStats {
  total_registros: number;
  membros_participantes: number;
  missoes_cumpridas: number;
  missao_ids: string[];
}

export function useCicloFechamento(cellId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { upsertReciboSemana } = useMuralRecibos();

  // Fetch active cycle for this cell
  const cicloQuery = useQuery({
    queryKey: ["ciclo-ativo-celula", cellId],
    queryFn: async (): Promise<CicloAtivo | null> => {
      if (!cellId) return null;

      const { data, error } = await supabase
        .from("ciclos_semanais")
        .select("id, titulo, inicio, fim, status, fechado_em")
        .eq("celula_id", cellId)
        .eq("status", "ativo")
        .order("fim", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!cellId,
  });

  // Pre-compute stats for the active cycle period
  const statsQuery = useQuery({
    queryKey: ["ciclo-fechamento-stats", cellId, cicloQuery.data?.id],
    queryFn: async (): Promise<CicloFechamentoStats> => {
      const ciclo = cicloQuery.data;
      if (!cellId || !ciclo) return { total_registros: 0, membros_participantes: 0, missoes_cumpridas: 0, missao_ids: [] };

      const { data: rows } = await supabase
        .from("evidences")
        .select("user_id, mission_id")
        .eq("cell_id", cellId)
        .eq("status", "validado")
        .gte("created_at", ciclo.inicio)
        .lte("created_at", ciclo.fim);

      const evidences = rows || [];
      const uniqueUsers = new Set(evidences.map((r) => r.user_id));
      const missionIds = [...new Set(evidences.map((r) => r.mission_id).filter(Boolean))] as string[];

      return {
        total_registros: evidences.length,
        membros_participantes: uniqueUsers.size,
        missoes_cumpridas: missionIds.length,
        missao_ids: missionIds,
      };
    },
    enabled: !!cellId && !!cicloQuery.data?.id,
  });

  // Close cycle mutation — calls secure RPC + optional mural post
  const fecharCiclo = useMutation({
    mutationFn: async (params: { resumo: string; publicarMural: boolean }) => {
      const ciclo = cicloQuery.data;
      if (!ciclo) throw new Error("Nenhum ciclo ativo encontrado");
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (!cellId) throw new Error("Célula não definida");

      // Get coordinator name for snapshot
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const stats = statsQuery.data!;
      const fechamento_json = {
        resumo: params.resumo,
        stats: {
          total_registros: stats.total_registros,
          membros_participantes: stats.membros_participantes,
          missoes_cumpridas: stats.missoes_cumpridas,
          missao_ids: stats.missao_ids,
        },
        fechado_por_nome: getSafeDisplayName(profile?.full_name),
      };

      // 1. Close cycle via secure RPC
      const { data, error } = await supabase.rpc("fechar_ciclo_celula", {
        _ciclo_id: ciclo.id,
        _fechamento_json: fechamento_json,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.error || "Erro ao encerrar ciclo");
      }

      // 2. Publish to mural if requested
      if (params.publicarMural) {
        const periodo = `${format(new Date(ciclo.inicio), "dd MMM", { locale: ptBR })} — ${format(new Date(ciclo.fim), "dd MMM yyyy", { locale: ptBR })}`;

        const feitos = [
          `📊 ${stats.total_registros} registros validados`,
          `👥 ${stats.membros_participantes} membros participaram`,
          `🎯 ${stats.missoes_cumpridas} missões cumpridas`,
          `📅 Período: ${periodo}`,
        ].join("\n");

        try {
          await upsertReciboSemana({
            cellId,
            cicloId: ciclo.id,
            titulo: ciclo.titulo,
            feitos,
            proximos_passos: params.resumo || undefined,
          });
        } catch (muralError) {
          // Don't fail the closure if mural post fails
          console.error("Mural post failed (cycle still closed):", muralError);
          toast.error("Ciclo encerrado, mas houve erro ao publicar no mural");
        }
      }
    },
    onSuccess: () => {
      toast.success("Ciclo encerrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["ciclo-ativo-celula", cellId] });
      queryClient.invalidateQueries({ queryKey: ["celula-memoria-ciclos", cellId] });
      queryClient.invalidateQueries({ queryKey: ["celula-stats", cellId] });
      queryClient.invalidateQueries({ queryKey: ["mural-posts"] });
    },
    onError: (error: Error) => {
      console.error("Error closing cycle:", error);
      toast.error(error.message || "Erro ao encerrar ciclo");
    },
  });

  const ciclo = cicloQuery.data;
  const isEligible = ciclo && ciclo.status === "ativo" && !ciclo.fechado_em && new Date() >= new Date(ciclo.fim);

  return {
    ciclo,
    isLoadingCiclo: cicloQuery.isLoading,
    stats: statsQuery.data ?? { total_registros: 0, membros_participantes: 0, missoes_cumpridas: 0, missao_ids: [] },
    isLoadingStats: statsQuery.isLoading,
    isEligible: !!isEligible,
    fecharCiclo: fecharCiclo.mutateAsync,
    isFechando: fecharCiclo.isPending,
  };
}
