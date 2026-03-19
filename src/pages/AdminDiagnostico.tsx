import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { generateCodebaseMap, mapToCSV, CodebaseMap, ModuleType } from "@/lib/codebaseMap";
import { generateRouteManifest, manifestToJSON, RouteManifest, RouteEntry, LegacyRouteInfo } from "@/lib/routeManifest";
import { 
  CONTRACT_CONTENT, 
  REQUIRED_RULE_FRAGMENTS, 
  REQUIRED_CANONICAL_ROUTES, 
  REQUIRED_LEGACY_REDIRECTS,
  PROHIBITED_ROUTE_PREFIXES,
} from "@/lib/contractContent";
import { CellOpsKPICard } from "@/components/admin/CellOpsKPICard";
import { CellGeralHealthCard } from "@/components/admin/CellGeralHealthCard";
import { EnvironmentFingerprintCard } from "@/components/admin/EnvironmentFingerprintCard";
import { StatusFlowCard } from "@/components/admin/StatusFlowCard";
import { CoordinationHealthCard } from "@/components/admin/CoordinationHealthCard";
import { DbDoctorCard } from "@/components/admin/DbDoctorCard";
import { SSOTDriftCard } from "@/components/admin/SSOTDriftCard";
import { MissionCatalogHygieneCard } from "@/components/admin/MissionCatalogHygieneCard";
import { SSOTEnforcementCard } from "@/components/admin/SSOTEnforcementCard";
import { SSOTRegistryCard } from "@/components/admin/SSOTRegistryCard";
import { TaxonomyDriftCard } from "@/components/admin/TaxonomyDriftCard";
import { BaseSeedCheckCard } from "@/components/admin/BaseSeedCheckCard";
import { NavScopeDriftCard } from "@/components/admin/NavScopeDriftCard";
import { PilotTestChecklistCard } from "@/components/admin/PilotTestChecklistCard";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Logo } from "@/components/ui/Logo";
import {
  ArrowLeft,
  Play,
  Download,
  Copy,
  Search,
  FileCode,
  Layers,
  Puzzle,
  Zap,
  Library,
  AlertTriangle,
  CheckCircle,
  Clipboard,
  Route,
  ArrowRight,
  ExternalLink,
  FileText,
  Shield,
  ChevronDown,
  ChevronRight,
  Target,
} from "lucide-react";
import { toast } from "sonner";

const AREA_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "admin", label: "Admin" },
  { value: "coord", label: "Coordenador" },
  { value: "voluntario", label: "Voluntário" },
  { value: "convites", label: "Convites" },
  { value: "fabrica", label: "Fábrica" },
  { value: "formacao", label: "Formação" },
  { value: "debates", label: "Debates" },
  { value: "publico", label: "Público" },
];

function ModuleIcon({ type }: { type: ModuleType }) {
  switch (type) {
    case "page":
      return <FileCode className="h-4 w-4 text-primary" />;
    case "hook":
      return <Puzzle className="h-4 w-4 text-blue-500" />;
    case "component":
      return <Layers className="h-4 w-4 text-green-500" />;
    case "edge-function":
      return <Zap className="h-4 w-4 text-yellow-500" />;
    case "lib":
      return <Library className="h-4 w-4 text-purple-500" />;
    default:
      return null;
  }
}

