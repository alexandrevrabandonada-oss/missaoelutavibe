import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Rate limit error response type
export interface RateLimitError {
  ok: false;
  error: "rate_limited";
  retry_after: number;
  current_count: number;
  limit: number;
}

// Check if a response is a rate limit error
export function isRateLimited(response: any): response is RateLimitError {
  return response && response.ok === false && response.error === "rate_limited";
}

// Format retry_after seconds to human-readable string
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundos`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minuto${minutes > 1 ? "s" : ""}`;
}

// Handle rate limit error with toast
export function handleRateLimitError(response: RateLimitError, actionName?: string) {
  const retryText = formatRetryAfter(response.retry_after);
  const action = actionName || "esta ação";
  
  toast.error(`Limite atingido para ${action}. Tente novamente em ${retryText}.`, {
    duration: 5000,
    id: `rate-limit-${response.error}`,
  });
}

// Rate limit metrics types
export interface RateLimitMetrics {
  period_days: number;
  by_action: Array<{
    action_key: string;
    blocked_count: number;
    unique_users: number;
  }>;
  by_city: Array<{
    cidade: string;
    blocked_count: number;
  }>;
  total_7d: number;
  total_30d: number;
}

// Action key labels for display
export const ACTION_KEY_LABELS: Record<string, string> = {
  generate_street_mission: "Missão de Rua",
  generate_conversation_mission: "Missão de Conversa",
  crm_quick_add: "Cadastrar Contato",
  followup_done: "Concluir Follow-up",
  followup_snooze: "Adiar Follow-up",
  publish_mural: "Publicar no Mural",
  share_download: "Baixar Compartilhamento",
  print_download: "Baixar Kit Impressão",
};

// Hook to fetch rate limit metrics (admin only)
export function useRateLimitMetrics(periodDays: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["rate-limit-metrics", periodDays],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_rate_limit_metrics", {
        _period_days: periodDays,
      });

      if (error) throw error;
      
      if (data?.error === "unauthorized") {
        throw new Error("Não autorizado");
      }

      return data as RateLimitMetrics;
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 min cache
    refetchInterval: 120000, // Refresh every 2 min
  });
}

// Utility to wrap RPC calls with rate limit handling
export async function withRateLimitHandling<T>(
  rpcCall: () => Promise<T>,
  actionName?: string
): Promise<T | null> {
  try {
    const result = await rpcCall();
    
    // Check if the result is a rate limit error
    if (isRateLimited(result)) {
      handleRateLimitError(result, actionName);
      return null;
    }
    
    return result;
  } catch (error) {
    throw error;
  }
}
