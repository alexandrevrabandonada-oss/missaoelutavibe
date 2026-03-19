/**
 * DailyPlanCard - 3-step daily plan card
 * 
 * Renders 3 action steps (30s, 5m, 15m) with quick-action buttons.
 * Each step links to existing flows (invite, CRM, missions, etc.)
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Check, 
  Share2, 
  UserPlus, 
  MessageCircle, 
  MapPin,
  FileText,
  Clock,
  Sparkles,
  Users,
  ThumbsUp,
  Calendar
} from "lucide-react";
import { useDailyPlan, StepKey, ActionKind } from "@/hooks/useDailyPlan";
import { useStreetMission } from "@/hooks/useStreetMission";
import { useConversationMission } from "@/hooks/useConversationMission";
import { getSupportScripts, useTrackSupportScript } from "@/hooks/useContactSupport";
import { useAppMode } from "@/hooks/useAppMode";
import { toast } from "sonner";

interface StepConfig {
  label: string;
  timeLabel: string;
  icon: React.ReactNode;
  getAction: (actionKind: ActionKind, actionRef: string) => () => void;
}

export function DailyPlanCard() {
  const navigate = useNavigate();
  const { mode } = useAppMode();
  const trackSupportScript = useTrackSupportScript();
  const { 
    steps, 
    isLoading, 
    isError, 
    completeStep, 
    trackStepStarted, 
    isCompleting,
    completedCount 
  } = useDailyPlan();
  
  const { generateMission: generateStreetMission, isGenerating: isGeneratingStreet } = useStreetMission();
  const { generateMission: generateConversaMission, isGenerating: isGeneratingConversa } = useConversationMission();
  
  const [actionInProgress, setActionInProgress] = useState<StepKey | null>(null);

  const scripts = getSupportScripts(mode);

  // Action handlers
  const handleInvite = async (stepKey: StepKey) => {
    trackStepStarted(stepKey, "invite");
    // Navigate to convite page
    navigate("/voluntario/convite");
    // Complete will be called when user returns
  };

  const handleCrmAdd = async (stepKey: StepKey) => {
    trackStepStarted(stepKey, "crm_add");
    // Navigate to CRM new contact
    navigate("/voluntario/crm/novo?from=plan");
  };

  const handleFollowup = async (stepKey: StepKey) => {
    trackStepStarted(stepKey, "followup");
    // Navigate to CRM with overdue filter
    navigate("/voluntario/crm?filter=overdue&from=plan");
  };

  const handleMissionConversa = async (stepKey: StepKey) => {
    setActionInProgress(stepKey);
    trackStepStarted(stepKey, "mission_conversa");
    
    try {
      const result = await generateConversaMission({ objective: "convidar", channel: "whatsapp", targetCount: 3 }) as any;
      if (result?.rate_limited) {
        // Rate limit handled by hook
        return;
      }
      if (result?.mission_id) {
        navigate(`/voluntario/missao-conversa/${result.mission_id}`);
      } else if (result?.already_exists) {
        toast.info(result.message || "Você já tem uma missão de conversa hoje");
      } else {
        toast.error("Não foi possível gerar a missão de conversa");
      }
    } catch (error) {
      console.error("[DailyPlanCard] Error generating conversa mission:", error);
      toast.error("Erro ao gerar missão de conversa");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMissionRua = async (stepKey: StepKey) => {
    setActionInProgress(stepKey);
    trackStepStarted(stepKey, "mission_rua");
    
    try {
      const result = await generateStreetMission({ acao: "panfletar", tempo_estimado: 10 }) as any;
      if (result?.rate_limited) {
        // Rate limit handled by hook
        return;
      }
      if (result?.mission_id) {
        navigate(`/voluntario/missao-rua/${result.mission_id}`);
      } else if (result?.already_exists) {
        toast.info(result.message || "Você já tem uma missão de rua hoje");
      } else {
        toast.error("Não foi possível gerar a missão de rua");
      }
    } catch (error) {
      console.error("[DailyPlanCard] Error generating street mission:", error);
      toast.error("Erro ao gerar missão de rua");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleScriptCopy = async (stepKey: StepKey) => {
    trackStepStarted(stepKey, "script_copy");
    // Navigate to roteiros
    navigate("/voluntario/aprender?tab=roteiros&from=plan");
  };

  const handleAskReferral = async (stepKey: StepKey) => {
    trackStepStarted(stepKey, "ask_referral");
    // Copy ask_referral script
    navigator.clipboard.writeText(scripts.ask_referral);
    trackSupportScript("ask_referral");
    toast.success("Texto copiado! Envie para seu contato confirmado.");
    // Complete the step immediately
    await completeStep(stepKey);
  };

  const handleQualifyContact = async (stepKey: StepKey) => {
    trackStepStarted(stepKey, "qualify_contact");
    // Navigate to CRM with unknown support filter
    navigate("/voluntario/crm?filter=unknown&from=plan");
  };

  const handleInviteEvent = async (stepKey: StepKey) => {
    trackStepStarted(stepKey, "invite_event");
    // Navigate to CRM with qualified filter to pick a contact to invite
    navigate("/voluntario/crm?filter=qualified&from=plan");
  };

  // Map action_kind to handler and icon
  const getStepConfig = (actionKind: ActionKind): { icon: React.ReactNode; label: string; handler: (stepKey: StepKey) => void } => {
    switch (actionKind) {
      case "invite":
        return { icon: <Share2 className="h-4 w-4" />, label: "Convidar alguém", handler: handleInvite };
      case "crm_add":
        return { icon: <UserPlus className="h-4 w-4" />, label: "Adicionar contato", handler: handleCrmAdd };
      case "followup":
        return { icon: <MessageCircle className="h-4 w-4" />, label: "Fazer follow-up", handler: handleFollowup };
      case "mission_conversa":
        return { icon: <MessageCircle className="h-4 w-4" />, label: "Missão de conversa", handler: handleMissionConversa };
      case "mission_rua":
        return { icon: <MapPin className="h-4 w-4" />, label: "Missão de rua", handler: handleMissionRua };
      case "script_copy":
        return { icon: <FileText className="h-4 w-4" />, label: "Copiar roteiro", handler: handleScriptCopy };
      case "ask_referral":
        return { icon: <Users className="h-4 w-4" />, label: "Pedir indicação (+1)", handler: handleAskReferral };
      case "qualify_contact":
        return { icon: <ThumbsUp className="h-4 w-4" />, label: "Qualificar 1 contato", handler: handleQualifyContact };
      case "invite_event":
        return { icon: <Calendar className="h-4 w-4" />, label: "Convidar p/ atividade", handler: handleInviteEvent };
      default:
        return { icon: <Sparkles className="h-4 w-4" />, label: "Ação rápida", handler: () => {} };
    }
  };

  const getTimeLabel = (stepKey: StepKey): string => {
    switch (stepKey) {
      case "step_30s": return "30s";
      case "step_5m": return "5 min";
      case "step_15m": return "15 min";
      default: return "";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Plano do Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state - silent fallback
  if (isError || !steps.length) {
    return null;
  }

  const isGenerating = isGeneratingStreet || isGeneratingConversa;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Plano do Dia
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {completedCount}/3 feitos
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => {
          const config = getStepConfig(step.action_kind as ActionKind);
          const isCompleted = !!step.completed_at;
          const isThisActionInProgress = actionInProgress === step.step_key;
          
          return (
            <div
              key={step.step_key}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                isCompleted 
                  ? "bg-green-500/10 border border-green-500/20" 
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              {/* Time badge */}
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                isCompleted ? "bg-green-500/20 text-green-600" : "bg-primary/10 text-primary"
              }`}>
                {getTimeLabel(step.step_key as StepKey)}
              </span>

              {/* Action button */}
              <Button
                variant={isCompleted ? "ghost" : "outline"}
                size="sm"
                className={`flex-1 justify-start gap-2 ${
                  isCompleted ? "text-green-600" : ""
                }`}
                disabled={isCompleted || isCompleting || isGenerating}
                onClick={() => config.handler(step.step_key as StepKey)}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isThisActionInProgress ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  config.icon
                )}
                <span className={isCompleted ? "line-through opacity-70" : ""}>
                  {config.label}
                </span>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