export default function AdminDiagnostico() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const [codebaseMap, setCodebaseMap] = useState<CodebaseMap | null>(null);
  const [routeManifest, setRouteManifest] = useState<RouteManifest | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [activeTab, setActiveTab] = useState("routes");

  // Run diagnostic
  const runDiagnostic = () => {
    setIsRunning(true);
    try {
      const map = generateCodebaseMap();
      const manifest = generateRouteManifest();
      setCodebaseMap(map);
      setRouteManifest(manifest);
      console.log("🔍 Codebase Map:", map);
      console.log("🛤️ Route Manifest:", manifest);
      toast.success(`Diagnóstico concluído: ${manifest.counts.total} rotas, ${map.counts.total} módulos`);
    } catch (error) {
      console.error("Diagnostic error:", error);
      toast.error("Erro ao executar diagnóstico");
    } finally {
      setIsRunning(false);
    }
  };

  // Filter modules
  const filterModules = useMemo(() => {
    if (!codebaseMap) return null;
    
    const filter = (modules: typeof codebaseMap.pages) => {
      return modules.filter(m => {
        const matchesSearch = !searchQuery || 
          m.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.route?.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesArea = !areaFilter || m.area === areaFilter;
        return matchesSearch && matchesArea;
      });
    };

    return {
      pages: filter(codebaseMap.pages),
      hooks: filter(codebaseMap.hooks),
      components: filter(codebaseMap.components),
      edgeFunctions: filter(codebaseMap.edgeFunctions),
      libs: filter(codebaseMap.libs),
    };
  }, [codebaseMap, searchQuery, areaFilter]);

  // Filter routes
  const filterRoutes = useMemo(() => {
    if (!routeManifest) return null;
    
    const filter = (routes: RouteEntry[]) => {
      return routes.filter(r => {
        const matchesSearch = !searchQuery || 
          r.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.component.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesArea = !areaFilter || r.area === areaFilter;
        return matchesSearch && matchesArea;
      });
    };

    return {
      routes: filter(routeManifest.routes),
      redirects: filter(routeManifest.redirects),
    };
  }, [routeManifest, searchQuery, areaFilter]);

  // Export CSV
  const exportCSV = () => {
    if (!codebaseMap) return;
    const csv = mapToCSV(codebaseMap);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codebase-map-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  // Copy JSON (codebase)
  const copyCodebaseJSON = () => {
    if (!codebaseMap) return;
    navigator.clipboard.writeText(JSON.stringify(codebaseMap, null, 2));
    toast.success("JSON do codebase copiado!");
  };

  // Copy JSON (routes)
  const copyRoutesJSON = () => {
    if (!routeManifest) return;
    navigator.clipboard.writeText(manifestToJSON(routeManifest));
    toast.success("JSON das rotas copiado!");
  };

  // Download routes JSON
  const downloadRoutesJSON = () => {
    if (!routeManifest) return;
    const json = manifestToJSON(routeManifest);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `route-manifest-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exportado!");
  };

  // Copy route
  const copyRoute = (route: string) => {
    navigator.clipboard.writeText(route);
    toast.success("Rota copiada!");
  };

  // Navigate to route
  const goToRoute = (path: string) => {
    if (path.includes(':')) {
      toast.info("Rota com parâmetros - não pode navegar diretamente");
      return;
    }
    navigate(path);
  };

  if (rolesLoading) {
    return <FullPageLoader text="Verificando permissões..." />;
  }

  if (!isAdmin()) {
    navigate("/admin");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/coordenador/hoje")}>
            <Target className="h-4 w-4 mr-2" />
            Ir para Coordenação
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <div className="space-y-6 animate-slide-up">
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Route className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider font-bold">Diagnóstico</span>
            </div>
            <h1 className="text-2xl font-bold">Route Manifest & Codebase Map</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rotas canônicas do router + análise estática de módulos
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={runDiagnostic} disabled={isRunning}>
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? "Rodando..." : "Rodar DIAG"}
            </Button>

            <Button variant="outline" onClick={async () => {
              try {
                const { supabase } = await import("@/integrations/supabase/client");
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) { toast.error("Faça login primeiro"); return; }
                const resp = await supabase.functions.invoke("schema-dump", {
                  method: "GET",
                });
                if (resp.error) { toast.error("Erro: " + resp.error.message); return; }
                const blob = new Blob([resp.data], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `schema_dump_${new Date().toISOString().split("T")[0]}.sql`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Schema SQL exportado!");
              } catch (e: any) {
                toast.error("Erro ao exportar schema: " + e.message);
              }
            }}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Schema SQL
            </Button>
            
            {routeManifest && (
              <>
                <Button variant="outline" onClick={copyRoutesJSON}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Rotas JSON
                </Button>
                <Button variant="outline" onClick={downloadRoutesJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Rotas JSON
                </Button>
              </>
            )}
            
            {codebaseMap && (
              <>
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button variant="outline" onClick={copyCodebaseJSON}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Codebase JSON
                </Button>
              </>
            )}
          </div>

          {/* Summary Cards */}
          {routeManifest && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Route className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{routeManifest.counts.pages}</p>
                  <p className="text-xs text-muted-foreground">Rotas Canônicas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <ArrowRight className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{routeManifest.counts.redirects}</p>
                  <p className="text-xs text-muted-foreground">Redirects</p>
                </CardContent>
              </Card>
              <Card className="border-yellow-500">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">{routeManifest.counts.legacyRedirects}</p>
                  <p className="text-xs text-muted-foreground">Legados</p>
                </CardContent>
              </Card>
              <Card className={routeManifest.counts.conflicts > 0 ? "border-destructive" : "border-green-500"}>
                <CardContent className="p-4 text-center">
                  {routeManifest.counts.conflicts > 0 ? (
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                  ) : (
                    <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  )}
                  <p className="text-2xl font-bold">{routeManifest.counts.conflicts}</p>
                  <p className="text-xs text-muted-foreground">Conflitos</p>
                </CardContent>
              </Card>
              {codebaseMap && (
                <Card>
                  <CardContent className="p-4 text-center">
                    <FileCode className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold">{codebaseMap.counts.total}</p>
                    <p className="text-xs text-muted-foreground">Módulos Total</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Environment Fingerprint */}
          <EnvironmentFingerprintCard />

          {/* Status Flow */}
          <StatusFlowCard />

          {/* DB Doctor */}
          <DbDoctorCard />

          {/* Contrato do App Section */}
          <AppContractCard routeManifest={routeManifest} />

          {/* SSOT Enforcement (actionable drift) */}
          <SSOTEnforcementCard />

          {/* Taxonomy & Drift Detection (P0) */}
          <TaxonomyDriftCard />

          {/* NavScope Drift Detection (P4) */}
          <NavScopeDriftCard />

          {/* Base Seed Check */}
          <BaseSeedCheckCard />

          {/* Pilot Test Checklist */}
          <PilotTestChecklistCard />

          {/* Mission Catalog Hygiene */}
          <MissionCatalogHygieneCard />

          {/* SSOT Registry & Drift Detection */}
          <SSOTRegistryCard />

          {/* SSOT Drift Detection (legacy roles) */}
          <SSOTDriftCard />

          {/* Coordination Health */}
          <CoordinationHealthCard />

          {/* Cell Ops KPIs */}
          <CellOpsKPICard />

          {/* Cell Geral Health Check */}
          <CellGeralHealthCard />

          {/* Route Conflicts Warning */}
          {routeManifest && routeManifest.conflicts.length > 0 && (
            <Card className="border-destructive bg-destructive/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  ⚠️ Conflitos de Rota Detectados
                </CardTitle>
                <CardDescription>
                  Rotas duplicadas ou similares podem causar comportamento inesperado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Path</TableHead>
                      <TableHead>Componentes</TableHead>
                      <TableHead>Razão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routeManifest.conflicts.map((conflict, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{conflict.path}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {conflict.entries.map((e, i) => (
                              <Badge key={i} variant="outline">{e.component}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {conflict.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          {(routeManifest || codebaseMap) && (
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por rota, componente ou arquivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {AREA_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={areaFilter === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAreaFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Main Tabs */}
          {(routeManifest || codebaseMap) && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="routes" className="text-xs">
                  <Route className="h-3 w-3 mr-1" />
                  Rotas ({filterRoutes?.routes.length || 0})
                </TabsTrigger>
                <TabsTrigger value="redirects" className="text-xs">
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Redirects ({filterRoutes?.redirects.length || 0})
                </TabsTrigger>
                <TabsTrigger value="legacy" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Legados ({routeManifest?.legacyRoutes.length || 0})
                </TabsTrigger>
                <TabsTrigger value="modules" className="text-xs">
                  <Layers className="h-3 w-3 mr-1" />
                  Módulos ({codebaseMap?.counts.total || 0})
                </TabsTrigger>
              </TabsList>

              {/* Canonical Routes Tab */}
              <TabsContent value="routes">
                {filterRoutes && filterRoutes.routes.length > 0 ? (
                  <RouteTable 
                    routes={filterRoutes.routes} 
                    onCopy={copyRoute}
                    onNavigate={goToRoute}
                  />
                ) : (
                  <EmptyState message="Nenhuma rota encontrada" />
                )}
              </TabsContent>

              {/* Redirects Tab */}
              <TabsContent value="redirects">
                {filterRoutes && filterRoutes.redirects.length > 0 ? (
                  <RedirectTable 
                    routes={filterRoutes.redirects} 
                    onCopy={copyRoute}
                  />
                ) : (
                  <EmptyState message="Nenhum redirect encontrado" />
                )}
              </TabsContent>

              {/* Legacy Routes Tab */}
              <TabsContent value="legacy">
                {routeManifest && routeManifest.legacyRoutes.length > 0 ? (
                  <LegacyRoutesTable legacyRoutes={routeManifest.legacyRoutes} />
                ) : (
                  <EmptyState message="Nenhuma rota legada configurada" />
                )}
              </TabsContent>

              {/* Modules Tab */}
              <TabsContent value="modules">
                {codebaseMap && filterModules ? (
                  <Tabs defaultValue="pages" className="w-full">
                    <TabsList className="w-full grid grid-cols-5">
                      <TabsTrigger value="pages" className="text-xs">
                        Pages ({filterModules.pages.length})
                      </TabsTrigger>
                      <TabsTrigger value="hooks" className="text-xs">
                        Hooks ({filterModules.hooks.length})
                      </TabsTrigger>
                      <TabsTrigger value="components" className="text-xs">
                        Components ({filterModules.components.length})
                      </TabsTrigger>
                      <TabsTrigger value="edge" className="text-xs">
                        Edge ({filterModules.edgeFunctions.length})
                      </TabsTrigger>
                      <TabsTrigger value="libs" className="text-xs">
                        Libs ({filterModules.libs.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pages">
                      <ModuleTable modules={filterModules.pages} onCopyRoute={copyRoute} showRoute />
                    </TabsContent>
                    <TabsContent value="hooks">
                      <ModuleTable modules={filterModules.hooks} onCopyRoute={copyRoute} />
                    </TabsContent>
                    <TabsContent value="components">
                      <ModuleTable modules={filterModules.components} onCopyRoute={copyRoute} />
                    </TabsContent>
                    <TabsContent value="edge">
                      <ModuleTable modules={filterModules.edgeFunctions} onCopyRoute={copyRoute} showRoute />
                    </TabsContent>
                    <TabsContent value="libs">
                      <ModuleTable modules={filterModules.libs} onCopyRoute={copyRoute} />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <EmptyState message="Execute o diagnóstico para ver os módulos" />
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Empty state */}
          {!routeManifest && !codebaseMap && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Route className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Clique em "Rodar DIAG" para gerar o mapa de rotas e módulos
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

// Route Table Component
function RouteTable({
  routes,
  onCopy,
  onNavigate,
}: {
  routes: RouteEntry[];
  onCopy: (path: string) => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Path</TableHead>
            <TableHead>Componente</TableHead>
            <TableHead className="w-[100px]">Área</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.map((route, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-mono text-xs">{route.path}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {route.component}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {route.area}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {route.description || "-"}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onCopy(route.path)}
                  >
                    <Clipboard className="h-3 w-3" />
                  </Button>
                  {!route.path.includes(':') && route.path !== '*' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onNavigate(route.path)}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Redirect Table Component
function RedirectTable({
  routes,
  onCopy,
}: {
  routes: RouteEntry[];
  onCopy: (path: string) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Path Original</TableHead>
            <TableHead></TableHead>
            <TableHead>Destino</TableHead>
            <TableHead>Componente</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routes.map((route, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-mono text-xs">{route.path}</TableCell>
              <TableCell>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </TableCell>
              <TableCell className="font-mono text-xs text-primary">
                {route.target || "-"}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {route.component}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onCopy(route.path)}
                >
                  <Clipboard className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Legacy Routes Table Component
function LegacyRoutesTable({
  legacyRoutes,
}: {
  legacyRoutes: LegacyRouteInfo[];
}) {
  return (
    <div className="space-y-4">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="font-medium text-yellow-500">Rotas Legadas com Hífen</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Estas rotas usam o formato antigo (com hífen) e redirecionam automaticamente 
          para as rotas canônicas (com barra). Use sempre as rotas canônicas em links internos.
        </p>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rota Legada (obsoleta)</TableHead>
              <TableHead></TableHead>
              <TableHead>Rota Canônica (usar esta)</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {legacyRoutes.map((route, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono text-xs text-muted-foreground line-through">
                  {route.from}
                </TableCell>
                <TableCell>
                  <ArrowRight className="h-4 w-4 text-green-500" />
                </TableCell>
                <TableCell className="font-mono text-xs text-primary font-medium">
                  {route.to}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
                    redirect
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Module Table Component
function ModuleTable({
  modules,
  onCopyRoute,
  showRoute = false,
}: {
  modules: Array<{ type: ModuleType; file: string; route?: string; area: string }>;
  onCopyRoute: (route: string) => void;
  showRoute?: boolean;
}) {
  if (modules.length === 0) {
    return <EmptyState message="Nenhum módulo encontrado com os filtros atuais" />;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Tipo</TableHead>
            {showRoute && <TableHead>Rota</TableHead>}
            <TableHead>Arquivo</TableHead>
            <TableHead className="w-[100px]">Área</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((mod, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <ModuleIcon type={mod.type} />
              </TableCell>
              {showRoute && (
                <TableCell className="font-mono text-xs">{mod.route || "-"}</TableCell>
              )}
              <TableCell className="font-mono text-xs max-w-[300px] truncate">
                {mod.file}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {mod.area}
                </Badge>
              </TableCell>
              <TableCell>
                {mod.route && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onCopyRoute(mod.route!)}
                  >
                    <Clipboard className="h-3 w-3" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Empty State Component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground border rounded-lg">
      {message}
    </div>
  );
}

// App Contract Card Component
function AppContractCard({ routeManifest }: { routeManifest: RouteManifest | null }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const contractChecks = useMemo(() => {
    const checks: Array<{ label: string; ok: boolean; detail: string; hint?: string }> = [];
    
    // Check 1: Contract loaded
    const contractLoaded = CONTRACT_CONTENT && CONTRACT_CONTENT.length > 100;
    checks.push({
      label: "Contrato carregou",
      ok: contractLoaded,
      detail: contractLoaded 
        ? `${CONTRACT_CONTENT.length} caracteres` 
        : "Arquivo vazio ou não encontrado",
      hint: !contractLoaded ? "Verificar importação de memory/LOVABLE_CONTRATO.md" : undefined,
    });

    // Check 2: Frozen rules present
    const missingRules = REQUIRED_RULE_FRAGMENTS.filter(
      fragment => !CONTRACT_CONTENT.includes(fragment)
    );
    checks.push({
      label: "Regras congeladas presentes",
      ok: missingRules.length === 0,
      detail: missingRules.length === 0 
        ? `7/7 regras encontradas` 
        : `Faltando ${missingRules.length}: ${missingRules.slice(0, 2).join(", ")}${missingRules.length > 2 ? "..." : ""}`,
      hint: missingRules.length > 0 ? "Restaurar regra faltante no contrato" : undefined,
    });

    // Check 3: Canonical routes exist
    if (routeManifest) {
      const existingPaths = new Set(routeManifest.routes.map(r => r.path));
      const missingRoutes = REQUIRED_CANONICAL_ROUTES.filter(r => !existingPaths.has(r));
      checks.push({
        label: "Rotas canônicas mínimas existem",
        ok: missingRoutes.length === 0,
        detail: missingRoutes.length === 0 
          ? `${REQUIRED_CANONICAL_ROUTES.length}/${REQUIRED_CANONICAL_ROUTES.length} presentes` 
          : `Faltando: ${missingRoutes.join(", ")}`,
        hint: missingRoutes.length > 0 ? "Adicionar rota no routeManifest.ts" : undefined,
      });
    }

    // Check 4: Legacy redirects exist
    if (routeManifest) {
      const legacySet = new Set(
        routeManifest.legacyRoutes.map(l => `${l.from}→${l.to}`)
      );
      const missingRedirects = REQUIRED_LEGACY_REDIRECTS.filter(
        r => !legacySet.has(`${r.from}→${r.to}`)
      );
      checks.push({
        label: "Redirects legados críticos existem",
        ok: missingRedirects.length === 0,
        detail: missingRedirects.length === 0 
          ? `${REQUIRED_LEGACY_REDIRECTS.length}/${REQUIRED_LEGACY_REDIRECTS.length} configurados` 
          : `Faltando: ${missingRedirects.map(r => r.from).join(", ")}`,
        hint: missingRedirects.length > 0 ? "Adicionar em LEGACY_ROUTE_MAP" : undefined,
      });
    }

    // Check 5: No prohibited routes (hyphenated prefixes as real routes)
    if (routeManifest) {
      const prohibitedRoutes = routeManifest.routes.filter(r => 
        PROHIBITED_ROUTE_PREFIXES.some(prefix => r.path.startsWith(prefix))
      );
      checks.push({
        label: "Sem rotas proibidas com hífen",
        ok: prohibitedRoutes.length === 0,
        detail: prohibitedRoutes.length === 0 
          ? "Nenhuma rota com prefixo proibido" 
          : `${prohibitedRoutes.length} rota(s): ${prohibitedRoutes.map(r => r.path).slice(0, 2).join(", ")}`,
        hint: prohibitedRoutes.length > 0 ? "Renomear para formato canônico (com barra)" : undefined,
      });
    }

    // Check 6: No route conflicts
    if (routeManifest) {
      checks.push({
        label: "Sem conflitos de rota",
        ok: routeManifest.counts.conflicts === 0,
        detail: routeManifest.counts.conflicts === 0 
          ? "Nenhum conflito detectado" 
          : `${routeManifest.counts.conflicts} conflito(s)`,
        hint: routeManifest.counts.conflicts > 0 ? "Resolver duplicatas no routeManifest" : undefined,
      });
    }

    return checks;
  }, [routeManifest]);

  const allOk = contractChecks.every(c => c.ok);
  const failCount = contractChecks.filter(c => !c.ok).length;

  return (
    <Card className={allOk ? "border-green-500/50" : "border-yellow-500/50"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Contrato do App</CardTitle>
          </div>
          {allOk ? (
            <Badge variant="outline" className="border-green-500/50 text-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conforme
            </Badge>
          ) : (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {failCount} pendência(s)
            </Badge>
          )}
        </div>
        <CardDescription className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>Fonte única de verdade: <code className="text-xs bg-muted px-1 py-0.5 rounded">memory/LOVABLE_CONTRATO.md</code></span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checklist */}
        <ul className="space-y-2">
          {contractChecks.map((check, idx) => (
            <li key={idx} className="text-sm">
              <div className="flex items-start gap-2">
                {check.ok ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{check.label}:</span>
                    <span className={check.ok ? "text-muted-foreground" : "text-yellow-500"}>
                      {check.detail}
                    </span>
                  </div>
                  {check.hint && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      💡 {check.hint}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Contract content collapsible */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Ver contrato
              </span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {CONTRACT_CONTENT || "Contrato não carregado"}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Summary note */}
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            📖 <strong>Regras congeladas:</strong> rotas canônicas, fluxo de convite, onboarding obrigatório, 
            cidade/célula, RLS/RPCs protegidas, preferência por reuso, atualização de docs. 
            Consulte o contrato para detalhes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
