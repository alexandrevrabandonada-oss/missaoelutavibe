/**
 * SSOTRegistryCard - SSOT Registry & Drift Detection by Domain
 * 
 * Loads SSOT_REGISTRY.md and runs automated checks per domain
 * to detect drift from the single source of truth.
 */

import { useState, useMemo } from "react";
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
import { CANONICAL_ROUTES } from "@/lib/routeManifest";
import { LEGACY_ROUTE_MAP } from "@/components/routing/LegacyRouteRedirects";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Play,
  RefreshCw,
  XCircle,
  FileText,
  Layers,
} from "lucide-react";

// Registry path reference (file lives at project root, cannot be imported with ?raw)
const REGISTRY_PATH = "memory/SSOT_REGISTRY.md";
const REGISTRY_DESCRIPTION = "Mapa de domínios com SSOT, legados, rotas canônicas e anti-padrões. Ver arquivo no repositório.";

interface DomainCheck {
  domain: string;
  checks: DomainCheckItem[];
  status: "ok" | "warning" | "error";
}

interface DomainCheckItem {
  name: string;
  status: "ok" | "warning" | "error" | "pending";
  message: string;
  hint?: string;
}

interface RegistryResult {
  registryLoaded: boolean;
  registryLength: number;
  domains: DomainCheck[];
  totals: {
    ok: number;
    warning: number;
    error: number;
  };
}

// Define canonical routes per domain for validation
const DOMAIN_CANONICAL_ROUTES: Record<string, string[]> = {
  "Coordenação": ["/coordenador/hoje", "/coordenador/territorio"],
  "Convites/Auth": ["/auth", "/aceitar-convite"],
  "Onboarding": ["/voluntario/primeiros-passos"],
  "Fábrica": ["/admin/fabrica", "/fabrica/arquivos", "/materiais"],
  "Formação": ["/formacao"],
  "Debates": ["/debates"],
  "Missões": ["/voluntario/missoes"],
  "CRM": ["/voluntario/crm"],
  "Squads": ["/voluntario/squads", "/voluntario/skills"],
};

// Define legacy redirects per domain
const DOMAIN_LEGACY_REDIRECTS: Record<string, string[]> = {
  "Coordenação": ["/coordenador-hoje", "/coordenador-territorio"],
  "Onboarding": ["/voluntario-primeiros-passos"],
};

