/**
 * CoordCelulaVisao - Tab "Visão Geral" do hub de coordenação da célula
 * F6.1: Active cycle card with closure flow
 * F8.2: Recent closed cycles with "Editar síntese" + alert integration
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CelulaStats } from "@/hooks/useCelulaStats";
import { useCicloFechamento } from "@/hooks/useCicloFechamento";
import { useCelulaAlerts } from "@/hooks/useCelulaAlerts";
import type { CelulaAlert } from "@/hooks/useCelulaAlerts";
import { FechamentoCicloSheet } from "./FechamentoCicloSheet";
import { EditarSinteseCicloSheet, type CicloParaEditar } from "./EditarSinteseCicloSheet";
import { CelulaAlertCards } from "./CelulaAlertCards";
import { CoordPulseCard } from "./CoordPulseCard";
import { CoordFocusCard } from "./CoordFocusCard";
import {
  Users,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ClipboardList,
  ChevronRight,
  Inbox,
  UserX,
  CalendarDays,
  Lock,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  isLoading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: "default" | "warning" | "success";
  isLoading: boolean;
}) {
  const accentClasses = {
    default: "text-muted-foreground",
    warning: "text-amber-400",
    success: "text-emerald-400",
  };

  return (
    <Card className="card-luta">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted ${accentClasses[accent ?? "default"]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
          {isLoading ? (
            <Skeleton className="h-6 w-12 mt-1" />
          ) : (
            <p className="text-xl font-bold text-foreground">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CoordCelulaVisaoProps {
  celulaId: string;
  stats: CelulaStats | undefined;
  isLoadingStats: boolean;
  queue: Array<{
    id: string;
    resumo: string | null;
    status: string | null;
    created_at: string;
    user_id: string;
    missions: unknown;
  }>;
  isQueueLoading: boolean;
  onSwitchTab?: (tab: string) => void;
  onGoToRegistrosWithFilter?: (status: string) => void;
}

/** Fetch last 4 closed cycles for this cell */
function useRecentClosedCycles(cellId: string | undefined) {
  return useQuery({
    queryKey: ["ciclos-encerrados-recentes", cellId],
    queryFn: async () => {
      if (!cellId) return [];
      const { data, error } = await supabase
        .from("ciclos_semanais")
        .select("id, titulo, inicio, fim, fechamento_json")
        .eq("celula_id", cellId)
        .eq("status", "encerrado")
        .order("fim", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!cellId,
    staleTime: 1000 * 60 * 3,
  });
}

export function CoordCelulaVisao({ celulaId, stats, isLoadingStats, queue, isQueueLoading, onSwitchTab, onGoToRegistrosWithFilter }: CoordCelulaVisaoProps) {
  const hasNoActiveMembers = !isLoadingStats && (stats?.voluntariosAtivos ?? 0) === 0;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editarCiclo, setEditarCiclo] = useState<CicloParaEditar | null>(null);
  const [editarSheetOpen, setEditarSheetOpen] = useState(false);

  const {
    ciclo,
    isLoadingCiclo,
    stats: cicloStats,
    isLoadingStats: isLoadingCicloStats,
    isEligible,
    fecharCiclo,
    isFechando,
  } = useCicloFechamento(celulaId);

  const { data: alerts = [] } = useCelulaAlerts(celulaId);
  const { data: recentClosed = [] } = useRecentClosedCycles(celulaId);

  const openEditSheet = (cicloId: string) => {
    const found = recentClosed.find((c) => c.id === cicloId);
    if (!found) return;
    const fj = found.fechamento_json as any;
    setEditarCiclo({
      id: found.id,
      titulo: found.titulo,
      inicio: found.inicio,
      fim: found.fim,
      resumoAtual: fj?.resumo ?? "",
    });
    setEditarSheetOpen(true);
  };

  const handleAlertAction = (action: string, alert: CelulaAlert) => {
    if (action.startsWith("registros:") && onGoToRegistrosWithFilter) {
      onGoToRegistrosWithFilter(action.split(":")[1]);
    } else if (action === "tab:registros" && onSwitchTab) {
      onSwitchTab("registros");
    } else if (action === "tab:missoes" && onSwitchTab) {
      onSwitchTab("missoes");
    } else if (action === "action:editar_sintese" && alert.meta?.cicloId) {
      openEditSheet(alert.meta.cicloId as string);
    }
  };

  /** Handle pulse card navigation: "registros:enviado", "tab:missoes", etc. */
  const handlePulseNavigate = (action: string) => {
    if (action.startsWith("registros:") && onGoToRegistrosWithFilter) {
      const status = action.split(":")[1];
      onGoToRegistrosWithFilter(status);
    } else if (action.startsWith("tab:") && onSwitchTab) {
      onSwitchTab(action.split(":")[1]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Active cycle card */}
      {isLoadingCiclo ? (
        <Skeleton className="h-20 w-full rounded-lg" />
      ) : ciclo ? (
        <Card className="card-luta border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ciclo ativo</p>
                <p className="text-sm font-semibold text-foreground truncate">{ciclo.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(ciclo.inicio), "dd MMM", { locale: ptBR })} — {format(new Date(ciclo.fim), "dd MMM", { locale: ptBR })}
                </p>
              </div>
              {isEligible ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5 text-xs"
                  onClick={() => setSheetOpen(true)}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Encerrar
                </Button>
              ) : (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  Em andamento
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* F17: Single recommended focus */}
      <CoordFocusCard cellId={celulaId} onNavigate={handlePulseNavigate} />

      {/* Operational alerts */}
      <CelulaAlertCards alerts={alerts} onAction={handleAlertAction} />

      {/* Validation pulse — response time & bottleneck signals */}
      <CoordPulseCard cellId={celulaId} onNavigate={handlePulseNavigate} />

      {/* No active members alert */}
      {hasNoActiveMembers && (
        <Card className="border-muted bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <UserX className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Nenhum voluntário ativo</p>
              <p className="text-xs text-muted-foreground">Aprove membros pendentes ou convide novos voluntários</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Voluntários ativos" value={stats?.voluntariosAtivos ?? 0} isLoading={isLoadingStats} />
        <StatCard icon={Target} label="Missões (7d)" value={stats?.missoesSemana ?? 0} isLoading={isLoadingStats} />
        <StatCard icon={CheckCircle2} label="Validados (7d)" value={stats?.missoesValidadas ?? 0} accent="success" isLoading={isLoadingStats} />
        <StatCard icon={Clock} label="Pendentes" value={stats?.registrosPendentes ?? 0} accent={(stats?.registrosPendentes ?? 0) > 0 ? "warning" : "default"} isLoading={isLoadingStats} />
      </div>

      {/* Needs adjustment alert */}
      {(stats?.registrosPrecisaAjuste ?? 0) > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {stats!.registrosPrecisaAjuste} registro(s) aguardando correção
              </p>
              <p className="text-xs text-muted-foreground">Voluntários precisam reenviar</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent closed cycles — edit synopsis */}
      {recentClosed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Ciclos recentes
          </p>
          {recentClosed.map((c) => {
            const fj = c.fechamento_json as any;
            const hasSintese = fj?.resumo && fj.resumo.trim().length > 0;
            return (
              <button
                key={c.id}
                onClick={() => openEditSheet(c.id)}
                className="w-full flex items-center gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted transition-colors"
              >
                <FileText className={`h-4 w-4 shrink-0 ${hasSintese ? "text-muted-foreground" : "text-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{c.titulo}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(c.inicio), "dd MMM", { locale: ptBR })} — {format(new Date(c.fim), "dd MMM", { locale: ptBR })}
                  </p>
                </div>
                <span className="text-[10px] text-primary font-medium shrink-0">
                  {hasSintese ? "Editar" : "Adicionar"} síntese
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Validation queue preview */}
      <Card className="card-luta">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Fila de validação
            </CardTitle>
            <Badge variant="secondary" className="text-xs">{queue.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isQueueLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : queue.length === 0 ? (
            <div className="py-8 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum registro pendente 🎉</p>
            </div>
          ) : (
            queue.map((item) => (
              <Link
                key={item.id}
                to="/admin/validar"
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {item.resumo ?? (item.missions as any)?.title ?? "Registro"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Badge
                  variant={item.status === "precisa_ajuste" ? "outline" : "secondary"}
                  className={item.status === "precisa_ajuste" ? "border-amber-500/50 text-amber-400 text-[10px]" : "text-[10px]"}
                >
                  {item.status === "precisa_ajuste" ? "Ajuste" : "Enviado"}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Fechamento sheet */}
      {ciclo && (
        <FechamentoCicloSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          ciclo={ciclo}
          stats={cicloStats}
          isLoadingStats={isLoadingCicloStats}
          onConfirm={(resumo, publicarMural) => fecharCiclo({ resumo, publicarMural })}
          isFechando={isFechando}
        />
      )}

      {/* Editar síntese sheet */}
      <EditarSinteseCicloSheet
        open={editarSheetOpen}
        onOpenChange={setEditarSheetOpen}
        ciclo={editarCiclo}
        cellId={celulaId}
      />
    </div>
  );
}
