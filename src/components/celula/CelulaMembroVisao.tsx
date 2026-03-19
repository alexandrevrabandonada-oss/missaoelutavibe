/**
 * CelulaMembroVisao - Tab "Visão" for cell member (F12)
 * 
 * Includes: onboarding block, next action, cycle info, personal stats.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MemberCycleInfo, MemberPersonalStats, MemberMission } from "@/hooks/useCelulaMembroData";
import { CelulaComecePorAqui } from "./CelulaComecePorAqui";
import { CelulaProximaAcao } from "./CelulaProximaAcao";

interface Props {
  cycle: MemberCycleInfo | null | undefined;
  isLoadingCycle: boolean;
  stats: MemberPersonalStats | undefined;
  isLoadingStats: boolean;
  missions: MemberMission[];
  isLoadingMissions: boolean;
  onGoToMural: () => void;
  onGoToMissoes: () => void;
}

export function CelulaMembroVisao({
  cycle, isLoadingCycle,
  stats, isLoadingStats,
  missions, isLoadingMissions,
  onGoToMural, onGoToMissoes,
}: Props) {
  const hasEvidences = (stats?.registrosEnviados ?? 0) > 0;
  const hasValidated = (stats?.registrosValidados ?? 0) > 0;
  const hasMissions = missions.length > 0;

  return (
    <div className="space-y-4">
      {/* F12.1b: Onboarding block — hides after first validated record */}
      <CelulaComecePorAqui
        hasEvidences={hasEvidences}
        hasValidated={hasValidated}
        onGoToMural={onGoToMural}
        onGoToMissoes={onGoToMissoes}
      />

      {/* F12: Next action card */}
      <CelulaProximaAcao
        missions={missions}
        isLoading={isLoadingMissions}
        onGoToMissoes={onGoToMissoes}
      />

      {/* Active cycle */}
      {isLoadingCycle ? (
        <Skeleton className="h-24 w-full" />
      ) : cycle ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{cycle.titulo}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {cycle.isCityFallback ? "Ciclo da cidade" : "Ativo"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(cycle.inicio), "dd MMM", { locale: ptBR })} — {format(new Date(cycle.fim), "dd MMM", { locale: ptBR })}
            </p>
            {cycle.metas_json && typeof cycle.metas_json === "object" && "registros" in (cycle.metas_json as any) && (
              (() => {
                const meta = (cycle.metas_json as any).registros as number;
                const feito = stats?.registrosEnviados ?? 0;
                const pct = meta > 0 ? Math.min(100, Math.round((feito / meta) * 100)) : 0;
                return (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Meta: {meta} registros</span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Nenhum ciclo ativo no momento</p>
          </CardContent>
        </Card>
      )}

      {/* Personal stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="card-luta">
          <CardContent className="p-3 text-center">
            <Target className="h-4 w-4 text-primary mx-auto mb-1" />
            {isLoadingStats ? (
              <Skeleton className="h-6 w-8 mx-auto" />
            ) : (
              <p className="text-lg font-bold text-foreground">{stats?.registrosEnviados ?? 0}</p>
            )}
            <p className="text-[10px] text-muted-foreground uppercase">Registros</p>
          </CardContent>
        </Card>
        <Card className="card-luta">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            {isLoadingStats ? (
              <Skeleton className="h-6 w-8 mx-auto" />
            ) : (
              <p className="text-lg font-bold text-foreground">{stats?.registrosValidados ?? 0}</p>
            )}
            <p className="text-[10px] text-muted-foreground uppercase">Validados</p>
          </CardContent>
        </Card>
        <Card className="card-luta">
          <CardContent className="p-3 text-center">
            <FileText className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            {isLoadingStats ? (
              <Skeleton className="h-6 w-8 mx-auto" />
            ) : (
              <p className="text-lg font-bold text-foreground">{stats?.missoesParticipadas ?? 0}</p>
            )}
            <p className="text-[10px] text-muted-foreground uppercase">Missões</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