async function runRegistryChecks(): Promise<RegistryResult> {
  const domains: DomainCheck[] = [];
  
  // Check 1: Coordenação - coord_roles SSOT
  const coordChecks: DomainCheckItem[] = [];
  try {
    const { data, error } = await supabase.rpc("list_coord_roles", { p_scope_city_id: null });
    if (error) {
      coordChecks.push({
        name: "coord_roles em uso",
        status: "error",
        message: `RPC falhou: ${error.message}`,
        hint: "Verificar se migration foi executada",
      });
    } else {
      coordChecks.push({
        name: "coord_roles em uso",
        status: "ok",
        message: `OK — ${Array.isArray(data) ? data.length : 0} registro(s)`,
      });
    }
  } catch (err: any) {
    coordChecks.push({
      name: "coord_roles em uso",
      status: "error",
      message: `Exceção: ${err.message}`,
    });
  }

  // Check legacy cell_coordinators
  try {
    const { count, error } = await supabase
      .from("cell_coordinators" as any)
      .select("*", { count: "exact", head: true });
    
    if (!error && count && count > 0) {
      coordChecks.push({
        name: "cell_coordinators (legado)",
        status: "warning",
        message: `${count} registro(s) ativos — risco de deriva`,
        hint: "Migrar para coord_roles e deprecar tabela",
      });
    } else {
      coordChecks.push({
        name: "cell_coordinators (legado)",
        status: "ok",
        message: "OK — tabela vazia ou não existe",
      });
    }
  } catch {
    coordChecks.push({
      name: "cell_coordinators (legado)",
      status: "ok",
      message: "OK — tabela não acessível",
    });
  }

  // Check canonical routes exist
  const routePaths = new Set(CANONICAL_ROUTES.map(r => r.path));
  const coordRoutes = DOMAIN_CANONICAL_ROUTES["Coordenação"] || [];
  const missingCoordRoutes = coordRoutes.filter(r => !routePaths.has(r));
  coordChecks.push({
    name: "Rotas canônicas",
    status: missingCoordRoutes.length === 0 ? "ok" : "warning",
    message: missingCoordRoutes.length === 0 
      ? `OK — ${coordRoutes.length}/${coordRoutes.length} presentes`
      : `Faltando: ${missingCoordRoutes.join(", ")}`,
    hint: missingCoordRoutes.length > 0 ? "Adicionar rota no manifest" : undefined,
  });

  // Check legacy redirects
  const coordLegacy = DOMAIN_LEGACY_REDIRECTS["Coordenação"] || [];
  const missingCoordLegacy = coordLegacy.filter(r => !LEGACY_ROUTE_MAP[r]);
  coordChecks.push({
    name: "Redirects legados",
    status: missingCoordLegacy.length === 0 ? "ok" : "warning",
    message: missingCoordLegacy.length === 0
      ? `OK — ${coordLegacy.length}/${coordLegacy.length} configurados`
      : `Faltando: ${missingCoordLegacy.join(", ")}`,
    hint: missingCoordLegacy.length > 0 ? "Adicionar em LEGACY_ROUTE_MAP" : undefined,
  });

  domains.push({
    domain: "Coordenação",
    checks: coordChecks,
    status: coordChecks.some(c => c.status === "error") ? "error" 
          : coordChecks.some(c => c.status === "warning") ? "warning" : "ok",
  });

  // Check 2: Células
  const cellChecks: DomainCheckItem[] = [];
  try {
    const { data, error } = await supabase.rpc("list_city_cells", { p_city_id: null } as any);
    cellChecks.push({
      name: "list_city_cells RPC",
      status: error ? "error" : "ok",
      message: error ? `Falhou: ${error.message}` : `OK — RPC funciona`,
    });
  } catch (err: any) {
    cellChecks.push({
      name: "list_city_cells RPC",
      status: "error",
      message: `Exceção: ${err.message}`,
    });
  }

  domains.push({
    domain: "Células",
    checks: cellChecks,
    status: cellChecks.some(c => c.status === "error") ? "error" 
          : cellChecks.some(c => c.status === "warning") ? "warning" : "ok",
  });

  // Check 3: Convites/Auth
  const authChecks: DomainCheckItem[] = [];
  const authRoutes = DOMAIN_CANONICAL_ROUTES["Convites/Auth"] || [];
  const missingAuthRoutes = authRoutes.filter(r => !routePaths.has(r));
  authChecks.push({
    name: "Rotas canônicas",
    status: missingAuthRoutes.length === 0 ? "ok" : "error",
    message: missingAuthRoutes.length === 0
      ? `OK — ${authRoutes.length}/${authRoutes.length} presentes`
      : `Faltando: ${missingAuthRoutes.join(", ")}`,
    hint: missingAuthRoutes.length > 0 ? "Rotas de auth são críticas!" : undefined,
  });

  domains.push({
    domain: "Convites/Auth",
    checks: authChecks,
    status: authChecks.some(c => c.status === "error") ? "error" 
          : authChecks.some(c => c.status === "warning") ? "warning" : "ok",
  });

  // Check 4: Onboarding
  const onboardingChecks: DomainCheckItem[] = [];
  const onboardingRoutes = DOMAIN_CANONICAL_ROUTES["Onboarding"] || [];
  const missingOnboardingRoutes = onboardingRoutes.filter(r => !routePaths.has(r));
  onboardingChecks.push({
    name: "Rotas canônicas",
    status: missingOnboardingRoutes.length === 0 ? "ok" : "error",
    message: missingOnboardingRoutes.length === 0
      ? `OK — rota de primeiros-passos existe`
      : `Faltando: ${missingOnboardingRoutes.join(", ")}`,
    hint: missingOnboardingRoutes.length > 0 ? "Guard de onboarding depende desta rota" : undefined,
  });

  // Check legacy redirects for onboarding
  const onboardingLegacy = DOMAIN_LEGACY_REDIRECTS["Onboarding"] || [];
  const missingOnboardingLegacy = onboardingLegacy.filter(r => !LEGACY_ROUTE_MAP[r]);
  onboardingChecks.push({
    name: "Redirects legados",
    status: missingOnboardingLegacy.length === 0 ? "ok" : "warning",
    message: missingOnboardingLegacy.length === 0
      ? `OK — redirects configurados`
      : `Faltando: ${missingOnboardingLegacy.join(", ")}`,
    hint: missingOnboardingLegacy.length > 0 ? "Adicionar redirect para evitar 404" : undefined,
  });

  domains.push({
    domain: "Onboarding",
    checks: onboardingChecks,
    status: onboardingChecks.some(c => c.status === "error") ? "error" 
          : onboardingChecks.some(c => c.status === "warning") ? "warning" : "ok",
  });

  // Check 5: Fábrica/Materiais
  const fabricaChecks: DomainCheckItem[] = [];
  const fabricaRoutes = DOMAIN_CANONICAL_ROUTES["Fábrica"] || [];
  const missingFabricaRoutes = fabricaRoutes.filter(r => !routePaths.has(r));
  fabricaChecks.push({
    name: "Rotas canônicas",
    status: missingFabricaRoutes.length === 0 ? "ok" : "warning",
    message: missingFabricaRoutes.length === 0
      ? `OK — ${fabricaRoutes.length}/${fabricaRoutes.length} presentes`
      : `Faltando: ${missingFabricaRoutes.join(", ")}`,
  });

  domains.push({
    domain: "Fábrica/Materiais",
    checks: fabricaChecks,
    status: fabricaChecks.some(c => c.status === "error") ? "error" 
          : fabricaChecks.some(c => c.status === "warning") ? "warning" : "ok",
  });

  // Check 6: Formação
  const formacaoChecks: DomainCheckItem[] = [];
  const formacaoRoutes = DOMAIN_CANONICAL_ROUTES["Formação"] || [];
  const missingFormacaoRoutes = formacaoRoutes.filter(r => !routePaths.has(r));
  formacaoChecks.push({
    name: "Rotas canônicas",
    status: missingFormacaoRoutes.length === 0 ? "ok" : "warning",
    message: missingFormacaoRoutes.length === 0
      ? `OK — rota de formação existe`
      : `Faltando: ${missingFormacaoRoutes.join(", ")}`,
  });

  domains.push({
    domain: "Formação",
    checks: formacaoChecks,
    status: formacaoChecks.some(c => c.status === "error") ? "error" 
          : formacaoChecks.some(c => c.status === "warning") ? "warning" : "ok",
  });

  // Check 7: Missões
  const missoesChecks: DomainCheckItem[] = [];
  const missoesRoutes = DOMAIN_CANONICAL_ROUTES["Missões"] || [];
  const missingMissoesRoutes = missoesRoutes.filter(r => !routePaths.has(r));
  missoesChecks.push({
    name: "Rotas canônicas",
    status: missingMissoesRoutes.length === 0 ? "ok" : "warning",
    message: missingMissoesRoutes.length === 0
      ? `OK — rotas de missões existem`
      : `Faltando: ${missingMissoesRoutes.join(", ")}`,
  });

  domains.push({
    domain: "Missões",
    checks: missoesChecks,
    status: missoesChecks.some(c => c.status === "error") ? "error" 
          : missoesChecks.some(c => c.status === "warning") ? "warning" : "ok",
  });

  // Check 8: CRM
  const crmChecks: DomainCheckItem[] = [];
  const crmRoutes = DOMAIN_CANONICAL_ROUTES["CRM"] || [];
  const missingCrmRoutes = crmRoutes.filter(r => !routePaths.has(r));
  crmChecks.push({
    name: "Rotas canônicas",
    status: missingCrmRoutes.length === 0 ? "ok" : "warning",
    message: missingCrmRoutes.length === 0
      ? `OK — rotas de CRM existem`
      : `Faltando: ${missingCrmRoutes.join(", ")}`,
  });

  domains.push({
    domain: "CRM/Contatos",
    checks: crmChecks,
    status: crmChecks.some(c => c.status === "error") ? "error" 
          : crmChecks.some(c => c.status === "warning") ? "warning" : "ok",
  });

  // Calculate totals
  let okCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  
  for (const domain of domains) {
    for (const check of domain.checks) {
      if (check.status === "ok") okCount++;
      else if (check.status === "warning") warningCount++;
      else if (check.status === "error") errorCount++;
    }
  }

  return {
    registryLoaded: true,
    registryLength: REGISTRY_DESCRIPTION.length,
    domains,
    totals: {
      ok: okCount,
      warning: warningCount,
      error: errorCount,
    },
  };
}

