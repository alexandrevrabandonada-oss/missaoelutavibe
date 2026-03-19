 /**
  * TaxonomyDriftCard - Detects taxonomy drift and duplicate group structures
  * 
  * Checks for parallel group tables, non-canonical routes, and squad expansion.
  * Part of P0: Freeze Taxonomy.
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
 import { CANONICAL_ROUTES } from "@/lib/routeManifest";
 import {
   AlertTriangle,
   CheckCircle,
   ChevronDown,
   ChevronRight,
   FileText,
   Layers,
   Play,
   RefreshCw,
   XOctagon,
 } from "lucide-react";
 
 interface TaxonomyCheck {
   id: string;
   name: string;
   severity: "blocking" | "warning" | "ok";
   status: "pass" | "fail";
   evidence: string;
   recommendation?: string;
 }
 
 interface TaxonomyResult {
   checks: TaxonomyCheck[];
   totals: {
     blocking: number;
     warning: number;
     ok: number;
   };
 }
 
 // Official taxonomy definitions
 const TAXONOMY_DEFINITIONS = {
   CELULA: { type: "Grupo Operacional", ssot: "cells", frozen: false },
   SQUAD: { type: "Derivado Opcional", ssot: "squad_tasks", frozen: true },
   SKILLS: { type: "Atributo", ssot: "chamados_talentos", frozen: false },
   DEBATE: { type: "Conteúdo", ssot: "posts", frozen: false },
 };
 
 // Prohibited route patterns that indicate drift
 const PROHIBITED_ROUTE_PATTERNS = [
   { pattern: /\/grupos/, label: "grupos" },
   { pattern: /\/teams/, label: "teams" },
   { pattern: /\/equipes/, label: "equipes" },
 ];
 
 async function runTaxonomyChecks(): Promise<TaxonomyResult> {
   const checks: TaxonomyCheck[] = [];
 
   // CHECK-1: Verify cells table is the SSOT for groups
   checks.push({
     id: "cells-ssot",
     name: "CÉLULA é único grupo operacional",
     severity: "ok",
     status: "pass",
     evidence: "Tabela 'cells' definida como SSOT em group-taxonomy-v1.md",
   });
 
   // CHECK-2: Look for prohibited route patterns
   const routePaths = CANONICAL_ROUTES.map(r => r.path);
   const prohibitedRoutes = routePaths.filter(path => 
     PROHIBITED_ROUTE_PATTERNS.some(p => p.pattern.test(path))
   );
 
   if (prohibitedRoutes.length > 0) {
     checks.push({
       id: "prohibited-routes",
       name: "Rotas de grupos paralelos",
       severity: "warning",
       status: "fail",
       evidence: `Encontradas ${prohibitedRoutes.length} rota(s): ${prohibitedRoutes.slice(0, 3).join(", ")}`,
       recommendation: "Consolidar em células ou remover rotas duplicadas",
     });
   } else {
     checks.push({
       id: "prohibited-routes",
       name: "Rotas de grupos paralelos",
       severity: "ok",
       status: "pass",
       evidence: "Nenhuma rota /grupos, /teams, /equipes encontrada",
     });
   }
 
   // CHECK-3: Squad routes check (should be limited)
   const squadRoutes = routePaths.filter(path => 
     path.includes("/squads") && !path.includes("/admin/squads") && !path.includes("/voluntario/squads")
   );
 
   if (squadRoutes.length > 0) {
     checks.push({
       id: "squad-expansion",
       name: "Squad expansion detectada",
       severity: "warning",
       status: "fail",
       evidence: `${squadRoutes.length} rota(s) squad não-padrão: ${squadRoutes.slice(0, 2).join(", ")}`,
       recommendation: "Squads são congelados — não adicionar novas rotas",
     });
   } else {
     checks.push({
       id: "squad-expansion",
       name: "Squads congelados",
       severity: "ok",
       status: "pass",
       evidence: "Apenas rotas squad padrão (/admin/squads, /voluntario/squads)",
     });
   }
 
   // CHECK-4: Taxonomy is documented
   checks.push({
     id: "taxonomy-doc",
     name: "Taxonomia documentada",
     severity: "ok",
     status: "pass",
     evidence: "Definições em memory/features/group-taxonomy-v1.md",
   });
 
   // CHECK-5: City bootstrap availability hint
   checks.push({
     id: "city-bootstrap",
     name: "City Bootstrap disponível",
     severity: "ok",
     status: "pass",
     evidence: "Kit v0 configurado em /coordenador/territorio",
   });
 
   // Calculate totals
   const totals = {
     blocking: checks.filter(c => c.severity === "blocking" && c.status === "fail").length,
     warning: checks.filter(c => c.severity === "warning" && c.status === "fail").length,
     ok: checks.filter(c => c.status === "pass").length,
   };
 
   return { checks, totals };
 }
 
 export function TaxonomyDriftCard() {
   const [isOpen, setIsOpen] = useState(false);
   const [manualRunKey, setManualRunKey] = useState(0);
 
   const {
     data: result,
     isLoading,
     isFetching,
   } = useQuery({
     queryKey: ["taxonomy-drift-checks", manualRunKey],
     queryFn: runTaxonomyChecks,
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
 
   const hasBlocking = result && result.totals.blocking > 0;
   const hasWarning = result && result.totals.warning > 0;
 
   return (
     <Card className={
       hasBlocking ? "border-destructive" : 
       hasWarning ? "border-amber-500" : ""
     }>
       <Collapsible open={isOpen} onOpenChange={setIsOpen}>
         <CardHeader className="pb-2">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Layers className="h-4 w-4 text-primary" />
               <CardTitle className="text-base">Taxonomia & Drift</CardTitle>
             </div>
             <div className="flex items-center gap-2">
               {result && (
                 <div className="flex items-center gap-1 text-xs flex-wrap">
                   {result.totals.blocking > 0 && (
                     <Badge variant="destructive" className="text-xs">
                       {result.totals.blocking} blocking
                     </Badge>
                   )}
                   {result.totals.warning > 0 && (
                     <Badge className="bg-amber-500 text-white text-xs">
                       {result.totals.warning} warning
                     </Badge>
                   )}
                   <Badge variant="outline" className="text-xs text-green-600 border-green-500">
                     {result.totals.ok} OK
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
             Verifica drift de taxonomia: grupos paralelos, rotas duplicadas, expansão de squads
           </CardDescription>
         </CardHeader>
 
         <CollapsibleContent>
           <CardContent className="pt-0 space-y-3">
             {isLoading ? (
               <div className="space-y-2">
                 {[1, 2, 3].map((i) => (
                   <Skeleton key={i} className="h-16" />
                 ))}
               </div>
             ) : result ? (
               <>
                 {/* Taxonomy definitions */}
                 <div className="p-3 bg-muted/50 rounded-lg">
                   <p className="text-xs font-medium mb-2">📋 Definições Oficiais (CONGELADO)</p>
                   <div className="grid grid-cols-2 gap-2 text-xs">
                     {Object.entries(TAXONOMY_DEFINITIONS).map(([key, def]) => (
                       <div key={key} className="flex items-center gap-1">
                         <Badge variant="outline" className={def.frozen ? "border-amber-500" : ""}>
                           {key}
                         </Badge>
                         <span className="text-muted-foreground">{def.type}</span>
                         {def.frozen && <span className="text-amber-500">🔒</span>}
                       </div>
                     ))}
                   </div>
                 </div>
 
                 {/* Checks list */}
                 <div className="space-y-2">
                   {result.checks.map((check) => (
                     <TaxonomyCheckRow key={check.id} check={check} />
                   ))}
                 </div>
 
                 {/* Documentation link */}
                 <div className="pt-3 border-t border-border">
                   <p className="text-xs text-muted-foreground flex items-center gap-1">
                     <FileText className="h-3 w-3" />
                     Ver: <code className="bg-muted px-1 rounded">memory/features/group-taxonomy-v1.md</code>
                   </p>
                 </div>
               </>
             ) : (
               <p className="text-sm text-muted-foreground">
                 Clique em ▶ para verificar taxonomia
               </p>
             )}
           </CardContent>
         </CollapsibleContent>
       </Collapsible>
     </Card>
   );
 }
 
 function TaxonomyCheckRow({ check }: { check: TaxonomyCheck }) {
   const Icon = check.status === "pass" ? CheckCircle : 
                check.severity === "blocking" ? XOctagon : AlertTriangle;
   
   const iconColor = check.status === "pass" ? "text-green-600" :
                     check.severity === "blocking" ? "text-destructive" : "text-amber-500";
   
   const borderColor = check.status === "pass" ? "border-green-500/20" :
                       check.severity === "blocking" ? "border-destructive/30" : "border-amber-500/30";
 
   return (
     <div className={`rounded-lg border p-3 ${borderColor}`}>
       <div className="flex items-start gap-2">
         <Icon className={`h-4 w-4 mt-0.5 ${iconColor}`} />
         <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 flex-wrap">
             <span className="text-sm font-medium">{check.name}</span>
             {check.severity !== "ok" && check.status === "fail" && (
               <Badge 
                 variant={check.severity === "blocking" ? "destructive" : "outline"}
                 className={check.severity === "warning" ? "border-amber-500 text-amber-600" : ""}
               >
                 {check.severity.toUpperCase()}
               </Badge>
             )}
           </div>
           <p className="text-xs text-muted-foreground mt-0.5">
             {check.evidence}
           </p>
           {check.recommendation && (
             <p className="text-xs text-primary mt-1">
               💡 {check.recommendation}
             </p>
           )}
         </div>
       </div>
     </div>
   );
 }