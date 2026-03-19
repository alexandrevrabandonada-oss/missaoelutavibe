import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useDueFollowups } from "./useFollowups";
import { useOnboardingPrefs } from "./useOnboardingPrefs";
import { useLogGrowthEvent } from "./useGrowth";
import { isRateLimited, handleRateLimitError } from "./useRateLimits";
import { toast } from "sonner";

export type FirstActionKind = "rua" | "conversa" | "crm" | "followup";

export interface SuggestedFirstAction {
  kind: FirstActionKind;
  label: string;
  description: string;
  estimatedMinutes: number;
}

export function useFirstAction() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { hasFollowups, followups } = useDueFollowups(1);
  const { recommendedPath, hasPrefs } = useOnboardingPrefs();
  const logGrowthEvent = useLogGrowthEvent();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check if user needs first action
  const needsFirstAction = !profileLoading && profile && !profile.first_action_at;

  // Check if we have a valid suggestion (not just fallback)
  const hasSuggestion = hasFollowups || (hasPrefs && recommendedPath);

  // Get suggested first action based on priority - returns null if no suggestion
  const getSuggestedFirstAction = (): SuggestedFirstAction | null => {
    // Priority 1: Follow-up if there are due items
    if (hasFollowups && followups.length > 0) {
      return {
        kind: "followup",
        label: "Fazer follow-up",
        description: `${followups[0]?.nome_curto || "Contato"} está aguardando`,
        estimatedMinutes: 5,
      };
    }

    // Priority 2: Use recommended path from onboarding prefs
    if (hasPrefs && recommendedPath) {
      const primaryKind = recommendedPath.primary_action.kind;
      
      if (primaryKind === "conversa") {
        return {
          kind: "conversa",
          label: "Iniciar conversa",
          description: "Envie uma mensagem para um apoiador",
          estimatedMinutes: 10,
        };
      }
      
      if (primaryKind === "rua") {
        return {
          kind: "rua",
          label: "Missão de rua",
          description: "Panfletagem ou rodinha no bairro",
          estimatedMinutes: 10,
        };
      }
    }

    // No valid suggestion - return null to trigger fallback UI
    return null;
  };

  // Start first action - generate mission and navigate
  const startMutation = useMutation({
    mutationFn: async (kind: FirstActionKind) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Log started event
      await logGrowthEvent.mutateAsync({
        eventType: "first_action",
        meta: { stage: "started", kind },
      });

      if (kind === "rua") {
        const { data, error } = await (supabase.rpc as any)("generate_street_mission", {
          _acao: "panfletar",
          _tempo_estimado: 10,
        });
        if (error) throw error;
        
        // Check for rate limit
        if (isRateLimited(data)) {
          handleRateLimitError(data, "gerar missão de rua");
          return { kind, missionId: null, rate_limited: true };
        }
        
        return { kind, missionId: data?.mission_id };
      }

      if (kind === "conversa") {
        const { data, error } = await (supabase.rpc as any)("generate_conversation_mission", {
          _objective: "convidar",
          _channel: "whatsapp",
          _target_count: 3,
        });
        if (error) throw error;
        
        // Check for rate limit
        if (isRateLimited(data)) {
          handleRateLimitError(data, "gerar missão de conversa");
          return { kind, missionId: null, rate_limited: true };
        }
        
        return { kind, missionId: data?.mission_id };
      }

      // For followup and crm, just navigate
      return { kind, missionId: null };
    },
    onSuccess: (result) => {
      if ((result as any).rate_limited) return;
      
      if (result.kind === "rua" && result.missionId) {
        navigate(`/voluntario/missao-rua/${result.missionId}`);
      } else if (result.kind === "conversa" && result.missionId) {
        navigate(`/voluntario/missao-conversa/${result.missionId}`);
      } else if (result.kind === "followup") {
        navigate("/voluntario/crm");
      } else if (result.kind === "crm") {
        // Stay where they are for CRM quick add
      }
    },
    onError: async (error: Error, kind) => {
      console.error("First action start error:", error);
      await logGrowthEvent.mutateAsync({
        eventType: "first_action",
        meta: { stage: "failed", kind, error: error.message },
      });
      toast.error("Erro ao iniciar ação");
    },
  });

  // Complete first action - update profile
  const completeMutation = useMutation({
    mutationFn: async (kind: FirstActionKind) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update({
          first_action_at: new Date().toISOString(),
          first_action_kind: kind,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Log completion
      await logGrowthEvent.mutateAsync({
        eventType: "first_action",
        meta: { stage: "completed", kind },
      });

      return kind;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("🎉 Primeira ação concluída! Você está no movimento.");
    },
    onError: (error: Error) => {
      console.error("Complete first action error:", error);
      // Don't show error - this is non-critical tracking
    },
  });

  // Log offer shown
  const logOfferShown = async () => {
    const suggested = getSuggestedFirstAction();
    await logGrowthEvent.mutateAsync({
      eventType: "first_action",
      meta: { stage: "offer_shown", kind: suggested?.kind ?? "fallback" },
    });
  };

  return {
    needsFirstAction: needsFirstAction ?? false,
    isLoading: profileLoading,
    hasSuggestion,
    getSuggestedFirstAction,
    startFirstAction: (kind: FirstActionKind) => startMutation.mutate(kind),
    isStarting: startMutation.isPending,
    completeFirstAction: (kind: FirstActionKind) => completeMutation.mutate(kind),
    isCompleting: completeMutation.isPending,
    logOfferShown,
  };
}
