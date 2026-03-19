import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNorthStarAlerts, NorthStarAlert, NorthStarScope } from "@/hooks/useNorthStar";
import { focusRingClass } from "@/utils/a11y";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  AlertTriangle,
  Copy,
  ExternalLink,
  CheckCircle2,
  Target,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  scope?: NorthStarScope;
  windowDays?: 7 | 30;
}

const ALERT_ROUTES: Record<string, string> = {
  activation: "/admin/ops",
  share: "/voluntario/convite",
  crm: "/admin/crm",
  qualify: "/admin/crm",
  hot_support: "/admin/crm",
  event_conversion: "/admin/agenda",
};

const ALERT_LABELS: Record<string, string> = {
  activation: "Ativação",
  share: "Compartilhamento",
  crm: "CRM",
  qualify: "Qualificação",
  hot_support: "Apoio Forte",
  event_conversion: "Eventos",
};

export function NorthStarAlertsCard({ scope, windowDays = 7 }: Props) {
  const navigate = useNavigate();
  const { data, isLoading, refetch, trackCopyClicked, trackActionClicked } = useNorthStarAlerts(windowDays, scope);

  // Hide if forbidden or no alerts
  if (data.error === "forbidden") return null;

  const alerts = data.alerts || [];

  const handleCopy = () => {
    const lines = [
      `=== North Star Alerts (${windowDays}d) ===`,
      `Escopo: ${data.scope?.kind === "global" ? "Global" : data.scope?.value || "N/A"}`,
      ``,
      ...alerts.map((a: NorthStarAlert) => 
        `${a.severity === "critical" ? "🔴" : "⚠️"} ${ALERT_LABELS[a.key] || a.key}: ${a.value}% (meta: ${a.target}%)\n   → ${a.hint}`
      ),
    ];

    if (alerts.length === 0) {
      lines.push("✅ Nenhum alerta ativo!");
    }

    navigator.clipboard.writeText(lines.join("\n"));
    trackCopyClicked();
    toast.success("Diagnóstico copiado!");
  };

  const handleAction = (alert: NorthStarAlert) => {
    trackActionClicked(alert.key);
    const route = ALERT_ROUTES[alert.key];
    if (route) {
      navigate(route);
    }
  };

  // No alerts = show success state
  if (alerts.length === 0 && !isLoading && !data.error) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-green-500">
            Funil saudável ({windowDays}d) — sem alertas
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${
      data.has_critical 
        ? "border-destructive/50 bg-destructive/5" 
        : "border-amber-500/50 bg-amber-500/5"
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${data.has_critical ? "text-destructive" : "text-amber-500"}`} />
          <h3 className="font-bold text-sm">Alertas do Funil</h3>
          <Badge 
            variant="outline" 
            className={`text-xs ${
              data.has_critical 
                ? "border-destructive/50 text-destructive" 
                : "border-amber-500/50 text-amber-500"
            }`}
          >
            {alerts.length} alerta{alerts.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${focusRingClass}`}
            onClick={handleCopy}
            aria-label="Copiar diagnóstico"
            title="Copiar diagnóstico"
          >
            <Copy className="h-3 w-3" />
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
        <p className="text-sm text-muted-foreground">Verificando…</p>
      ) : data.error === "fetch_failed" ? (
        <p className="text-sm text-muted-foreground">Erro ao verificar alertas.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.slice(0, 5).map((alert: NorthStarAlert) => (
            <li 
              key={alert.key}
              className="flex items-start gap-2 p-2 rounded-lg bg-background/50"
            >
              <Target className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                alert.severity === "critical" ? "text-destructive" : "text-amber-500"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {ALERT_LABELS[alert.key] || alert.key}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      alert.severity === "critical" 
                        ? "border-destructive/50 text-destructive" 
                        : "border-amber-500/50 text-amber-500"
                    }`}
                  >
                    {alert.value}% (meta: {alert.target}%)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.hint}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 flex-shrink-0 ${focusRingClass}`}
                onClick={() => handleAction(alert)}
                aria-label="Abrir ação recomendada"
                title="Abrir ação"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
