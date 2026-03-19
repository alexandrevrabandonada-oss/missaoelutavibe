import React, { useEffect, useRef } from "react";
import { useDbContractHealth, ContractCheck } from "@/hooks/useDbContractHealth";
import { focusRingClass } from "@/utils/a11y";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Database,
  Code,
  Table,
} from "lucide-react";
import { toast } from "sonner";

const CHECK_ICONS: Record<string, React.ReactNode> = {
  growth_events_ts: <Database className="h-3 w-3" />,
  rpc_: <Code className="h-3 w-3" />,
  table_: <Table className="h-3 w-3" />,
};

function getIcon(key: string): React.ReactNode {
  if (key.startsWith("rpc_")) return CHECK_ICONS["rpc_"];
  if (key.startsWith("table_")) return CHECK_ICONS["table_"];
  return CHECK_ICONS[key] || <Database className="h-3 w-3" />;
}

function formatKey(key: string): string {
  if (key === "growth_events_ts") return "growth_events (timestamp)";
  if (key.startsWith("rpc_")) return key.replace("rpc_", "RPC: ");
  if (key.startsWith("table_")) return key.replace("table_", "Tabela: ");
  return key;
}

export function DbContractHealthCard() {
  const { data, isLoading, refetch, trackViewed, trackFailed } = useDbContractHealth();
  const hasTrackedView = useRef(false);
  const hasTrackedFail = useRef(false);

  // Track view on mount
  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      trackViewed();
    }
  }, [trackViewed]);

  // Track failure when detected
  useEffect(() => {
    if (!data.ok && data.failed_keys?.length > 0 && !hasTrackedFail.current && !data.error) {
      hasTrackedFail.current = true;
      trackFailed(data.failed_keys);
    }
  }, [data, trackFailed]);

  const handleCopy = () => {
    const lines = [
      `=== Contrato do Banco ===`,
      `Status: ${data.ok ? "OK" : "ATENÇÃO"}`,
      `Timestamp: ${data.ts}`,
      ``,
      `Checks:`,
      ...data.checks.map(
        (c: ContractCheck) => `  ${c.ok ? "✅" : "⚠️"} ${formatKey(c.key)}: ${c.detail}`
      ),
    ];

    if (data.failed_keys?.length > 0) {
      lines.push(``, `Falhas: ${data.failed_keys.join(", ")}`);
    }

    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Relatório copiado!");
  };

  // Hide if forbidden
  if (data.error === "forbidden") return null;

  const failedCount = data.failed_keys?.length || 0;
  const passedCount = data.checks.filter((c: ContractCheck) => c.ok).length;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Contrato do Banco</h3>
          {data.ok ? (
            <Badge variant="outline" className="text-xs border-green-500/50 text-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              OK
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {failedCount} problema{failedCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${focusRingClass}`}
            onClick={handleCopy}
            aria-label="Copiar relatório"
            title="Copiar relatório"
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
        <p className="text-sm text-muted-foreground">Erro ao verificar contrato do banco.</p>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {passedCount} OK
            </span>
            {failedCount > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                {failedCount} falha{failedCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Checks list */}
          <ul className="text-sm space-y-1.5 max-h-48 overflow-y-auto">
            {data.checks.map((check: ContractCheck) => (
              <li key={check.key} className="flex items-center gap-2">
                {check.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                )}
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {getIcon(check.key)}
                  <span className="truncate">{formatKey(check.key)}</span>
                </span>
                <span
                  className={`text-xs ml-auto ${
                    check.ok ? "text-green-500" : "text-destructive"
                  }`}
                >
                  {check.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