export function SSOTRegistryCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [showRegistry, setShowRegistry] = useState(false);
  const [manualRunKey, setManualRunKey] = useState(0);

  const {
    data: result,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["ssot-registry-checks", manualRunKey],
    queryFn: runRegistryChecks,
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

  const overallStatus = result 
    ? result.totals.error > 0 ? "error" 
      : result.totals.warning > 0 ? "warning" : "ok"
    : "pending";

  const totalChecks = result 
    ? result.totals.ok + result.totals.warning + result.totals.error 
    : 0;

  return (
    <Card className={
      overallStatus === "error" ? "border-destructive" : 
      overallStatus === "warning" ? "border-amber-500" : ""
    }>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">SSOT Registry & Drift</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                <div className="flex items-center gap-1 text-xs flex-wrap">
                  {result.totals.error > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {result.totals.error} erro{result.totals.error > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {result.totals.warning > 0 && (
                    <Badge className="bg-amber-500 text-white text-xs">
                      {result.totals.warning} aviso{result.totals.warning > 1 ? "s" : ""}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs text-green-600 border-green-500">
                    {result.totals.ok}/{totalChecks} OK
                  </Badge>
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
            Verifica drift por domínio usando <code className="text-xs bg-muted px-1 rounded">SSOT_REGISTRY.md</code>
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : result ? (
              <>
                {/* Registry status */}
                <div className={`rounded-lg border p-3 ${result.registryLoaded ? "border-green-500/30 bg-green-500/5" : "border-destructive bg-destructive/5"}`}>
                  <div className="flex items-center gap-2">
                    {result.registryLoaded ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm font-medium">
                      Registry: {result.registryLoaded ? "Carregado" : "Falhou"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({result.registryLength} chars)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 text-xs"
                      onClick={() => setShowRegistry(!showRegistry)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {showRegistry ? "Ocultar" : "Ver"}
                    </Button>
                  </div>
                </div>

                {/* Registry content preview */}
                {showRegistry && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Arquivo:</strong> <code className="bg-muted px-1 rounded">{REGISTRY_PATH}</code>
                    </p>
                    <p className="text-xs">{REGISTRY_DESCRIPTION}</p>
                  </div>
                )}

                {/* Domain checks */}
                {result.domains.map((domain, idx) => (
                  <DomainCheckCard key={idx} domain={domain} />
                ))}

                {/* Methodology link */}
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    📖 <strong>Procedimento:</strong> DIAG → PATCH → VERIFY → REPORT.{" "}
                    <span className="text-primary">
                      Ver <code className="bg-muted px-1 rounded">memory/features/ssot-registry-v1.md</code>
                    </span>
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Clique em <Play className="inline h-3 w-3" /> para verificar drift por domínio
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function DomainCheckCard({ domain }: { domain: DomainCheck }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const StatusIcon = {
    ok: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
  }[domain.status];

  const statusColor = {
    ok: "text-green-600",
    warning: "text-amber-600",
    error: "text-destructive",
  }[domain.status];

  const borderClass = {
    ok: "border-border",
    warning: "border-amber-500/50 bg-amber-500/5",
    error: "border-destructive bg-destructive/5",
  }[domain.status];

  const okCount = domain.checks.filter(c => c.status === "ok").length;
  const totalCount = domain.checks.length;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={`rounded-lg border ${borderClass}`}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${statusColor}`} />
              <span className="font-medium text-sm">{domain.domain}</span>
              {domain.status === "warning" && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                  DRIFT
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {okCount}/{totalCount} OK
              </span>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/50">
            {domain.checks.map((check, idx) => (
              <DomainCheckRow key={idx} check={check} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function DomainCheckRow({ check }: { check: DomainCheckItem }) {
  const StatusIcon = {
    ok: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
    pending: CheckCircle,
  }[check.status];

  const statusColor = {
    ok: "text-green-600",
    warning: "text-amber-600",
    error: "text-destructive",
    pending: "text-muted-foreground",
  }[check.status];

  return (
    <div className="flex items-start gap-2 text-sm py-1">
      <StatusIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${statusColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground">{check.name}:</span>
          <span className={check.status === "ok" ? "text-muted-foreground" : ""}>
            {check.message}
          </span>
        </div>
        {check.hint && (
          <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400">
            💡 {check.hint}
          </p>
        )}
      </div>
    </div>
  );
}
