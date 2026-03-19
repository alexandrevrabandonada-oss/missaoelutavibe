import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { toast } from "sonner";
import { useState, useCallback } from "react";

// Helper to log check-in errors without PII
async function logCheckinError(rpc: string, message: string) {
  try {
    // Sanitize message to remove any potential PII
    const sanitizedMessage = message
      .replace(/[a-f0-9-]{36}/gi, "[UUID]") // Remove UUIDs
      .replace(/\S+@\S+\.\S+/g, "[EMAIL]") // Remove emails
      .substring(0, 200); // Limit length

    await supabase.rpc("log_growth_event", {
      _event_type: "checkin_error",
      _meta: {
        rpc,
        message: sanitizedMessage,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Silently fail - don't break the page for logging errors
    console.warn("Failed to log checkin error");
  }
}
export interface DailyCheckin {
  id: string;
  user_id: string;
  day: string;
  escopo_tipo: string;
  escopo_id: string;
  disponibilidade: number;
  foco_tipo: "task" | "mission" | "crm" | "agenda" | "none";
  foco_id: string | null;
  trava_texto: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailySuggestions {
  task: {
    id: string;
    titulo: string;
    prioridade: string;
    prazo_em: string | null;
    status: string;
    squad_id: string;
    squad_nome: string;
  } | null;
  crm: {
    id: string;
    nome: string;
    telefone: string | null;
    proxima_acao_em: string;
    status: string;
  } | null;
  agenda: {
    id: string;
    titulo: string;
    inicio_em: string;
    local_texto: string | null;
    tipo: string;
  } | null;
  mission: {
    id: string;
    title: string;
    type: string;
    deadline: string | null;
    status: string;
  } | null;
  generated_at: string;
}

export interface CheckinMetrics {
  checkins_hoje: number;
  com_foco_task: number;
  com_foco_crm: number;
  com_foco_mission: number;
  com_foco_agenda: number;
  travas_hoje: number;
  date: string;
}

export interface CheckinWithProfile extends DailyCheckin {
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
  };
}

// Labels
export const DISPONIBILIDADE_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2+ horas" },
];

export const FOCO_TIPO_LABELS: Record<string, string> = {
  task: "Tarefa",
  mission: "Missão",
  crm: "Contato CRM",
  agenda: "Atividade",
  none: "Nenhum",
};

// Hook for volunteer check-in
export function useDailyCheckin() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];

  // Get today's check-in
  const { data: todayCheckin, isLoading } = useQuery({
    queryKey: ["daily-checkin", user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user.id)
        .eq("day", today)
        .maybeSingle();

      if (error) throw error;
      return data as DailyCheckin | null;
    },
    enabled: !!user?.id,
  });

  // State for suggestions error handling
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // Get suggestions with error handling for resilience
  const { 
    data: suggestions, 
    isLoading: loadingSuggestions,
    refetch: refetchSuggestions,
    isRefetching: isRetryingSuggestions,
  } = useQuery({
    queryKey: ["daily-suggestions", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      try {
        const { data, error } = await (supabase.rpc as any)("get_daily_suggestions", {
          _user_id: user.id,
        });

        if (error) {
          // Log error to growth_events without PII
          await logCheckinError("get_daily_suggestions", error.message);
          throw error;
        }
        
        // Clear any previous error on success
        setSuggestionsError(null);
        return data as DailySuggestions;
      } catch (err: any) {
        const errorMessage = err?.message || "Erro desconhecido";
        setSuggestionsError(errorMessage);
        
        // Log error to growth_events without PII
        await logCheckinError("get_daily_suggestions", errorMessage);
        
        // Return null instead of throwing to prevent page crash
        return null;
      }
    },
    enabled: !!user?.id,
    retry: 1, // Only retry once to avoid spamming logs
    retryDelay: 1000,
  });

  // Retry suggestions manually
  const retrySuggestions = useCallback(() => {
    setSuggestionsError(null);
    refetchSuggestions();
  }, [refetchSuggestions]);

  // Create check-in
  const createCheckin = useMutation({
    mutationFn: async (input: {
      disponibilidade: number;
      foco_tipo: "task" | "mission" | "crm" | "agenda" | "none";
      foco_id?: string | null;
      trava_texto?: string | null;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Determine scope: prefer city
      const escopoTipo = profile?.city ? "cidade" : "celula";
      const escopoId = profile?.city || "global";

      const { data, error } = await supabase
        .from("daily_checkins")
        .insert({
          user_id: user.id,
          day: today,
          escopo_tipo: escopoTipo,
          escopo_id: escopoId,
          disponibilidade: input.disponibilidade,
          foco_tipo: input.foco_tipo,
          foco_id: input.foco_id || null,
          trava_texto: input.trava_texto || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-checkin"] });
      toast.success("Check-in realizado!");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Você já fez check-in hoje");
      } else {
        toast.error("Erro ao fazer check-in");
      }
    },
  });

  // Update check-in
  const updateCheckin = useMutation({
    mutationFn: async (input: {
      disponibilidade?: number;
      foco_tipo?: "task" | "mission" | "crm" | "agenda" | "none";
      foco_id?: string | null;
      trava_texto?: string | null;
    }) => {
      if (!todayCheckin?.id) throw new Error("Check-in não encontrado");

      const { data, error } = await supabase
        .from("daily_checkins")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", todayCheckin.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-checkin"] });
      toast.success("Check-in atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar check-in");
    },
  });

  return {
    todayCheckin,
    suggestions,
    isLoading,
    loadingSuggestions,
    createCheckin,
    updateCheckin,
    hasCheckedInToday: !!todayCheckin,
    // Error handling for resilience
    suggestionsError,
    retrySuggestions,
    isRetryingSuggestions,
  };
}

