import React from "react";
import { useNorthStarMetrics, useNorthStarAlerts, NorthStarScope } from "@/hooks/useNorthStar";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  Users,
  Share2,
  Heart,
  Calendar,
} from "lucide-react";

interface Props {
  scope?: NorthStarScope;
}

export function NorthStarPulseCard({ scope }: Props) {
  const { data: metrics, isLoading: metricsLoading } = useNorthStarMetrics(7, scope);
  const { data: alerts, isLoading: alertsLoading } = useNorthStarAlerts(7, scope);

  const isLoading = metricsLoading || alertsLoading;

  // Hide if forbidden
  if (metrics.error === "forbidden") return null;

  const alertCount = alerts.alert_count || 0;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Pulso do Escopo (7d)</h3>
        </div>
        {alertCount > 0 && (
          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {alertCount} alerta{alertCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : metrics.error === "fetch_failed" ? (
        <p className="text-xs text-muted-foreground">Erro ao carregar.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <MetricPill
            icon={Users}
            value={metrics.activation_rate}
            label="Ativação"
            suffix="%"
          />
          <MetricPill
            icon={Share2}
            value={metrics.share_rate}
            label="Share"
            suffix="%"
          />
          <MetricPill
            icon={Heart}
            value={metrics.hot_support_rate}
            label="Apoio"
            suffix="%"
          />
          <MetricPill
            icon={Calendar}
            value={metrics.event_conversion}
            label="Eventos"
            suffix="%"
          />
        </div>
      )}
    </div>
  );
}

function MetricPill({ 
  icon: Icon, 
  value, 
  label, 
  suffix 
}: { 
  icon: typeof Users; 
  value: number; 
  label: string; 
  suffix: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-1.5 rounded bg-muted/30">
      <Icon className="h-3 w-3 text-muted-foreground mb-0.5" />
      <span className="text-sm font-bold">{value}{suffix}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}
