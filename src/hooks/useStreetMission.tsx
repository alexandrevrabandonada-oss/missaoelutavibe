import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { isRateLimited, handleRateLimitError } from "./useRateLimits";
export type StreetAction = "panfletar" | "rodinha" | "visitar" | "comercio";

export interface StreetMissionMeta {
  kind: "street_micro";
  acao: StreetAction;
  tempo_estimado: number;
  bairro: string | null;
  cidade: string | null;
  cta_qr: boolean;
  generated_at: string;
  completed_at?: string;
  completion_checkboxes?: Record<string, boolean>;
  has_photo?: boolean;
}

export interface StreetMissionCheckboxes {
  [key: string]: boolean | undefined;
  conversas_iniciadas?: boolean;
  qr_mostrado?: boolean;
  panfletos_entregues?: boolean;
  materiais_distribuidos?: boolean;
}

export const STREET_ACTION_LABELS: Record<StreetAction, string> = {
  panfletar: "Panfletagem",
  rodinha: "Rodinha de Conversa",
  visitar: "Visita Domiciliar",
  comercio: "Visita ao Comércio",
};

export const STREET_TIME_OPTIONS = [
  { value: 10, label: "10 min" },
  { value: 20, label: "20 min" },
  { value: 40, label: "40 min" },
];

export const COMPLETION_CHECKBOX_OPTIONS = [
  { key: "conversas_iniciadas", label: "Iniciei conversas com pessoas" },
  { key: "qr_mostrado", label: "Mostrei meu QR Code de convite" },
  { key: "panfletos_entregues", label: "Entreguei materiais/panfletos" },
];

/**
 * Hook to manage street micro-missions
 */
export function useStreetMission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user already has a street mission today
  const todaysMissionQuery = useQuery({
    queryKey: ["street-mission-today", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("assigned_to", user.id)
        .eq("type", "rua")
        .gte("created_at", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Filter for street_micro kind
      if (data && (data.meta_json as any)?.kind === "street_micro") {
        return data;
      }

      return null;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Generate new street mission
  const generateMutation = useMutation({
    mutationFn: async ({
      acao = "panfletar" as StreetAction,
      tempo_estimado = 10,
      bairro,
    }: {
      acao?: StreetAction;
      tempo_estimado?: number;
      bairro?: string;
    }) => {
      const { data, error } = await supabase.rpc("generate_street_mission", {
        _acao: acao,
        _tempo_estimado: tempo_estimado,
        _bairro: bairro || null,
      });

      if (error) throw error;

      // Check for rate limit
      if (isRateLimited(data)) {
        handleRateLimitError(data, "gerar missão de rua");
        return { success: false, rate_limited: true };
      }

      const result = data as {
        ok?: boolean;
        success?: boolean;
        mission_id?: string;
        already_exists?: boolean;
        message?: string;
        error?: string;
      };

      if (result.ok === false || (!result.success && !result.ok)) {
        throw new Error(result.error || "Erro ao gerar missão");
      }

      return { ...result, success: true };
    },
    onSuccess: (data) => {
      if ((data as any).rate_limited) return;
      
      queryClient.invalidateQueries({ queryKey: ["street-mission-today"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });

      if ((data as any).already_exists) {
        toast.info((data as any).message || "Você já tem uma missão de rua hoje");
      } else {
        toast.success("Missão de rua gerada!");
      }
    },
    onError: (error) => {
      console.error("Error generating street mission:", error);
      toast.error("Erro ao gerar missão de rua");
    },
  });

  // Complete street mission
  const completeMutation = useMutation({
    mutationFn: async ({
      missionId,
      checkboxes,
      photoUrl,
    }: {
      missionId: string;
      checkboxes: StreetMissionCheckboxes;
      photoUrl?: string;
    }) => {
      const { data, error } = await supabase.rpc("complete_street_mission", {
        _mission_id: missionId,
        _checkboxes: checkboxes,
        _photo_url: photoUrl || null,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        mission_id?: string;
        error?: string;
      };

      if (!result.success) {
        throw new Error(result.error || "Erro ao concluir missão");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["street-mission-today"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      toast.success("Missão concluída! 🎉");
    },
    onError: (error) => {
      console.error("Error completing street mission:", error);
      toast.error("Erro ao concluir missão");
    },
  });

  return {
    todaysMission: todaysMissionQuery.data,
    isLoading: todaysMissionQuery.isLoading,
    hasGeneratedToday: !!todaysMissionQuery.data,
    missionInProgress:
      todaysMissionQuery.data?.status === "em_andamento" ||
      todaysMissionQuery.data?.status === "publicada",
    missionCompleted: todaysMissionQuery.data?.status === "concluida",

    generateMission: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,

    completeMission: completeMutation.mutateAsync,
    isCompleting: completeMutation.isPending,
  };
}

/**
 * Hook to get street mission metrics for Ops dashboard
 */
export function useStreetMissionMetrics(periodDays = 7, scopeCidade?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["street-mission-metrics", periodDays, scopeCidade],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_street_mission_metrics", {
        _period_days: periodDays,
        _scope_cidade: scopeCidade || null,
      });

      if (error) throw error;

      return data as {
        periodo_dias: number;
        total_geradas: number;
        total_concluidas: number;
        em_andamento: number;
        taxa_conclusao: number;
        por_acao: Array<{ acao: string; total: number; concluidas: number }>;
        top_bairros: Array<{ bairro: string; total: number }>;
        top_cidades: Array<{ cidade: string; total: number }>;
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