// Hook for admin/coordinator view
export function useCheckinMetrics(
  scopeType?: "all" | "cidade" | "celula",
  scopeCidade?: string | null,
  scopeCelulaId?: string | null
) {
  const { user } = useAuth();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["checkin-metrics", scopeType, scopeCidade, scopeCelulaId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_checkin_metrics", {
        _scope_type: scopeType || "all",
        _scope_cidade: scopeCidade,
        _scope_celula_id: scopeCelulaId,
      });

      if (error) throw error;
      return data as CheckinMetrics;
    },
    enabled: !!user?.id,
  });

  return { metrics, isLoading };
}

// Hook for listing today's check-ins (admin view)
export function useTodayCheckins(
  scopeType?: "all" | "cidade" | "celula",
  scopeCidade?: string | null,
  scopeCelulaId?: string | null
) {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const { data: checkins, isLoading } = useQuery({
    queryKey: ["today-checkins", today, scopeType, scopeCidade, scopeCelulaId],
    queryFn: async () => {
      let query = supabase
        .from("daily_checkins")
        .select("*")
        .eq("day", today)
        .order("created_at", { ascending: false });

      if (scopeType === "cidade" && scopeCidade) {
        query = query.eq("escopo_tipo", "cidade").eq("escopo_id", scopeCidade);
      } else if (scopeType === "celula" && scopeCelulaId) {
        query = query.eq("escopo_tipo", "celula").eq("escopo_id", scopeCelulaId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = data?.map((c) => c.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return (data || []).map((checkin) => ({
        ...checkin,
        profiles: profileMap.get(checkin.user_id),
      })) as CheckinWithProfile[];
    },
    enabled: !!user?.id,
  });

  return { checkins, isLoading };
}

// Hook for travas (blockers) - admin view
export function useTodayTravas(
  scopeType?: "all" | "cidade" | "celula",
  scopeCidade?: string | null,
  scopeCelulaId?: string | null
) {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  const { data: travas, isLoading } = useQuery({
    queryKey: ["today-travas", today, scopeType, scopeCidade, scopeCelulaId],
    queryFn: async () => {
      let query = supabase
        .from("daily_checkins")
        .select("*")
        .eq("day", today)
        .not("trava_texto", "is", null)
        .neq("trava_texto", "")
        .order("created_at", { ascending: false });

      if (scopeType === "cidade" && scopeCidade) {
        query = query.eq("escopo_tipo", "cidade").eq("escopo_id", scopeCidade);
      } else if (scopeType === "celula" && scopeCelulaId) {
        query = query.eq("escopo_tipo", "celula").eq("escopo_id", scopeCelulaId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = data?.map((c) => c.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return (data || []).map((checkin) => ({
        ...checkin,
        profiles: profileMap.get(checkin.user_id),
      })) as CheckinWithProfile[];
    },
    enabled: !!user?.id,
  });

  return { travas, isLoading };
}
