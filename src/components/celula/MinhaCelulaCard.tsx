/**
 * MinhaCelulaCard - Compact cell CONTEXT card for "Hoje" dashboard (F13-A.1)
 * 
 * Role: cell identity + cycle progress + compact status signal + entry point.
 * Priority detail lives in HojePendencias — this card only shows a one-line hint.
 */

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  MapPin,
  Target,
} from "lucide-react";

const STATUS_HINT: Record<MemberPriorityType, { icon: React.ElementType; label: string; className: string }> = {
  fix: { icon: AlertTriangle, label: "Ajuste", className: "text-orange-500" },
  review: { icon: Clock, label: "Em análise", className: "text-muted-foreground" },
  action: { icon: Target, label: "Missões", className: "text-primary" },
  clear: { icon: CheckCircle2, label: "Em dia", className: "text-primary" },
};

export function MinhaCelulaCard() {
  const { userCells, isLoading: loadingCells, hasCell } = useUserCells();
  const firstCell = userCells[0];
  const cellId = firstCell?.id;

  const {
    membership,
    isLoadingMembership,
    cycle,
    personalStats,
    missions,
    isLoadingMissions,
  } = useCelulaMembroData(cellId);

  // Don't render if no cell
  if (!loadingCells && !hasCell) return null;
  if (loadingCells || isLoadingMembership) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (!membership || membership.status !== "aprovado") return null;

  const priority = !isLoadingMissions ? getMemberPriority(missions) : null;
  const hint = priority ? STATUS_HINT[priority.type] : null;

  // Cycle progress
  let progressPct: number | null = null;
  if (cycle?.metas_json && typeof cycle.metas_json === "object" && "registros" in (cycle.metas_json as any)) {
    const meta = (cycle.metas_json as any).registros as number;
    const feito = personalStats?.registrosEnviados ?? 0;
    progressPct = meta > 0 ? Math.min(100, Math.round((feito / meta) * 100)) : 0;
  }

  return (
    <Link to={`/voluntario/celula/${cellId}`} className="block">
      <Card className="card-luta border-primary/20 hover:border-primary/40 transition-colors">
        <CardContent className="p-4">
          {/* Row 1: Cell name + territory */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground truncate">
                  {membership.cellName}
                </span>
              </div>
              {membership.neighborhood && (
                <p className="text-[11px] text-muted-foreground ml-6 truncate">
                  {membership.neighborhood} — {membership.city}/{membership.state}
                </p>
              )}
            </div>
            {cycle && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {cycle.isCityFallback ? "Ciclo cidade" : cycle.titulo}
              </Badge>
            )}
          </div>

          {/* Row 2: Progress */}
          {progressPct !== null && (
            <div className="mb-2 ml-6">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                <span>{personalStats?.registrosEnviados ?? 0} registros</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Row 3: Compact status hint + entry CTA */}
          <div className="flex items-center justify-between mt-1">
            {hint && (
              <div className="flex items-center gap-1.5">
                <hint.icon className={`h-3.5 w-3.5 shrink-0 ${hint.className}`} />
                <span className={`text-xs ${hint.className}`}>{hint.label}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1 shrink-0 ml-auto" tabIndex={-1}>
              Entrar <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
