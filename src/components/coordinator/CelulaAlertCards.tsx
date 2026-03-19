/**
 * CelulaAlertCards - Compact operational alerts for cell coordination
 * F7.1: Renders between cycle card and stats grid. Hidden when no alerts.
 * F7.2: Action callbacks for tab switching + route links
 */

import { Link } from "react-router-dom";
import type { CelulaAlert } from "@/hooks/useCelulaAlerts";
import {
  Clock,
  RotateCcw,
  Timer,
  FileQuestion,
  Snowflake,
  ChevronRight,
} from "lucide-react";

const ALERT_CONFIG: Record<
  string,
  { icon: React.ElementType; accent: string }
> = {
  pendentes_antigos: { icon: Clock, accent: "text-amber-400" },
  ajuste_sem_reenvio: { icon: RotateCcw, accent: "text-amber-400" },
  ciclo_fim_proximo: { icon: Timer, accent: "text-primary" },
  ciclo_sem_sintese: { icon: FileQuestion, accent: "text-muted-foreground" },
  ciclo_frio: { icon: Snowflake, accent: "text-sky-400" },
};

interface Props {
  alerts: CelulaAlert[];
  onAction?: (action: string, alert: CelulaAlert) => void;
}

export function CelulaAlertCards({ alerts, onAction }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {alerts.map((alert) => {
        const config = ALERT_CONFIG[alert.type] ?? {
          icon: Clock,
          accent: "text-muted-foreground",
        };
        const Icon = config.icon;
        const isTabAction = alert.action?.startsWith("tab:");
        const isCustomAction = alert.action?.startsWith("action:") || alert.action?.startsWith("registros:");
        const isRouteAction = alert.action && !isTabAction && !isCustomAction;

        const actionBadge = alert.actionLabel ? (
          <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 shrink-0">
            {alert.actionLabel}
            <ChevronRight className="h-3 w-3" />
          </span>
        ) : null;

        const content = (
          <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2">
            <Icon className={`h-4 w-4 shrink-0 ${config.accent}`} />
            <p className="text-xs text-muted-foreground flex-1">
              {alert.message}
            </p>
            {actionBadge}
          </div>
        );

        if (isRouteAction) {
          return (
            <Link key={alert.type} to={alert.action!}>
              {content}
            </Link>
          );
        }

        if ((isTabAction || isCustomAction) && onAction) {
          return (
            <button
              key={alert.type}
              onClick={() => onAction(alert.action!, alert)}
              className="w-full text-left"
            >
              {content}
            </button>
          );
        }

        return <div key={alert.type}>{content}</div>;
      })}
    </div>
  );
}
