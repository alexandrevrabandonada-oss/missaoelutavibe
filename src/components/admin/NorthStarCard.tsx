import React, { useEffect, useRef, useState } from "react";
import { useNorthStarMetrics, NorthStarScope } from "@/hooks/useNorthStar";
import { focusRingClass } from "@/utils/a11y";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Users,
  Share2,
  UserPlus,
  CheckCircle2,
  Heart,
  Calendar,
} from "lucide-react";

interface Props {
  scope?: NorthStarScope;
}

const METRIC_CONFIG = [
  { key: "activation_rate", label: "Ativação", icon: Users, suffix: "%" },
  { key: "action_per_active", label: "Ações/Ativo", icon: CheckCircle2, suffix: "" },
  { key: "share_rate", label: "Share", icon: Share2, suffix: "%" },
  { key: "crm_rate", label: "CRM", icon: UserPlus, suffix: "%" },
  { key: "qualify_rate", label: "Qualifica", icon: CheckCircle2, suffix: "%" },
  { key: "hot_support_rate", label: "Apoio Forte", icon: Heart, suffix: "%" },
  { key: "event_conversion", label: "Eventos", icon: Calendar, suffix: "%" },
];

function DeltaIndicator({ delta }: { delta?: number }) {
  if (delta === undefined || delta === 0) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-green-500 text-xs">
        <TrendingUp className="h-3 w-3" />
        +{delta}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-amber-500 text-xs">
      <TrendingDown className="h-3 w-3" />
      {delta}%
    </span>
  );
}

export function NorthStarCard({ scope }: Props) {
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const { data, isLoading, refetch, trackViewed } = useNorthStarMetrics(windowDays, scope);
  const hasTrackedView = useRef(false);

  // Track view on mount
  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      trackViewed();
    }
  }, [trackViewed]);

  // Hide if forbidden
  if (data.error === "forbidden") return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">North Star</h3>
          <Badge variant="outline" className="text-xs">
            {data.scope?.kind === "global" ? "Global" : data.scope?.value || "Escopo"}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant={windowDays === 7 ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2 text-xs ${focusRingClass}`}
            onClick={() => setWindowDays(7)}
          >
            7d
          </Button>
          <Button
            variant={windowDays === 30 ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2 text-xs ${focusRingClass}`}
            onClick={() => setWindowDays(30)}
          >
            30d
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${focusRingClass}`}
            onClick={() => refetch()}
            aria-label="Atualizar"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : data.error === "fetch_failed" ? (
        <p className="text-sm text-muted-foreground">Erro ao carregar métricas.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {METRIC_CONFIG.map((config) => {
            const value = (data as any)[config.key] ?? 0;
            const deltaKey = `delta_${config.key}`;
            const delta = (data as any)[deltaKey];
            const Icon = config.icon;

            return (
              <div key={config.key} className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/30">
                <Icon className="h-4 w-4 text-muted-foreground mb-1" />
                <span className="text-lg font-bold">
                  {value}{config.suffix}
                </span>
                <span className="text-xs text-muted-foreground">{config.label}</span>
                {data.has_deltas && <DeltaIndicator delta={delta} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Counts summary */}
      {!isLoading && !data.error && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
          <span>{data.signup_count} signups</span>
          <span>{data.approved_count} aprovados</span>
          <span>{data.active_count} ativos</span>
          <span>{data.actions_completed} ações</span>
          <span>{data.crm_support_hot} apoio forte</span>
          <span>{data.event_attended} presentes</span>
        </div>
      )}
    </div>
  );
}
