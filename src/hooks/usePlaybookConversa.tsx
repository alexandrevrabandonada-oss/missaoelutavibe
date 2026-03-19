import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useLogGrowthEvent } from "./useGrowth";

// Types for playbook data
export interface PlaybookObjection {
  key: string;
  label: string;
  reply_text: string;
}

export interface PlaybookNextStep {
  key: string;
  label: string;
  action: "whatsapp" | "schedule_followup" | "invite_plus1" | "save_contact" | "open_today" | "open_mission";
}

export interface PlaybookRoteiro {
  id: string;
  titulo: string;
  objetivo: string;
  texto_base: string;
  objections: PlaybookObjection[];
  next_steps: PlaybookNextStep[];
}

// Default objections if roteiro doesn't have custom ones
const DEFAULT_OBJECTIONS: PlaybookObjection[] = [
  {
    key: "sem_tempo",
    label: "Não tenho tempo",
    reply_text: "Entendo! A gente faz ações rápidas, de 10 minutinhos. Dá pra encaixar no dia a dia, tipo enquanto toma um café. Quer tentar uma vez só pra ver?",
  },
  {
    key: "nao_confio",
    label: "Não confio",
    reply_text: "Faz todo sentido! Por isso a gente não pede pra confiar cegamente – pede pra acompanhar de perto. Se não gostar, cobra. É exatamente isso que a gente faz aqui.",
  },
  {
    key: "tudo_igual",
    label: "Tudo igual",
    reply_text: "Muita gente pensa assim, e não é à toa. Mas olha: quem mais quer que você pense assim é justamente quem se beneficia quando você desiste. E se a gente provasse o contrário juntos?",
  },
];

const DEFAULT_NEXT_STEPS: PlaybookNextStep[] = [
  { key: "agendar", label: "Agendar follow-up", action: "schedule_followup" },
  { key: "convidar", label: "Convidar +1", action: "invite_plus1" },
  { key: "salvar", label: "Salvar contato", action: "save_contact" },
];

// Hook to get playbook data for a specific roteiro
export function usePlaybookConversa(roteiroId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["playbook-conversa", roteiroId],
    queryFn: async () => {
      if (!roteiroId) return null;

      // Use type assertion since objections/next_steps are new columns not yet in types
      const { data, error } = await (supabase
        .from("roteiros_conversa")
        .select("id, titulo, objetivo, texto_base, objections, next_steps")
        .eq("id", roteiroId)
        .single() as any);

      if (error) {
        console.error("Error fetching playbook:", error);
        throw error;
      }

      // Parse objections and next_steps with defaults
      const objections = Array.isArray(data?.objections) 
        ? (data.objections as PlaybookObjection[]) 
        : [];
      const next_steps = Array.isArray(data?.next_steps) 
        ? (data.next_steps as PlaybookNextStep[]) 
        : [];

      return {
        id: data.id,
        titulo: data.titulo,
        objetivo: data.objetivo,
        texto_base: data.texto_base,
        objections: objections.length > 0 ? objections : DEFAULT_OBJECTIONS,
        next_steps: next_steps.length > 0 ? next_steps : DEFAULT_NEXT_STEPS,
      } as PlaybookRoteiro;
    },
    enabled: !!user?.id && !!roteiroId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for playbook tracking
export function usePlaybookTracking() {
  const { mutate: logEvent } = useLogGrowthEvent();

  const trackOpened = (source: "mission" | "crm", objectiveKey?: string) => {
    logEvent({
      eventType: "playbook_opened",
      meta: { source, objective_key: objectiveKey || "unknown" },
    });
  };

  const trackOpeningCopied = (objectiveKey: string) => {
    logEvent({
      eventType: "playbook_opening_copied",
      meta: { objective_key: objectiveKey },
    });
  };

  const trackObjectionClicked = (objectiveKey: string, objectionKey: string) => {
    logEvent({
      eventType: "playbook_objection_clicked",
      meta: { objective_key: objectiveKey, objection_key: objectionKey },
    });
  };

  const trackReplyCopied = (objectiveKey: string, objectionKey: string) => {
    logEvent({
      eventType: "playbook_reply_copied",
      meta: { objective_key: objectiveKey, objection_key: objectionKey },
    });
  };

  const trackNextStepClicked = (action: string) => {
    logEvent({
      eventType: "playbook_nextstep_clicked",
      meta: { action },
    });
  };

  return {
    trackOpened,
    trackOpeningCopied,
    trackObjectionClicked,
    trackReplyCopied,
    trackNextStepClicked,
  };
}

// Export defaults for use in other components
export { DEFAULT_OBJECTIONS, DEFAULT_NEXT_STEPS };
