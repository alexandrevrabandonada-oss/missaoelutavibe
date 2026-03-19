/**
 * SSOTDriftCard - SSOT Drift Detection for Coordination Roles
 * 
 * Verifies that coord_roles is the single source of truth for coordination
 * and warns about any legacy tables that might cause "second truth" issues.
 */

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
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Database,
  Play,
  RefreshCw,
  Shield,
  XCircle,
  ExternalLink,
} from "lucide-react";

interface DriftCheck {
  name: string;
  description: string;
  status: "ok" | "warning" | "error" | "pending";
  message: string;
  hint?: string;
  link?: string;
}

async function runDriftChecks(): Promise<DriftCheck[]> {
  const checks: DriftCheck[] = [];

  // Check 1: coord_roles table exists and is queryable
  try {
    const { data, error } = await supabase.rpc("list_coord_roles", {
      p_scope_city_id: null,
    });
    
    if (error) {
      checks.push({
        name: "coord_roles existe",
        description: "Tabela SSOT de coordenação",
        status: "error",
        message: `RPC falhou: ${error.message}`,
        hint: "Execute a migration de coord_roles v1",
      });
    } else {
      const count = Array.isArray(data) ? data.length : 0;
      checks.push({
        name: "coord_roles existe",
        description: "Tabela SSOT de coordenação",
        status: "ok",
        message: `OK — ${count} registro(s) ativos`,
      });
    }
  } catch (err: any) {
    checks.push({
      name: "coord_roles existe",
      description: "Tabela SSOT de coordenação",
      status: "error",
      message: `Exceção: ${err.message}`,
      hint: "Verifique se a RPC list_coord_roles está deployada",
    });
  }

  // Check 2: can_operate_coord helper works
  try {
    const { data, error } = await supabase.rpc("can_operate_coord", {
      _target_city_id: null,
      _target_cell_id: null,
    });
    
    if (error) {
      checks.push({
        name: "can_operate_coord funciona",
        description: "Helper de permissão canônico",
        status: "error",
        message: `RPC falhou: ${error.message}`,
        hint: "Execute a migration de coord_roles v1",
      });
    } else {
      checks.push({
        name: "can_operate_coord funciona",
        description: "Helper de permissão canônico",
        status: "ok",
        message: `OK — retornou ${data ? "true" : "false"}`,
      });
    }
  } catch (err: any) {
    checks.push({
      name: "can_operate_coord funciona",
      description: "Helper de permissão canônico",
      status: "error",
      message: `Exceção: ${err.message}`,
    });
  }

  // Check 3: cell_coordinators legacy table
  try {
    const { count, error } = await supabase
      .from("cell_coordinators" as any)
      .select("*", { count: "exact", head: true });
    
    if (error) {
      // Table doesn't exist = good
      if (error.message.includes("does not exist") || error.code === "42P01") {
        checks.push({
          name: "cell_coordinators (legado)",
          description: "Tabela deprecada não existe",
          status: "ok",
          message: "OK — tabela não existe (esperado)",
        });
      } else {
        checks.push({
          name: "cell_coordinators (legado)",
          description: "Tabela deprecada",
          status: "warning",
          message: `Erro ao verificar: ${error.message}`,
          hint: "Verificar RLS ou permissões",
        });
      }
    } else if (count && count > 0) {
      checks.push({
        name: "cell_coordinators (legado)",
        description: "Tabela deprecada com dados ativos",
        status: "warning",
        message: `⚠️ ${count} registro(s) — risco de segunda verdade`,
        hint: "Migrar dados para coord_roles e deprecar tabela",
        link: "memory/features/ssot-method-v1.md",
      });
    } else {
      checks.push({
        name: "cell_coordinators (legado)",
        description: "Tabela existe mas vazia",
        status: "ok",
        message: "OK — tabela existe mas sem dados",
      });
    }
  } catch (err: any) {
    // If we can't access it, assume it doesn't exist
    checks.push({
      name: "cell_coordinators (legado)",
      description: "Tabela deprecada",
      status: "ok",
      message: "OK — tabela não acessível (provavelmente não existe)",
    });
  }

  // Check 4: user_roles with coordenador_celula (legacy pattern)
  try {
    const { count, error } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "coordenador_celula" as any)
      .is("revoked_at", null);
    
    if (error) {
      checks.push({
        name: "user_roles.coordenador_celula",
        description: "Padrão legado de coordenador de célula",
        status: "warning",
        message: `Erro ao verificar: ${error.message}`,
      });
    } else if (count && count > 0) {
      checks.push({
        name: "user_roles.coordenador_celula",
        description: "Padrão legado de coordenador de célula",
        status: "warning",
        message: `⚠️ ${count} registro(s) — preferir CELL_COORD em coord_roles`,
        hint: "Migrar para coord_roles.CELL_COORD",
        link: "memory/features/coord-roles-v1.md",
      });
    } else {
      checks.push({
        name: "user_roles.coordenador_celula",
        description: "Padrão legado não em uso",
        status: "ok",
        message: "OK — nenhum coordenador usando padrão legado",
      });
    }
  } catch (err: any) {
    checks.push({
      name: "user_roles.coordenador_celula",
      description: "Padrão legado",
      status: "warning",
      message: `Erro: ${err.message}`,
    });
  }

  return checks;
}

