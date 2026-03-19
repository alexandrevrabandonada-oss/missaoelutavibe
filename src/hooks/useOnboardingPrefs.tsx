import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import { useLogGrowthEvent } from "./useGrowth";
import { toast } from "sonner";

// Types for onboarding preferences
export interface OnboardingPrefs {
  interesses: string[];
  habilidades: string[];
  tempo: "10" | "20" | "40";
  conforto?: "baixo" | "medio" | "alto";
}

// Options for the preferences form
export const INTERESSE_OPTIONS = [
  { value: "conversar", label: "Conversar", desc: "Dialogar com apoiadores e interessados" },
  { value: "rua", label: "Rua", desc: "Panfletagem, mutirões, ações presenciais" },
  { value: "conteudo", label: "Conteúdo", desc: "Criar e compartilhar posts e materiais" },
  { value: "formacao", label: "Formação", desc: "Estudar e aprender sobre o movimento" },
  { value: "organizacao", label: "Organização", desc: "Ajudar na logística e estrutura" },
];

export const HABILIDADE_OPTIONS = [
  { value: "design", label: "Design", desc: "Artes visuais e criação gráfica" },
  { value: "video", label: "Vídeo", desc: "Filmagem e edição" },
  { value: "texto", label: "Texto", desc: "Redação e copywriting" },
  { value: "dev", label: "Desenvolvimento", desc: "Programação e sistemas" },
  { value: "articulacao", label: "Articulação", desc: "Networking e conexões" },
  { value: "logistica", label: "Logística", desc: "Transporte e organização" },
];

export const TEMPO_OPTIONS = [
  { value: "10", label: "10 min/dia", desc: "Contribuição rápida" },
  { value: "20", label: "20 min/dia", desc: "Contribuição moderada" },
  { value: "40", label: "40+ min/dia", desc: "Contribuição intensa" },
];

export const CONFORTO_OPTIONS = [
  { value: "baixo", label: "Baixo", desc: "Prefiro ações online" },
  { value: "medio", label: "Médio", desc: "Posso fazer algumas ações presenciais" },
  { value: "alto", label: "Alto", desc: "Topo qualquer ação presencial" },
];

// Recommendation engine (client-side)
export interface RecommendedPath {
  primary_action: {
    kind: "conversa" | "rua" | "fabrica" | "formacao";
    tempo: string;
    label: string;
    description: string;
  };
  secondary_actions: Array<{
    kind: string;
    label: string;
    route: string;
  }>;
}

export function getRecommendedPath(prefs: OnboardingPrefs): RecommendedPath {
  const { interesses, habilidades, tempo, conforto } = prefs;
  
  // Determine primary action
  let primaryKind: "conversa" | "rua" | "fabrica" | "formacao" = "conversa";
  let primaryLabel = "Missão de Conversa";
  let primaryDesc = "Faça uma conversa de ~10 min com um contato do CRM";
  
  // Priority 1: "conversar" interest → Conversation mission
  if (interesses.includes("conversar")) {
    primaryKind = "conversa";
    primaryLabel = "Missão de Conversa";
    primaryDesc = `Converse com um apoiador (~${tempo} min)`;
  }
  // Priority 2: "rua" interest + comfort not low → Street mission
  else if (interesses.includes("rua") && conforto !== "baixo") {
    primaryKind = "rua";
    primaryLabel = "Missão de Rua";
    primaryDesc = `Faça uma micro-ação presencial (~${tempo} min)`;
  }
  // Priority 3: Content skills → Fábrica
  else if (
    habilidades.some(h => ["design", "video", "texto"].includes(h)) ||
    interesses.includes("conteudo")
  ) {
    primaryKind = "fabrica";
    primaryLabel = "Fábrica de Base";
    primaryDesc = `Crie e compartilhe conteúdo (~${tempo} min)`;
  }
  // Priority 4: Formation interest
  else if (interesses.includes("formacao")) {
    primaryKind = "formacao";
    primaryLabel = "Formação";
    primaryDesc = `Estude um módulo do curso (~${tempo} min)`;
  }
  
  // Build secondary actions list
  const secondary: RecommendedPath["secondary_actions"] = [];
  
  // Add Fábrica if has content skills and not primary
  if (
    primaryKind !== "fabrica" && 
    (habilidades.some(h => ["design", "video", "texto"].includes(h)) || interesses.includes("conteudo"))
  ) {
    secondary.push({
      kind: "fabrica",
      label: "Fábrica de Base",
      route: "/voluntario/materiais",
    });
  }
  
  // Add follow-ups if interested in conversations
  if (interesses.includes("conversar") && primaryKind !== "conversa") {
    secondary.push({
      kind: "followups",
      label: "Follow-ups do dia",
      route: "/voluntario/hoje",
    });
  }
  
  // Add formation if interested
  if (interesses.includes("formacao") && primaryKind !== "formacao") {
    secondary.push({
      kind: "formacao",
      label: "Formação",
      route: "/formacao",
    });
  }
  
  // Add plenária for organization interest
  if (interesses.includes("organizacao")) {
    secondary.push({
      kind: "plenaria",
      label: "Plenárias",
      route: "/voluntario/plenaria",
    });
  }
  
  // Limit to 3 secondary actions
  return {
    primary_action: {
      kind: primaryKind,
      tempo,
      label: primaryLabel,
      description: primaryDesc,
    },
    secondary_actions: secondary.slice(0, 3),
  };
}

export function useOnboardingPrefs() {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const queryClient = useQueryClient();
  const logEvent = useLogGrowthEvent();

  // Get current prefs from profile - safely parse JSONB
  const rawPrefs = profile?.onboarding_prefs as Record<string, unknown> | null;
  const prefs: OnboardingPrefs | null = rawPrefs && 
    Array.isArray(rawPrefs.interesses) && 
    rawPrefs.tempo ? {
      interesses: rawPrefs.interesses as string[],
      habilidades: (rawPrefs.habilidades as string[]) || [],
      tempo: rawPrefs.tempo as "10" | "20" | "40",
      conforto: rawPrefs.conforto as "baixo" | "medio" | "alto" | undefined,
    } : null;

  // Check if prefs exist
  const hasPrefs = prefs && prefs.interesses?.length > 0 && prefs.tempo;

  // Get recommended path if prefs exist
  const recommendedPath = hasPrefs ? getRecommendedPath(prefs) : null;

  // Save preferences mutation
  const savePrefs = useMutation({
    mutationFn: async (newPrefs: OnboardingPrefs) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update({ onboarding_prefs: newPrefs as any })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      
      // Log growth event (without PII)
      logEvent.mutate({
        eventType: "onboarding_prefs_saved",
        meta: {
          interesses_count: variables.interesses.length,
          habilidades_count: variables.habilidades.length,
          tempo: variables.tempo,
          has_conforto: !!variables.conforto,
        },
      });
      
      toast.success("Preferências salvas!");
    },
    onError: (error) => {
      console.error("Error saving prefs:", error);
      toast.error("Erro ao salvar preferências");
    },
  });

  return {
    prefs,
    hasPrefs,
    recommendedPath,
    savePrefs: savePrefs.mutate,
    isSaving: savePrefs.isPending,
    profile,
  };
}
