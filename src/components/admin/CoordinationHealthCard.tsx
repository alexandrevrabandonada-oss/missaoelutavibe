import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Info,
  Play,
  RefreshCw,
  Target,
  XCircle,
} from "lucide-react";

type CheckSeverity = "blocking" | "warning";

interface HealthCheck {
  name: string;
  description: string;
  rpc: string;
  params?: Record<string, any>;
  requiresCityId?: boolean;
  /** 
   * Severity classification:
   * - "blocking": Impedes core Cell Ops functionality
   * - "warning": Metrics/features not yet fully aligned with schema (non-blocking)
   */
  severity: CheckSeverity;
}

interface HealthCheckResult {
  name: string;
  status: "ok" | "error" | "warning" | "pending";
  message: string;
  hint?: string;
  data?: unknown;
  durationMs?: number;
  severity: CheckSeverity;
}

/**
 * Coordination health checks with severity classification.
 * 
 * BLOCKING: RPCs essential for Cell Operations to function.
 * WARNING: Metrics/inbox features that may fail due to schema drift (non-blocking).
 */
const COORDINATION_CHECKS: HealthCheck[] = [
  // === BLOCKING: Cell Ops core ===
  {
    name: "KPIs de Células",
    description: "Métricas gerais de alocação e pedidos pendentes",
    rpc: "get_cell_ops_kpis",
    params: {},
    severity: "blocking",
  },
  {
    name: "Lista Pedidos (sem cidade)",
    description: "Testa RPC de listagem sem city_id",
    rpc: "list_city_assignment_requests",
    params: { p_city_id: null, p_status: null },
    severity: "blocking",
  },
  {
    name: "Lista Células (coordinator_count)",
    description: "Testa RPC de células com campo coordinator_count",
    rpc: "list_city_cells",
    params: { p_city_id: null },
    severity: "blocking",
  },
  {
    name: "Aprovar com Promoção",
    description: "Testa se approve_and_assign_request aceita p_make_cell_coordinator",
    rpc: "approve_and_assign_request",
    params: { 
      p_request_id: "00000000-0000-0000-0000-000000000000", // Non-existent ID
      p_cell_id: null,
      p_coordinator_note: null,
      p_make_cell_coordinator: false
    },
    severity: "blocking",
  },
  {
    name: "Helper can_operate_coord",
    description: "Verifica se helper de permissão existe",
    rpc: "can_operate_coord",
    params: { _target_city_id: null, _target_cell_id: null },
    severity: "blocking",
  },

  // === BLOCKING: Coord Roles v1 RPCs ===
  {
    name: "Lista Coord Roles",
    description: "Testa RPC list_coord_roles (COORD_GLOBAL, COORD_CITY, CELL_COORD)",
    rpc: "list_coord_roles",
    params: { p_scope_city_id: null },
    severity: "blocking",
  },
  {
    name: "Grant Coord Role (validação)",
    description: "Valida parâmetros da RPC grant_coord_role",
    rpc: "grant_coord_role",
    params: { 
      p_user_id: "00000000-0000-0000-0000-000000000000", 
      p_role: "INVALID_ROLE", // Will fail validation, not permission
      p_city_id: null,
      p_cell_id: null
    },
    severity: "blocking",
  },
  {
    name: "Revoke Coord Role (validação)",
    description: "Valida parâmetros da RPC revoke_coord_role",
    rpc: "revoke_coord_role",
    params: { 
      p_user_id: "00000000-0000-0000-0000-000000000000", 
      p_role: "COORD_GLOBAL",
      p_city_id: null,
      p_cell_id: null
    },
    severity: "blocking",
  },

  // === WARNING: Inbox metrics (may fail if schema not aligned) ===
  {
    name: "Métricas Coordenador (all)",
    description: "Inbox de coordenação scope=all",
    rpc: "get_coordinator_inbox_metrics",
    params: { _scope_type: "all", _scope_cidade: null, _scope_cell_id: null },
    severity: "warning",
  },
  {
    name: "Follow-ups Vencidos (all)",
    description: "Lista follow-ups atrasados",
    rpc: "get_coordinator_overdue_followups",
    params: { _scope_type: "all", _scope_cidade: null, _scope_cell_id: null, _limit: 5 },
    severity: "warning",
  },
  {
    name: "Voluntários em Risco (all)",
    description: "Lista voluntários sem ação recente",
    rpc: "get_coordinator_at_risk_volunteers",
    params: { _scope_type: "all", _scope_cidade: null, _scope_cell_id: null, _limit: 5 },
    severity: "warning",
  },
  {
    name: "Missões Paradas (all)",
    description: "Lista missões travadas há >48h",
    rpc: "get_coordinator_stalled_missions",
    params: { _scope_type: "all", _scope_cidade: null, _scope_cell_id: null, _limit: 5 },
    severity: "warning",
  },
];

