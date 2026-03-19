import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type SignalType = "aprovar" | "usei" | "compartilhei" | "puxo";
export type TargetType = "mission" | "mural_post";

export const SIGNAL_ICONS: Record<SignalType, { emoji: string; label: string }> = {
  aprovar: { emoji: "✅", label: "Aprovar para replicar" },
  usei: { emoji: "♻️", label: "Eu usei" },
  compartilhei: { emoji: "📣", label: "Eu compartilhei" },
  puxo: { emoji: "🤝", label: "Eu puxo" },
};

export interface SignalCounts {
  aprovar?: number;
  usei?: number;
  compartilhei?: number;
  puxo?: number;
}

export interface SignalState {
  counts: SignalCounts;
  userSignals: SignalType[];
}

export interface TopItem {
  target_type: string;
  target_id: string;
  score_sum: number;
  unique_users: number;
  title: string | null;
  under_attack?: boolean;
}

export interface TopOfWeek {
  usei: TopItem[];
  compartilhei: TopItem[];
  puxo: TopItem[];
  coordPicks: Array<{
    target_type: string;
    target_id: string;
    note: string | null;
    title: string | null;
    picked_by: string | null;
  }>;
}

export interface SignalsMetrics {
  weekStart: string;
  total: number;
  byType: SignalCounts;
}

// Hook for individual target signals
export function useSignals(targetType: TargetType, targetId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["signals", targetType, targetId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_signal_counts", {
        _target_type: targetType,
        _target_id: targetId,
      });

      if (error) {
        console.error("Error fetching signals:", error);
        throw error;
      }

      return data as SignalState;
    },
    enabled: !!targetId,
    staleTime: 30000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (signalType: SignalType) => {
      const { data, error } = await (supabase.rpc as any)("toggle_utility_signal", {
        _target_type: targetType,
        _target_id: targetId,
        _signal_type: signalType,
      });

      if (error) {
        if (error.message.includes("Limite semanal")) {
          toast.error("Limite semanal atingido (120 sinais/semana)");
        } else if (error.message.includes("Muitos sinais")) {
          toast.error("Muitos sinais recentes. Aguarde alguns minutos.");
        } else if (error.message.includes("🤝") || error.message.includes("puxo")) {
          toast.error("Complete ao menos 1 missão ou aguarde 7 dias para usar 🤝");
        } else if (error.message.includes("impedido")) {
          toast.error("Você está temporariamente impedido de interagir");
        } else {
          toast.error("Erro ao registrar sinal");
        }
        throw error;
      }

      return data as SignalState & { action: "added" | "removed" };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["signals", targetType, targetId], {
        counts: data.counts,
        userSignals: data.userSignals,
      });
    },
  });

  const toggle = useCallback(
    (signalType: SignalType) => {
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }
      toggleMutation.mutate(signalType);
    },
    [user, toggleMutation]
  );

  return {
    counts: (data?.counts || {}) as SignalCounts,
    userSignals: (data?.userSignals || []) as SignalType[],
    isLoading,
    toggle,
    isToggling: toggleMutation.isPending,
  };
}

// Hook for Top of Week data
export function useTopOfWeek(weekStart: string, scopeTipo: string, scopeId: string) {
  return useQuery({
    queryKey: ["top-of-week", weekStart, scopeTipo, scopeId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_top_of_week", {
        _week_start: weekStart,
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
      });

      if (error) {
        console.error("Error fetching top of week:", error);
        throw error;
      }

      return data as TopOfWeek;
    },
    enabled: !!weekStart && !!scopeTipo && !!scopeId,
    staleTime: 60000,
  });
}

// Hook for signals metrics (Ops)
export function useSignalsMetrics(scopeTipo: string, scopeId: string) {
  return useQuery({
    queryKey: ["signals-metrics", scopeTipo, scopeId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_signals_metrics", {
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
      });

      if (error) {
        console.error("Error fetching signals metrics:", error);
        throw error;
      }

      return data as SignalsMetrics;
    },
    enabled: !!scopeTipo && !!scopeId,
    staleTime: 30000,
  });
}

// Hook for recomputing rollups (admin)
export function useRecomputeRollups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      weekStart,
      scopeTipo,
      scopeId,
    }: {
      weekStart: string;
      scopeTipo: string;
      scopeId: string;
    }) => {
      const { data, error } = await (supabase.rpc as any)("recompute_weekly_rollups", {
        _week_start: weekStart,
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count, variables) => {
      toast.success(`Rollups recalculados: ${count} registros`);
      queryClient.invalidateQueries({
        queryKey: ["top-of-week", variables.weekStart, variables.scopeTipo, variables.scopeId],
      });
    },
    onError: () => {
      toast.error("Erro ao recalcular rollups");
    },
  });
}

// Hook for coord picks (admin)
export function useCoordPicks() {
  const queryClient = useQueryClient();

  const createPick = useMutation({
    mutationFn: async ({
      weekStart,
      scopeTipo,
      scopeId,
      targetType,
      targetId,
      note,
    }: {
      weekStart: string;
      scopeTipo: string;
      scopeId: string;
      targetType: string;
      targetId: string;
      note?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("coord_picks").upsert({
        week_start: weekStart,
        scope_tipo: scopeTipo,
        scope_id: scopeId,
        target_type: targetType,
        target_id: targetId,
        note,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escolha da coordenação salva!");
      queryClient.invalidateQueries({ queryKey: ["top-of-week"] });
    },
    onError: () => {
      toast.error("Erro ao salvar escolha");
    },
  });

  const removePick = useMutation({
    mutationFn: async ({
      weekStart,
      scopeTipo,
      scopeId,
      targetType,
      targetId,
    }: {
      weekStart: string;
      scopeTipo: string;
      scopeId: string;
      targetType: string;
      targetId: string;
    }) => {
      const { error } = await supabase
        .from("coord_picks")
        .delete()
        .eq("week_start", weekStart)
        .eq("scope_tipo", scopeTipo)
        .eq("scope_id", scopeId)
        .eq("target_type", targetType)
        .eq("target_id", targetId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Escolha removida");
      queryClient.invalidateQueries({ queryKey: ["top-of-week"] });
    },
  });

  return { createPick, removePick };
}

// Hook for mural reports
export function useMuralReport() {
  return useMutation({
    mutationFn: async ({ postId, motivo, categoria }: { postId: string; motivo: string; categoria?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("mural_reports").insert({
        post_id: postId,
        reporter_id: user.id,
        motivo,
        categoria: categoria || "outro",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obrigado! Sua denúncia foi registrada.");
    },
    onError: () => {
      toast.error("Erro ao enviar denúncia");
    },
  });
}