export function SSOTDriftCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [manualRunKey, setManualRunKey] = useState(0);

  const {
    data: checks,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["ssot-drift-checks", manualRunKey],
    queryFn: runDriftChecks,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const handleRun = () => {
    if (!isOpen) {
      setIsOpen(true);
    } else {
      setManualRunKey((k) => k + 1);
    }
  };

  const warningCount = checks?.filter((c) => c.status === "warning").length || 0;
  const errorCount = checks?.filter((c) => c.status === "error").length || 0;
  const okCount = checks?.filter((c) => c.status === "ok").length || 0;

  const overallStatus = errorCount > 0 ? "error" : warningCount > 0 ? "warning" : checks ? "ok" : "pending";

  return (
    <Card className={
      overallStatus === "error" ? "border-destructive" : 
      overallStatus === "warning" ? "border-amber-500" : ""
    }>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Deriva de SSOT (roles)</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {checks && (
                <div className="flex items-center gap-1 text-xs flex-wrap">
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {errorCount} erro{errorCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {warningCount > 0 && (
                    <Badge className="bg-amber-500 text-white text-xs">
                      {warningCount} aviso{warningCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {okCount > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-500">
                      {okCount}/{checks.length} OK
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
            Verifica que <code className="text-xs bg-muted px-1 rounded">coord_roles</code> é a única fonte de verdade
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : checks ? (
              <>
                {checks.map((check, idx) => (
                  <DriftCheckRow key={idx} check={check} />
                ))}
                
                {/* SSOT Methodology link */}
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    📖 <strong>Metodologia:</strong> 1 verdade, 1 rota canônica, 1 healthcheck.{" "}
                    <span className="text-primary">
                      Ver <code className="bg-muted px-1 rounded">memory/features/ssot-method-v1.md</code>
                    </span>
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Clique em <Play className="inline h-3 w-3" /> para verificar deriva
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function DriftCheckRow({ check }: { check: DriftCheck }) {
  const StatusIcon = {
    ok: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
    pending: Shield,
  }[check.status];

  const statusColor = {
    ok: "text-green-600",
    warning: "text-amber-600",
    error: "text-destructive",
    pending: "text-muted-foreground",
  }[check.status];

  const borderClass = {
    ok: "border-border",
    warning: "border-amber-500/50 bg-amber-500/5",
    error: "border-destructive bg-destructive/5",
    pending: "border-border",
  }[check.status];

  return (
    <div className={`rounded-lg border p-3 ${borderClass}`}>
      <div className="flex items-start gap-2">
        <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{check.name}</p>
            {check.status === "warning" && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                LEGADO ATIVO
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{check.description}</p>
          <p className="text-xs mt-1">{check.message}</p>
          {check.hint && (
            <p className="text-xs mt-1 text-amber-700 dark:text-amber-400">
              💡 {check.hint}
            </p>
          )}
          {check.link && (
            <p className="text-xs mt-1 text-primary flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Ver: <code className="bg-muted px-1 rounded">{check.link}</code>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