async function runCheck(check: HealthCheck): Promise<HealthCheckResult> {
  const start = performance.now();
  
  try {
    const { data, error } = await (supabase.rpc as any)(check.rpc, check.params || {});
    const durationMs = Math.round(performance.now() - start);

    if (error) {
      // Parse common error patterns
      let hint = "Verifique se a RPC existe e está deployada.";
      
      if (error.message?.includes("function") && error.message?.includes("does not exist")) {
        hint = "RPC não encontrada. Execute a migration correspondente.";
      } else if (error.message?.includes("permission denied")) {
        hint = "Permissão negada. Verifique SECURITY DEFINER e roles.";
      } else if (error.message?.includes("violates row-level security")) {
        hint = "RLS bloqueou a query. Verifique políticas da tabela.";
      }

      return {
        name: check.name,
        status: "error",
        message: error.message || "Erro desconhecido",
        hint,
        durationMs,
        severity: check.severity,
      };
    }

    // Check for logical errors in response
    if (data && typeof data === "object" && "error" in data) {
      return {
        name: check.name,
        status: "warning",
        message: `Retornou erro lógico: ${data.error}`,
        hint: "A RPC existe mas retornou erro interno. Verifique parâmetros.",
        data,
        durationMs,
        severity: check.severity,
      };
    }

    // Empty results warning (not necessarily an error)
    const isEmpty = 
      (Array.isArray(data) && data.length === 0) ||
      (data === null);

    return {
      name: check.name,
      status: "ok",
      message: isEmpty ? "OK (sem dados)" : `OK (${JSON.stringify(data).slice(0, 80)}...)`,
      data,
      durationMs,
      severity: check.severity,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    return {
      name: check.name,
      status: "error",
      message: err.message || "Exceção não capturada",
      hint: "Erro de rede ou exceção JavaScript.",
      durationMs,
      severity: check.severity,
    };
  }
}

export function CoordinationHealthCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [manualRunKey, setManualRunKey] = useState(0);

  const {
    data: results,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["coordination-health-check", manualRunKey],
    queryFn: async () => {
      const checks = await Promise.all(COORDINATION_CHECKS.map(runCheck));
      return checks;
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const handleRun = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else {
      setManualRunKey((k) => k + 1);
    }
  };

  // Summary counts by severity
  const blockingErrors = results?.filter((r) => r.status === "error" && r.severity === "blocking").length || 0;
  const warningErrors = results?.filter((r) => r.status === "error" && r.severity === "warning").length || 0;
  const warningsLogical = results?.filter((r) => r.status === "warning").length || 0;
  const okCount = results?.filter((r) => r.status === "ok").length || 0;
  const totalChecks = COORDINATION_CHECKS.length;

  // Separate results by severity
  const blockingResults = results?.filter((r) => r.severity === "blocking") || [];
  const warningResults = results?.filter((r) => r.severity === "warning") || [];

  const overallStatus: HealthCheckResult["status"] =
    blockingErrors > 0 ? "error" : (warningErrors + warningsLogical) > 0 ? "warning" : results ? "ok" : "pending";

  return (
    <Card className={overallStatus === "error" ? "border-destructive" : overallStatus === "warning" ? "border-amber-500" : ""}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Saúde da Coordenação</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {results && (
                <div className="flex items-center gap-1 text-xs flex-wrap">
                  {blockingErrors > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {blockingErrors} bloqueante{blockingErrors > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {(warningErrors + warningsLogical) > 0 && (
                    <Badge className="bg-amber-500 text-white text-xs">
                      {warningErrors + warningsLogical} aviso{(warningErrors + warningsLogical) > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {okCount > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-500">
                      {okCount}/{totalChecks} OK
                    </Badge>
                  )}
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRun}
                disabled={isFetching}
              >
                {isFetching ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <CollapsibleTrigger asChild>
                <Button size="sm" variant="ghost">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CardDescription>
            Testa RPCs de coordenação — separa erros bloqueantes de avisos
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : results ? (
              <>
                {/* Blocking section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span>Bloqueantes (Operação de Células)</span>
                    <Badge variant={blockingErrors > 0 ? "destructive" : "outline"} className="text-xs">
                      {blockingResults.filter(r => r.status === "error").length} / {blockingResults.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 pl-6">
                    {blockingResults.map((result) => (
                      <HealthCheckRow key={result.name} result={result} />
                    ))}
                  </div>
                </div>

                {/* Warning section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Avisos (não bloqueantes)</span>
                    <Badge className="bg-amber-500/10 text-amber-700 border-amber-500 text-xs">
                      {warningResults.filter(r => r.status === "error" || r.status === "warning").length} / {warningResults.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    Não impedem Operação de Células. Podem indicar RPC não alinhada ao schema atual.
                  </p>
                  <div className="space-y-2 pl-6">
                    {warningResults.map((result) => (
                      <HealthCheckRow key={result.name} result={result} showWarningLabel />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Clique em <Play className="inline h-3 w-3" /> para rodar os checks
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function HealthCheckRow({ result, showWarningLabel }: { result: HealthCheckResult; showWarningLabel?: boolean }) {
  const [showDetails, setShowDetails] = useState(false);

  const StatusIcon = {
    ok: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
    pending: Activity,
  }[result.status];

  const statusColor = {
    ok: "text-green-600",
    warning: "text-amber-600",
    error: "text-destructive",
    pending: "text-muted-foreground",
  }[result.status];

  // For warning-severity items that error, show softer styling
  const isNonBlockingError = result.severity === "warning" && result.status === "error";

  return (
    <div
      className={`rounded-lg border p-3 ${
        result.status === "error" && result.severity === "blocking"
          ? "border-destructive bg-destructive/5"
          : isNonBlockingError
          ? "border-amber-500/50 bg-amber-500/5"
          : result.status === "warning"
          ? "border-amber-500 bg-amber-500/5"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${isNonBlockingError ? "text-amber-600" : statusColor}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{result.name}</p>
              {showWarningLabel && result.status === "error" && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                  AVISO
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{result.message}</p>
            {result.hint && result.status !== "ok" && (
              <p className="text-xs mt-1 text-amber-700 dark:text-amber-400">
                💡 {result.hint}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {result.durationMs !== undefined && (
            <span className="text-xs text-muted-foreground">{result.durationMs}ms</span>
          )}
          {result.data && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Ocultar" : "Detalhes"}
            </Button>
          )}
        </div>
      </div>

      {showDetails && result.data && (
        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto max-h-32">
          <pre>{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
