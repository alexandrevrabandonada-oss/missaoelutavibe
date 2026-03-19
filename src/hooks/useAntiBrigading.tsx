import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AntiBrigadingMetrics {
  active_bursts: number;
  signals_week: number;
  blocks_by_limit: number;
  week_start: string;
}

export interface SignalBurst {
  id: string;
  week_start: string;
  target_type: string;
  target_id: string;
  signal_type: string;
  signals_count: number;
  unique_users: number;
  detected_at: string;
  status: string;
  note: string | null;
  title: string | null;
}

export function useAntiBrigadingMetrics(scopeTipo: string, scopeId: string) {
  return useQuery({
    queryKey: ["anti-brigading-metrics", scopeTipo, scopeId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_anti_brigading_metrics", {
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
      });

      if (error) {
        console.error("Error fetching anti-brigading metrics:", error);
        throw error;
      }

      return data as AntiBrigadingMetrics;
    },
    enabled: !!scopeTipo && !!scopeId,
    staleTime: 30000,
  });
}

export function useSignalBursts(scopeTipo: string, scopeId: string, status: string = "ativo") {
  return useQuery({
    queryKey: ["signal-bursts", scopeTipo, scopeId, status],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_signal_bursts", {
        _scope_tipo: scopeTipo,
        _scope_id: scopeId,
        _status: status,
      });

      if (error) {
        console.error("Error fetching signal bursts:", error);
        throw error;
      }

      return (data || []) as SignalBurst[];
    },
    enabled: !!scopeTipo && !!scopeId,
    staleTime: 30000,
  });
}

export function useResolveBurst() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      burstId,
      action,
      note,
    }: {
      burstId: string;
      action: "resolvido" | "ignorado";
      note?: string;
    }) => {
      const { error } = await (supabase.rpc as any)("resolve_signal_burst", {
        _burst_id: burstId,
        _action: action,
        _note: note || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rajada atualizada");
      queryClient.invalidateQueries({ queryKey: ["signal-bursts"] });
      queryClient.invalidateQueries({ queryKey: ["anti-brigading-metrics"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar rajada");
    },
  });
}

export const SIGNAL_TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
  aprovar: { emoji: "✅", label: "Aprovar" },
  usei: { emoji: "♻️", label: "Eu usei" },
  compartilhei: { emoji: "📣", label: "Compartilhei" },
  puxo: { emoji: "🤝", label: "Eu puxo" },
};
