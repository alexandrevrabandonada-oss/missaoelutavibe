/**
 * CelulaMembroMissoes - Tab "Missões" for cell member (F3.2)
 * 
 * Smart CTAs based on personal status per mission.
 * Links to existing flows — no new submission paths.
 */

import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JourneyStepIndicator } from "@/components/missions/JourneyStepIndicator";
import { getJourneyStatus } from "@/lib/journeyStatus";
import type { MemberMission } from "@/hooks/useCelulaMembroData";
import {
  ChevronRight,
  Rocket,
  Send,
  Target,
} from "lucide-react";

// ─── Status mapping (uses central journeyStatus) ─────────

interface MyStatusConfig {
  label: string;
  icon: React.ElementType;
  actionLabel: string;
  hrefOverride?: (missionId: string) => string;
  accentClass: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
  journeyStep: import("@/lib/journeyStatus").JourneyStep;
}

function getMyStatus(mission: MemberMission): MyStatusConfig {
  const hasEvidence = mission.myEvidenceCount > 0;
  const status = getJourneyStatus(mission.myLatestStatus, hasEvidence);

  const base = {
    label: status.label,
    icon: status.icon,
    accentClass: status.colorClass,
    journeyStep: status.journeyStep,
  };

  if (!hasEvidence) {
    return { ...base, actionLabel: "Agir agora", badgeVariant: "default" };
  }

  switch (mission.myLatestStatus) {
    case "validado":
      return { ...base, actionLabel: "Ver missão", badgeVariant: "secondary" };
    case "enviado":
      return { ...base, actionLabel: "Acompanhar", badgeVariant: "outline" };
    case "precisa_ajuste":
      return {
        ...base,
        actionLabel: "Corrigir",
        hrefOverride: () => "/voluntario/meus-registros",
        badgeVariant: "destructive",
      };
    case "rejeitado":
      return {
        ...base,
        actionLabel: "Ver detalhes",
        hrefOverride: () => "/voluntario/meus-registros",
        badgeVariant: "destructive",
      };
    default:
      return {
        ...base,
        label: `${mission.myEvidenceCount} registro(s)`,
        icon: Send,
        actionLabel: "Ver missão",
        accentClass: "text-muted-foreground",
        badgeVariant: "secondary",
      };
  }
}

// Mission is done (completed or validated) — CTA is passive
function isMissionDone(mission: MemberMission): boolean {
  return mission.status === "concluida" || mission.myLatestStatus === "validado";
}

// ─── Next Action Block ────────────────────────────────────

function getNextAction(missions: MemberMission[]): MemberMission | null {
  // Priority: precisa_ajuste > não iniciou (publicada/em_andamento) > em_análise
  const needsFix = missions.find(
    (m) => m.myLatestStatus === "precisa_ajuste" && m.status !== "concluida"
  );
  if (needsFix) return needsFix;

  const notStarted = missions.find(
    (m) => m.myEvidenceCount === 0 && m.status !== "concluida"
  );
  if (notStarted) return notStarted;

  const inAnalysis = missions.find(
    (m) => m.myLatestStatus === "enviado" && m.status !== "concluida"
  );
  if (inAnalysis) return inAnalysis;

  return null;
}

function NextActionCard({ mission }: { mission: MemberMission }) {
  const status = getMyStatus(mission);
  const href = status.hrefOverride
    ? status.hrefOverride(mission.id)
    : `/voluntario/missao/${mission.id}`;

  return (
    <Card className="border-primary/30 bg-primary/5 mb-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Sua próxima ação
          </span>
        </div>
        <p className="text-sm font-medium text-foreground mb-1 truncate">
          {mission.title}
        </p>
        <div className="flex items-center gap-2 mb-3">
          <status.icon className={`h-3.5 w-3.5 ${status.accentClass}`} />
          <span className={`text-xs ${status.accentClass}`}>{status.label}</span>
        </div>
        <Link to={href}>
          <Button size="sm" className="w-full gap-2">
            {status.actionLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Mission Row ──────────────────────────────────────────

function MissionRow({ mission }: { mission: MemberMission }) {
  const status = getMyStatus(mission);
  const done = isMissionDone(mission);
  const href = status.hrefOverride
    ? status.hrefOverride(mission.id)
    : `/voluntario/missao/${mission.id}`;

  return (
    <Link
      to={href}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        done
          ? "border-border/50 opacity-70 hover:opacity-100"
          : status.badgeVariant === "destructive"
          ? "border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10"
          : "border-border hover:bg-muted/50"
      }`}
    >
      <status.icon className={`h-4 w-4 shrink-0 ${status.accentClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{mission.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            {MISSION_STATUS_LABELS[mission.status || ""] || mission.status}
          </Badge>
          <span className={`text-xs flex items-center gap-1 ${status.accentClass}`}>
            <status.icon className="h-3 w-3" />
            {status.label}
          </span>
        </div>
        {mission.myEvidenceCount > 0 && (
          <JourneyStepIndicator currentStep={status.journeyStep} className="mt-1.5" />
        )}
      </div>
      <Button
        variant={done ? "ghost" : "ghost"}
        size="sm"
        className={`h-7 text-xs shrink-0 ${done ? "text-muted-foreground" : "text-primary font-medium"}`}
        tabIndex={-1}
      >
        {status.actionLabel} →
      </Button>
    </Link>
  );
}

// ─── Constants ────────────────────────────────────────────

const MISSION_STATUS_LABELS: Record<string, string> = {
  publicada: "Publicada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

// ─── Main Component ───────────────────────────────────────

interface Props {
  missions: MemberMission[];
  isLoading: boolean;
}

export function CelulaMembroMissoes({ missions, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-18 w-full" />
        ))}
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="py-12 text-center">
        <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Sem missões ativas no momento</p>
        <p className="text-xs text-muted-foreground mt-1">
          A coordenação publicará novas missões em breve
        </p>
      </div>
    );
  }

  const nextAction = getNextAction(missions);

  return (
    <div className="space-y-2">
      {nextAction && <NextActionCard mission={nextAction} />}

      {missions.map((mission) => (
        <MissionRow key={mission.id} mission={mission} />
      ))}
    </div>
  );
}
