/**
 * CoordPulseCard - Compact observability card for cell coordination hub
 * F13-B: Shows response time, stalled adjustments, cold cycle signals
 * F14: Items are clickable — navigate to correct tab+filter
 */

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoordValidationPulse } from "@/hooks/useCoordValidationPulse";
import {
  Clock,
  Zap,
  AlertTriangle,
  Snowflake,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

interface Props {
  cellId: string;
  onNavigate?: (action: string) => void;
}

interface PulseItem {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: "default" | "warning" | "danger" | "success" | "cold";
  /** Action string: "registros:enviado", "registros:precisa_ajuste", "tab:missoes" */
  action?: string;
}

const ACCENT_CLASSES: Record<string, string> = {
  default: "text-muted-foreground",
  warning: "text-amber-500",
  danger: "text-destructive",
  success: "text-emerald-500",
  cold: "text-sky-400",
};

export function CoordPulseCard({ cellId, onNavigate }: Props) {
  const { data: pulse, isLoading } = useCoordValidationPulse(cellId);

  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-lg" />;
  }

  if (!pulse) return null;

  const items: PulseItem[] = [];

  // 1. Oldest pending
  if (pulse.pendingCount > 0 && pulse.oldestPendingLabel) {
    const isUrgent = (pulse.oldestPendingHours ?? 0) > 48;
    items.push({
      icon: Clock,
      label: `${pulse.pendingCount} pendente${pulse.pendingCount > 1 ? "s" : ""}`,
      value: `mais antigo: ${pulse.oldestPendingLabel}`,
      accent: isUrgent ? "danger" : "warning",
      action: "registros:enviado",
    });
  }

  // 2. Avg validation time
  if (pulse.avgValidationLabel) {
    const isSlow = (pulse.avgValidationHours ?? 0) > 48;
    items.push({
      icon: Zap,
      label: "Tempo médio de validação",
      value: pulse.avgValidationLabel,
      accent: isSlow ? "warning" : "success",
    });
  }

  // 3. Stalled adjustments
  if (pulse.stalledAdjustments > 0) {
    items.push({
      icon: AlertTriangle,
      label: `${pulse.stalledAdjustments} ajuste${pulse.stalledAdjustments > 1 ? "s" : ""} parado${pulse.stalledAdjustments > 1 ? "s" : ""}`,
      value: pulse.oldestStalledHours
        ? `há ${Math.floor(pulse.oldestStalledHours / 24)}+ dias`
        : "> 5 dias",
      accent: "danger",
      action: "registros:precisa_ajuste",
    });
  }

  // 4. Cold cycle
  if (pulse.isCold) {
    items.push({
      icon: Snowflake,
      label: "Ciclo frio",
      value: "0 registros nos últimos 3 dias",
      accent: "cold",
      action: "tab:missoes",
    });
  }

  // All clear
  if (items.length === 0) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-3 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Fluxo de validação saudável — sem gargalos detectados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Pulso de validação
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((item, i) => {
            const Icon = item.icon;
            const isClickable = !!item.action && !!onNavigate;

            const content = (
              <>
                <Icon className={`h-4 w-4 shrink-0 ${ACCENT_CLASSES[item.accent]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium truncate">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {item.value}
                  </p>
                </div>
                {isClickable && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </>
            );

            if (isClickable) {
              return (
                <button
                  key={i}
                  onClick={() => onNavigate(item.action!)}
                  className="flex items-center gap-2.5 rounded-md bg-muted/30 px-3 py-2 text-left hover:bg-muted transition-colors w-full"
                >
                  {content}
                </button>
              );
            }

            return (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-md bg-muted/30 px-3 py-2"
              >
                {content}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
