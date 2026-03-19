/**
 * usePilotStart - Hook to start a 7-day pilot cycle with canonical missions
 * 
 * Creates (or reuses) a cycle for the current week and links 7 canonical missions.
 * No new tables needed — uses ciclos_semanais + ciclo_missoes_ativas.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { CANONICAL_SLUGS } from "@/lib/missionRecommendation";
import { toast } from "sonner";

const ciclosTable = () => (supabase.from as any)("ciclos_semanais");
const cicloMissoesTable = () => (supabase.from as any)("ciclo_missoes_ativas");

export function usePilotStart() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");

      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 7);

      const startStr = now.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      const cidade = profile?.city || null;

      // 1. Check if there's already an active cycle for this scope
      let query = ciclosTable()
        .select("*")
        .eq("status", "ativo");
      
      if (cidade) {
        query = query.eq("cidade", cidade);
      } else {
        query = query.is("cidade", null);
      }

      const { data: existing } = await query
        .is("celula_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let cycleId: string;

      if (existing) {
        // Reuse existing active cycle
        cycleId = existing.id;
      } else {
        // Create new 7-day pilot cycle
        const { data: newCycle, error: createErr } = await ciclosTable()
          .insert({
            titulo: `Piloto 7 dias — ${startStr}`,
            inicio: startStr,
            fim: endStr,
            cidade,
            celula_id: null,
            status: "ativo",
            criado_por: user.id,
          })
          .select()
          .single();

        if (createErr) throw createErr;
        cycleId = newCycle.id;
      }

      // 2. Get canonical mission IDs
      const { data: canonicalMissions, error: mErr } = await supabase
        .from("missions")
        .select("id, slug")
        .in("slug", CANONICAL_SLUGS)
        .eq("status", "publicada");

      if (mErr) throw mErr;
      if (!canonicalMissions?.length) throw new Error("Nenhuma missão canônica encontrada");

      // 3. Check which are already linked
      const { data: existingLinks } = await cicloMissoesTable()
        .select("mission_id")
        .eq("ciclo_id", cycleId);

      const linkedIds = new Set((existingLinks || []).map((l: any) => l.mission_id));

      // 4. Insert missing links
      const toInsert = canonicalMissions
        .filter((m) => !linkedIds.has(m.id))
        .map((m, i) => ({
          ciclo_id: cycleId,
          mission_id: m.id,
          ordem: linkedIds.size + i,
          added_by: user.id,
        }));

      if (toInsert.length > 0) {
        const { error: insertErr } = await cicloMissoesTable().insert(toInsert);
        if (insertErr) throw insertErr;
      }

      return {
        cycleId,
        reused: !!existing,
        missionsLinked: toInsert.length,
        totalMissions: canonicalMissions.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["ciclos"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycle"] });
      queryClient.invalidateQueries({ queryKey: ["cycle-mission-links"] });
      queryClient.invalidateQueries({ queryKey: ["cycle-active-missions"] });

      const msg = result.reused
        ? `Piloto ativado! Ciclo existente reutilizado. ${result.missionsLinked} missão(ões) vinculada(s).`
        : `Piloto criado! ${result.totalMissions} missões canônicas vinculadas.`;
      toast.success(msg);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao iniciar piloto: ${err.message}`);
    },
  });

  return {
    startPilot: mutation.mutateAsync,
    isStarting: mutation.isPending,
  };
}
