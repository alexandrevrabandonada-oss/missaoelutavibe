/**
 * CelulaProximaAcao - Next action card for cell member (F12.1b)
 * 
 * Uses shared getMemberPriority for consistency.
 * Additional states: "start" (no missions) and "done" (all concluded) beyond the shared hierarchy.
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight, Clock, Rocket, Target, CheckCircle2 } from "lucide-react";
import { getMemberPriority } from "@/lib/getMemberPriority";
import type { MemberMission } from "@/hooks/useCelulaMembroData";

interface Props {
  missions: MemberMission[];
  isLoading: boolean;
  onGoToMissoes: () => void;
}

type ActionType = "fix" | "action" | "review" | "start" | "done";

interface ActionState {
  type: ActionType;
  title: string;
  description: string;
  cta: string;
  icon: React.ElementType;
  iconColor: string;
}

function getActionState(missions: MemberMission[]): ActionState {
  // No missions at all — special state not in shared hierarchy
  if (missions.length === 0) {
    return {
      type: "start",
      title: "Nenhuma missão disponível ainda",
      description: "A coordenação vai publicar missões em breve. Fique de olho!",
      cta: "",
      icon: Rocket,
      iconColor: "text-muted-foreground",
    };
  }

  const priority = getMemberPriority(missions);
  const triggerTitle = priority.triggerMission?.title ?? "";

  switch (priority.type) {
    case "fix":
      return {
        type: "fix",
        title: "Registro precisa de ajuste",
        description: `"${triggerTitle}" — a coordenação pediu uma correção`,
        cta: "Corrigir registro",
        icon: AlertTriangle,
        iconColor: "text-orange-500",
      };
    case "review":
      return {
        type: "review",
        title: "Registro em análise",
        description: `"${triggerTitle}" — aguardando validação da coordenação`,
        cta: "Acompanhar registros",
        icon: Clock,
        iconColor: "text-muted-foreground",
      };
    case "action":
      return {
        type: "action",
        title: `${priority.actionableCount} missão(ões) aguardando sua ação`,
        description: `Próxima: "${triggerTitle}"`,
        cta: "Ir para missões",
        icon: Target,
        iconColor: "text-primary",
      };
    case "clear":
    default:
      return {
        type: "done",
        title: "Tudo em dia!",
        description: "Você já agiu em todas as missões disponíveis. Continue assim.",
        cta: "",
        icon: CheckCircle2,
        iconColor: "text-primary",
      };
  }
}

export function CelulaProximaAcao({ missions, isLoading, onGoToMissoes }: Props) {
  const navigate = useNavigate();

  if (isLoading) return null;

  const state = getActionState(missions);

  const handleCta = () => {
    if (state.type === "fix" || state.type === "review") {
      navigate("/voluntario/meus-registros");
    } else if (state.type === "action") {
      onGoToMissoes();
    }
  };

  return (
    <Card className={`${state.type === "fix" ? "border-orange-500/30 bg-orange-500/5" : "border-primary/20 bg-primary/5"}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
            state.type === "fix" ? "bg-orange-500/15" : "bg-primary/15"
          }`}>
            <state.icon className={`h-4 w-4 ${state.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{state.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{state.description}</p>
          </div>
        </div>
        {state.cta && (
          <Button
            variant={state.type === "fix" ? "default" : "secondary"}
            size="sm"
            className="w-full mt-3 gap-1.5"
            onClick={handleCta}
          >
            {state.cta}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
