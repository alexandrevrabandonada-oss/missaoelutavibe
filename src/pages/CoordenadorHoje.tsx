import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCoordMetrics7d } from "@/hooks/useCoordMetrics7d";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MessageCircle,
  Phone,
  Target,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { UserScopeBadge } from "@/components/admin/UserScopeBadge";
import { NorthStarPulseCard } from "@/components/admin/NorthStarPulseCard";
import { SupportMetricsCard } from "@/components/admin/SupportMetricsCard";
import { EventInviteMetricsCard } from "@/components/admin/EventInviteMetricsCard";
import { EventParticipationMetricsCard } from "@/components/admin/EventParticipationMetricsCard";
import { PostEventFollowupMetricsCard } from "@/components/admin/PostEventFollowupMetricsCard";
import { CoordinatorAlertsSection } from "@/components/coordinator/CoordinatorAlertsSection";
import {
  useCoordinatorInbox,
  getCarefulReminderWhatsAppLink,
  getCarefulReminderMessage,
  type OverdueFollowup,
  type AtRiskVolunteer,
  type StalledMission,
} from "@/hooks/useCoordinatorInbox";
import { CoordinationErrorBanner } from "@/components/coordinator/CoordinationErrorBanner";
import { CoordCellsSection } from "@/components/coordinator/CoordCellsSection";
import { CoordAuditSection } from "@/components/coordinator/CoordAuditSection";
import { PendingRequestsCard } from "@/components/coordinator/PendingRequestsCard";
import { FullFunnelCard } from "@/components/admin/FullFunnelCard";
import { PendingVolunteersCard } from "@/components/coordinator/PendingVolunteersCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePilotStart } from "@/hooks/usePilotStart";
import { useCiclos } from "@/hooks/useCiclos";
import { Rocket } from "lucide-react";
import { WeekHeadlineCard } from "@/components/cycle/WeekHeadlineCard";

