/**
 * HojePendencias - Consolidated member status card for /voluntario/hoje
 * 
 * Uses shared getMemberPriority for the unified hierarchy.
 * Single source of truth for "what needs my attention" on the Hoje hub.
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserCells } from "@/hooks/useUserCells";
import { useCelulaMembroData } from "@/hooks/useCelulaMembroData";
import { getMemberPriority, type MemberPriorityType } from "@/lib/getMemberPriority";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Target,
} from "lucide-react";

const CONFIG: Record<MemberPriorityType, {
  icon: React.ElementType;
  iconClass: string;
  cardClass: string;
  bgClass: string;
  buttonVariant: "default" | "secondary";
}> = {
  fix: {
    icon: AlertTriangle,
    iconClass: "text-orange-500",
    cardClass: "border-orange-500/30 bg-orange-500/5",
    bgClass: "bg-orange-500/15",
    buttonVariant: "default",
  },
  review: {
    icon: Clock,
    iconClass: "text-muted-foreground",
    cardClass: "border-border bg-muted/30",
    bgClass: "bg-primary/15",
    buttonVariant: "secondary",
  },
  action: {
    icon: Target,
    iconClass: "text-primary",
    cardClass: "border-primary/20 bg-primary/5",
    bgClass: "bg-primary/15",
    buttonVariant: "secondary",
  },
  clear: {
    icon: CheckCircle2,
    iconClass: "text-primary",
    cardClass: "border-primary/10 bg-primary/5",
    bgClass: "bg-primary/15",
    buttonVariant: "secondary",
  },
};

function getCopy(type: MemberPriorityType, triggerTitle: string | null, actionableCount: number) {
  switch (type) {
    case "fix":
      return {
        title: "Registro precisa de ajuste",
        description: `"${triggerTitle}" — a coordenação pediu uma correção`,
        cta: "Corrigir registro",
      };
    case "review":
      return {
        title: "Registro em análise",
        description: `"${triggerTitle}" — aguardando validação`,
        cta: "Acompanhar",
      };
    case "action":
      return {
        title: `${actionableCount} missão(ões) aguardando sua ação`,
        description: `Próxima: "${triggerTitle}"`,
        cta: "Ver missões",
      };
    case "clear":
      return {
        title: "Tudo em dia",
        description: "Você está com tudo certo. Continue assim!",
        cta: "",
      };
  }
}

function getDestination(type: MemberPriorityType, cellId: string | undefined) {
  if (type === "fix" || type === "review") return "/voluntario/meus-registros";
  if (type === "action") return cellId ? `/voluntario/celula/${cellId}?tab=missoes` : "/voluntario/missoes";
  return "";
}

export function HojePendencias() {
  const navigate = useNavigate();
  const { userCells, isLoading: loadingCells, hasCell } = useUserCells();
  const firstCell = userCells[0];
  const cellId = firstCell?.id;

  const {
    membership,
    isLoadingMembership,
    missions,
    isLoadingMissions,
  } = useCelulaMembroData(cellId);

  if (!loadingCells && !hasCell) return null;
  if (loadingCells || isLoadingMembership) return <Skeleton className="h-20 w-full rounded-lg" />;
  if (!membership || membership.status !== "aprovado") return null;
  if (isLoadingMissions) return <Skeleton className="h-20 w-full rounded-lg" />;

  const priority = getMemberPriority(missions);
  const cfg = CONFIG[priority.type];
  const copy = getCopy(priority.type, priority.triggerMission?.title ?? null, priority.actionableCount);
  const destination = getDestination(priority.type, cellId);
  const Icon = cfg.icon;

  return (
    <Card className={cfg.cardClass}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${cfg.bgClass}`}>
            <Icon className={`h-4 w-4 ${cfg.iconClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{copy.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{copy.description}</p>
          </div>
        </div>
        {copy.cta && destination && (
          <Button
            variant={cfg.buttonVariant}
            size="sm"
            className="w-full mt-3 gap-1.5"
            onClick={() => navigate(destination)}
          >
            {copy.cta}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
