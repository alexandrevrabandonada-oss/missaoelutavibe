/**
 * CoordCelulaHub - Hub da coordenação da célula com tabs
 * 
 * F14: URL-driven tabs and status filter.
 * ?tab=visao|missoes|registros
 * ?status=enviado|precisa_ajuste (only applies when tab=registros)
 */

import { useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCelulaStats } from "@/hooks/useCelulaStats";
import { useUserCells } from "@/hooks/useUserCells";
import { useUserRoles } from "@/hooks/useUserRoles";
import { ArrowLeft, ShieldX, SearchX } from "lucide-react";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { CoordCelulaVisao } from "@/components/coordinator/CoordCelulaVisao";
import { CoordCelulaMissoes } from "@/components/coordinator/CoordCelulaMissoes";
import { CoordCelulaRegistros } from "@/components/coordinator/CoordCelulaRegistros";

// ─────────────────────────────────────────────────────────────
// Tab + filter types
// ─────────────────────────────────────────────────────────────

type CoordTab = "visao" | "missoes" | "registros";
const VALID_TABS: CoordTab[] = ["visao", "missoes", "registros"];

// ─────────────────────────────────────────────────────────────
// Access validation
// ─────────────────────────────────────────────────────────────

type ScopeResult = { type: string; cellId: string | null; cidade: string | null; regiao: string | null };

function checkCellAccess(scope: ScopeResult, celulaId: string): boolean {
  if (scope.type === "all") return true;
  if (scope.type === "celula" && scope.cellId === celulaId) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────
// Edge states
// ─────────────────────────────────────────────────────────────

function AccessDeniedState() {
  return (
    <AppShell>
      <div className="p-4 max-w-lg mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-4 rounded-full bg-destructive/10 mb-4">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="heading-luta text-xl mb-2">Sem acesso a esta célula</h1>
        <p className="text-sm text-muted-foreground mb-6">Você não tem permissão para coordenar esta célula.</p>
        <Link to="/coordenador/hoje">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}

function CellNotFoundState() {
  return (
    <AppShell>
      <div className="p-4 max-w-lg mx-auto w-full flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <SearchX className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="heading-luta text-xl mb-2">Célula não encontrada</h1>
        <p className="text-sm text-muted-foreground mb-6">Esta célula não existe ou foi desativada.</p>
        <Link to="/coordenador/hoje">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao painel
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function CoordCelulaHub() {
  const { celulaId } = useParams<{ celulaId: string }>();
  const { getScope, isLoading: isLoadingRoles } = useUserRoles();
  const { userCells, isLoading: isLoadingCells } = useUserCells();
  const { stats, isLoading: isLoadingStats, queue, isQueueLoading } = useCelulaStats(celulaId);

  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven tab
  const tabParam = searchParams.get("tab") ?? "";
  const activeTab: CoordTab = VALID_TABS.includes(tabParam as CoordTab)
    ? (tabParam as CoordTab)
    : "visao";

  // URL-driven status filter (for registros tab)
  const statusParam = searchParams.get("status") ?? undefined;

  const setActiveTab = useCallback(
    (tab: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "visao") {
          next.delete("tab");
        } else {
          next.set("tab", tab);
        }
        // Clear status filter when switching away from registros
        if (tab !== "registros") {
          next.delete("status");
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  /** Navigate to registros tab with a specific status filter */
  const goToRegistrosWithFilter = useCallback(
    (status: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "registros");
        next.set("status", status);
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const scope = getScope();

  if (isLoadingRoles || isLoadingCells) {
    return <FullPageLoader text="Verificando acesso..." />;
  }

  if (!celulaId || !checkCellAccess(scope, celulaId)) {
    return <AccessDeniedState />;
  }

  const cell = userCells.find((c) => c.id === celulaId);
  if (!cell && scope.type !== "all") {
    return <CellNotFoundState />;
  }

  const cellName = cell?.name ?? "Célula";

  return (
    <AppShell>
      <div className="p-4 space-y-4 pb-20 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/coordenador/hoje">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="heading-luta text-xl truncate">{cellName}</h1>
            {cell?.neighborhood && (
              <p className="text-xs text-muted-foreground">
                {cell.neighborhood} — {cell.city}/{cell.state}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            Coordenação
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visao">Visão</TabsTrigger>
            <TabsTrigger value="missoes">Missões</TabsTrigger>
            <TabsTrigger value="registros">Registros</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="mt-4">
            <CoordCelulaVisao
              celulaId={celulaId}
              stats={stats}
              isLoadingStats={isLoadingStats}
              queue={queue}
              isQueueLoading={isQueueLoading}
              onSwitchTab={setActiveTab}
              onGoToRegistrosWithFilter={goToRegistrosWithFilter}
            />
          </TabsContent>

          <TabsContent value="missoes" className="mt-4">
            <CoordCelulaMissoes celulaId={celulaId} />
          </TabsContent>

          <TabsContent value="registros" className="mt-4">
            <CoordCelulaRegistros celulaId={celulaId} initialStatus={statusParam} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