export default function CoordenadorHoje() {
  const {
    metrics,
    isLoadingMetrics,
    metricsError,
    overdueFollowups,
    isLoadingOverdue,
    overdueError,
    atRiskVolunteers,
    isLoadingAtRisk,
    atRiskError,
    stalledMissions,
    isLoadingStalled,
    stalledError,
    assignFollowup,
    isAssigning,
    logInboxViewed,
    logWhatsAppOpened,
    isCoordinator,
    scope,
    refetchAll,
  } = useCoordinatorInbox();

  const { startPilot, isStarting: isPilotStarting } = usePilotStart();
  const { activeCycle } = useCiclos();
  const pilotCycleActive = !!activeCycle;
  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<OverdueFollowup | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");

  const today = new Date();

  // 7-day metrics from tables directly (resilient)
  const { data: metrics7d } = useCoordMetrics7d(scope.cidade);

  // Get cities for resolving city_id from name
  const { data: cities = [] } = useQuery({
    queryKey: ["cidades-for-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cidades")
        .select("id, nome")
        .eq("status", "ativa");
      if (error) throw error;
      return data || [];
    },
  });

  // Log page view on mount
  useEffect(() => {
    if (isCoordinator) {
      logInboxViewed();
    }
  }, [isCoordinator]);

  // Get volunteers for delegation (from same scope)
  const { data: volunteers = [] } = useQuery({
    queryKey: ["scope-volunteers", scope.cidade, scope.cellId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, city")
        .eq("volunteer_status", "ativo")
        .order("full_name");

      if (scope.type === "cidade" && scope.cidade) {
        query = query.eq("city", scope.cidade);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: delegateDialogOpen,
  });

  // Copy message handler
  const handleCopyMessage = (firstName: string, context: "followup" | "stalled" | "bring1" | "return") => {
    const message = getCarefulReminderMessage(firstName, context);
    navigator.clipboard.writeText(message);
    toast.success("Mensagem copiada!");
  };

  // Open WhatsApp handler
  const handleOpenWhatsApp = (
    whatsapp: string | null,
    firstName: string,
    context: "followup" | "stalled" | "bring1" | "return",
    targetType: string,
    targetId: string
  ) => {
    const link = getCarefulReminderWhatsAppLink(whatsapp, firstName, context);
    if (link) {
      logWhatsAppOpened(targetType, targetId);
      window.open(link, "_blank");
    } else {
      toast.error("WhatsApp não disponível");
    }
  };

  // Delegate handler
  const handleDelegate = () => {
    if (selectedContact && selectedAssignee) {
      assignFollowup({
        contactId: selectedContact.id,
        assigneeId: selectedAssignee,
      });
      setDelegateDialogOpen(false);
      setSelectedContact(null);
      setSelectedAssignee("");
    }
  };

  // Access control
  if (!isCoordinator) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto p-4">
          <p className="text-muted-foreground">Acesso restrito a coordenadores.</p>
          <Button asChild className="mt-4">
            <Link to="/voluntario/hoje">Voltar</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/coordenador/territorio">
                  <Users className="h-4 w-4 mr-2" />
                  Operação de Células
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/diagnostico">
                  Diagnóstico
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Coordenação
            </h1>
            <p className="text-muted-foreground">
              {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        <UserScopeBadge />

        {/* Week Headline (editable for coordinators) */}
        <WeekHeadlineCard editable />

        {/* Pilot Card — adapts based on active cycle */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Modo Piloto (7 dias)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {pilotCycleActive
                  ? "Piloto ativo — acompanhe a atividade dos voluntários."
                  : "Cria um ciclo ativo com 7 missões canônicas para engajamento imediato."}
              </p>
            </div>
            {pilotCycleActive ? (
              <Button variant="outline" asChild className="whitespace-nowrap">
                <Link to="/admin/semana">
                  <Target className="h-4 w-4 mr-2" />
                  Ver atividade do piloto
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => startPilot()}
                disabled={isPilotStarting}
                className="btn-luta whitespace-nowrap"
              >
                {isPilotStarting ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                INICIAR PILOTO
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Error Banner for failed data sources */}
        <CoordinationErrorBanner
          sources={[
            { name: "Métricas", error: metricsError as Error | null, isLoading: isLoadingMetrics },
            { name: "Follow-ups", error: overdueError as Error | null, isLoading: isLoadingOverdue },
            { name: "Voluntários em Risco", error: atRiskError as Error | null, isLoading: isLoadingAtRisk },
            { name: "Missões Paradas", error: stalledError as Error | null, isLoading: isLoadingStalled },
          ]}
          scopeCidade={scope.cidade}
          onRetry={refetchAll}
          failedMetricSources={metrics7d?.failedSources}
        />

        {/* Coordinator Alerts Section */}
        <CoordinatorAlertsSection />

        {/* Cell Entry Points */}
        <CoordCellsSection />

        {/* Pending Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PendingVolunteersCard 
            cityId={scope.cidade ? cities.find((c: any) => c.nome === scope.cidade)?.id : undefined}
            cityName={scope.cidade || null}
            limit={5}
          />
          <PendingRequestsCard 
            cityId={scope.cidade ? cities.find((c: any) => c.nome === scope.cidade)?.id : undefined}
            cityName={scope.cidade || null}
          />
        </div>

        {/* Full Funnel (7d) */}
        <FullFunnelCard scopeCidade={scope.cidade || null} />

        {/* North Star Pulse (7d compact) */}
        <NorthStarPulseCard 
          scope={
            scope.cidade 
              ? { kind: "city", value: scope.cidade }
              : scope.cellId
              ? { kind: "cell", value: scope.cellId }
              : undefined
          }
        />

        {/* 7-Day Activity Metrics (from tables directly) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {(metrics7d?.sources || []).map((src) => (
                <div
                  key={src.key}
                  className="rounded-md border border-border p-3 text-center"
                >
                  <p className="text-xl font-bold">{src.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-1">{src.label}</p>
                  {!src.ok && (
                    <p className="text-[10px] text-muted-foreground mt-1">(beta)</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        {isLoadingMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={metrics?.overdue_followups ? "border-destructive" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <Clock className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.overdue_followups || 0}</p>
                    <p className="text-sm text-muted-foreground">Follow-ups vencidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={metrics?.at_risk_volunteers ? "border-amber-500" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10">
                    <UserMinus className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.at_risk_volunteers || 0}</p>
                    <p className="text-sm text-muted-foreground">Em risco (48h+)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={metrics?.stalled_missions ? "border-orange-500" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-500/10">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.stalled_missions || 0}</p>
                    <p className="text-sm text-muted-foreground">Missões paradas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Support & Event Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SupportMetricsCard 
            scopeTipo={scope.cidade ? 'cidade' : 'all'} 
            scopeId={scope.cidade || undefined} 
          />
          <EventInviteMetricsCard days={30} limit={3} />
          <EventParticipationMetricsCard days={14} />
          <PostEventFollowupMetricsCard days={14} />
        </div>

        {/* Audit Section (only for COORD_GLOBAL/Admin - graceful degradation) */}
        <CoordAuditSection limit={10} cityId={scope.cidade} />
        
        {/* Audit hint when empty */}
        {!isLoadingMetrics && (metrics?.overdue_followups === 0 && metrics?.at_risk_volunteers === 0 && metrics?.stalled_missions === 0) && (
          <p className="text-xs text-muted-foreground text-center">
            💡 Faça uma aprovação ou revogação para validar auditoria
          </p>
        )}

        {/* Tabs */}
        <Tabs defaultValue="followups">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="followups" className="relative">
              Follow-ups
              {metrics?.overdue_followups ? (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                  {metrics.overdue_followups}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="atrisk" className="relative">
              Em risco
              {metrics?.at_risk_volunteers ? (
                <Badge className="ml-2 h-5 px-1.5 text-xs bg-amber-500">
                  {metrics.at_risk_volunteers}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="stalled" className="relative">
              Paradas
              {metrics?.stalled_missions ? (
                <Badge className="ml-2 h-5 px-1.5 text-xs bg-orange-500">
                  {metrics.stalled_missions}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* Overdue Follow-ups Tab */}
          <TabsContent value="followups" className="mt-4 space-y-3">
            {isLoadingOverdue ? (
              <LoadingSkeleton />
            ) : overdueFollowups.length > 0 ? (
              overdueFollowups.map((item) => (
                <FollowupCard
                  key={item.id}
                  item={item}
                  onCopy={() => handleCopyMessage(item.nome_curto, "followup")}
                  onWhatsApp={() =>
                    handleOpenWhatsApp(item.whatsapp, item.nome_curto, "followup", "followup", item.id)
                  }
                  onDelegate={() => {
                    setSelectedContact(item);
                    setDelegateDialogOpen(true);
                  }}
                />
              ))
            ) : (
              <EmptyState icon={CheckCircle2} message="Nenhum follow-up vencido! 🎉" />
            )}
          </TabsContent>

          {/* At Risk Volunteers Tab */}
          <TabsContent value="atrisk" className="mt-4 space-y-3">
            {isLoadingAtRisk ? (
              <LoadingSkeleton />
            ) : atRiskVolunteers.length > 0 ? (
              atRiskVolunteers.map((item) => (
                <AtRiskCard
                  key={item.id}
                  item={item}
                  onCopy={() => handleCopyMessage(item.full_name?.split(" ")[0] || "Voluntário", "return")}
                  onWhatsApp={() =>
                    handleOpenWhatsApp(
                      item.whatsapp,
                      item.full_name?.split(" ")[0] || "Voluntário",
                      "return",
                      "volunteer",
                      item.id
                    )
                  }
                />
              ))
            ) : (
              <EmptyState icon={Users} message="Todos os voluntários estão engajados! 🎉" />
            )}
          </TabsContent>

          {/* Stalled Missions Tab */}
          <TabsContent value="stalled" className="mt-4 space-y-3">
            {isLoadingStalled ? (
              <LoadingSkeleton />
            ) : stalledMissions.length > 0 ? (
              stalledMissions.map((item) => (
                <StalledCard
                  key={item.id}
                  item={item}
                  onCopy={() =>
                    handleCopyMessage(item.volunteer_name?.split(" ")[0] || "Voluntário", "stalled")
                  }
                  onWhatsApp={() =>
                    handleOpenWhatsApp(
                      item.volunteer_whatsapp,
                      item.volunteer_name?.split(" ")[0] || "Voluntário",
                      "stalled",
                      "mission",
                      item.id
                    )
                  }
                />
              ))
            ) : (
              <EmptyState icon={Target} message="Todas as missões fluindo! 🎉" />
            )}
          </TabsContent>
        </Tabs>

        {/* Delegate Dialog */}
        <Dialog open={delegateDialogOpen} onOpenChange={setDelegateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delegar Follow-up</DialogTitle>
              <DialogDescription>
                Atribuir o contato "{selectedContact?.nome_curto}" a outro voluntário da sua região.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Selecione o voluntário</label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Escolher voluntário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {volunteers.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.full_name || "Sem nome"} {v.city && `(${v.city})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDelegateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleDelegate} disabled={!selectedAssignee || isAssigning}>
                  {isAssigning ? "Delegando..." : "Delegar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

// Sub-components

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof CheckCircle2; message: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <Icon className="h-12 w-12 mx-auto mb-4 text-primary/30" />
        <p>{message}</p>
      </CardContent>
    </Card>
  );
}

function FollowupCard({
  item,
  onCopy,
  onWhatsApp,
  onDelegate,
}: {
  item: OverdueFollowup;
  onCopy: () => void;
  onWhatsApp: () => void;
  onDelegate: () => void;
}) {
  return (
    <Card className="border-l-4 border-l-destructive">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{item.nome_curto}</span>
              {item.bairro && (
                <Badge variant="outline" className="text-xs">
                  {item.bairro}
                </Badge>
              )}
              <Badge variant="destructive" className="text-xs">
                {item.days_overdue}d atrasado
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              <span>Responsável: {item.owner_name || "—"}</span>
              {item.assignee_name && (
                <span className="ml-2">→ Delegado: {item.assignee_name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={onCopy} title="Copiar mensagem">
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onWhatsApp}
              title="Abrir WhatsApp"
              disabled={!item.whatsapp}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onDelegate}>
              Delegar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AtRiskCard({
  item,
  onCopy,
  onWhatsApp,
}: {
  item: AtRiskVolunteer;
  onCopy: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{item.full_name || "Voluntário"}</span>
              {item.city && (
                <Badge variant="outline" className="text-xs">
                  {item.city}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              <span>Inativo há {Math.round(item.hours_since_last_action / 24)}d</span>
              {item.last_action_kind && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {item.last_action_kind}
                </Badge>
              )}
              <span className="ml-2 text-amber-600">• Precisa voltar</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={onCopy} title="Copiar mensagem">
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onWhatsApp}
              title="Abrir WhatsApp"
              disabled={!item.whatsapp}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StalledCard({
  item,
  onCopy,
  onWhatsApp,
}: {
  item: StalledMission;
  onCopy: () => void;
  onWhatsApp: () => void;
}) {
  const missionTypeLabel: Record<string, string> = {
    rua: "Rua",
    conversa: "Conversa",
    mobilizacao: "Mobilização",
    escuta: "Escuta",
  };

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{item.volunteer_name || "Voluntário"}</span>
              <Badge variant="secondary" className="text-xs">
                {missionTypeLabel[item.mission_type] || item.mission_type}
              </Badge>
              <Badge className="text-xs bg-orange-500">{item.days_stalled}d parada</Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1 truncate">{item.title}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={onCopy} title="Copiar mensagem">
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onWhatsApp}
              title="Abrir WhatsApp"
              disabled={!item.volunteer_whatsapp}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
