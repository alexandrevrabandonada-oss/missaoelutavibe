/**
 * DrilldownSheet - North Star Drilldown + Cohorts v0
 * 
 * Shows funnel breakdown and actionable cohort list for an alert.
 */

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Users,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  useNorthStarDrilldown,
  useCohortForAlert,
  useCohortMessageTemplates,
  type CohortMember,
  type DrilldownMetrics,
} from "@/hooks/useNorthStarDrilldown";
import { getAlertTitle } from "@/lib/coordinatorPlaybooks";

interface DrilldownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertKey: string;
  scopeKind: string;
  scopeValue: string;
}

export function DrilldownSheet({
  open,
  onOpenChange,
  alertKey,
  scopeKind,
  scopeValue,
}: DrilldownSheetProps) {
  const [windowDays, setWindowDays] = useState(7);

  const drilldown = useNorthStarDrilldown(windowDays, scopeKind, scopeValue || undefined);
  const cohort = useCohortForAlert(alertKey, windowDays, open);
  const templates = useCohortMessageTemplates(alertKey, open);

  const alertTitle = getAlertTitle(alertKey);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] flex flex-col">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Detalhes: {alertTitle}
          </SheetTitle>
          <SheetDescription>
            Análise do funil e lista de voluntários para ação
          </SheetDescription>
        </SheetHeader>

        {/* Window toggle */}
        <div className="flex gap-2 py-2 shrink-0">
          <Button
            variant={windowDays === 7 ? "default" : "outline"}
            size="sm"
            onClick={() => setWindowDays(7)}
          >
            7 dias
          </Button>
          <Button
            variant={windowDays === 30 ? "default" : "outline"}
            size="sm"
            onClick={() => setWindowDays(30)}
          >
            30 dias
          </Button>
        </div>

        <Tabs defaultValue="funnel" className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="funnel" className="gap-1">
              <BarChart3 className="h-3 w-3" />
              Funil
            </TabsTrigger>
            <TabsTrigger value="cohort" className="gap-1">
              <Users className="h-3 w-3" />
              Lista ({cohort.data.count})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funnel" className="flex-1 overflow-auto mt-4">
            {drilldown.isLoading ? (
              <FunnelSkeleton />
            ) : (
              <FunnelView
                current={drilldown.data.current}
                previous={drilldown.data.previous}
                breakdown={drilldown.data.breakdown}
              />
            )}
          </TabsContent>

          <TabsContent value="cohort" className="flex-1 overflow-hidden mt-4">
            {cohort.isLoading || templates.isLoading ? (
              <CohortSkeleton />
            ) : (
              <CohortView
                members={cohort.data.cohort}
                templates={templates.data.templates}
                onCopyMessage={cohort.trackMessageCopied}
                onOpenWhatsApp={cohort.trackWhatsAppOpened}
              />
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// Funnel visualization
function FunnelView({
  current,
  previous,
  breakdown,
}: {
  current: DrilldownMetrics;
  previous: Partial<DrilldownMetrics>;
  breakdown: { label: string; total: number; active: number }[];
}) {
  const stages = [
    { key: "signup", label: "Cadastros", value: current.signup, prev: previous.signup },
    { key: "approved", label: "Aprovados", value: current.approved, prev: previous.approved },
    { key: "checkin_submitted", label: "Check-ins", value: current.checkin_submitted },
    { key: "next_action_started", label: "Ações iniciadas", value: current.next_action_started },
    { key: "next_action_completed", label: "Ações concluídas", value: current.next_action_completed, prev: previous.next_action_completed },
    { key: "invite_shared", label: "Compartilhamentos", value: current.invite_shared, prev: previous.invite_shared },
    { key: "contact_created", label: "Contatos criados", value: current.contact_created, prev: previous.contact_created },
    { key: "support_qualified", label: "Apoio qualificado", value: current.support_qualified },
    { key: "event_invites_created", label: "Convites evento", value: current.event_invites_created },
    { key: "event_attended_marked", label: "Presenças", value: current.event_attended_marked },
  ];

  return (
    <div className="space-y-6">
      {/* Funnel stages */}
      <div className="space-y-2">
        <h3 className="font-medium text-sm text-muted-foreground">Funil de engajamento</h3>
        <div className="space-y-1">
          {stages.map((stage, idx) => {
            const prevStage = idx > 0 ? stages[idx - 1] : null;
            const conversionRate = prevStage && prevStage.value > 0
              ? Math.round((stage.value / prevStage.value) * 100)
              : null;
            
            const delta = stage.prev !== undefined && stage.prev > 0
              ? Math.round(((stage.value - stage.prev) / stage.prev) * 100)
              : null;

            return (
              <div
                key={stage.key}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{stage.label}</span>
                    {conversionRate !== null && (
                      <Badge variant="outline" className="text-xs">
                        {conversionRate}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{stage.value}</span>
                  {delta !== null && (
                    <span
                      className={`flex items-center text-xs ${
                        delta >= 0 ? "text-green-600" : "text-destructive"
                      }`}
                    >
                      {delta >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                      )}
                      {delta > 0 ? "+" : ""}{delta}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown by city */}
      {breakdown.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm text-muted-foreground">Por cidade (top 5)</h3>
          <div className="space-y-1">
            {breakdown.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <span className="text-sm">{item.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{item.total} total</Badge>
                  <Badge variant="outline" className="text-green-600">
                    {item.active} ativos
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// Cohort list with actions
function CohortView({
  members,
  templates,
  onCopyMessage,
  onOpenWhatsApp,
}: {
  members: CohortMember[];
  templates: { short: string; mid: string; leader: string };
  onCopyMessage: (variant: "short" | "mid" | "leader") => void;
  onOpenWhatsApp: () => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState<"short" | "mid" | "leader">("short");

  const handleCopyMessage = () => {
    const text = templates[selectedVariant];
    navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada!");
    onCopyMessage(selectedVariant);
  };

  const statusLabels: Record<string, string> = {
    aprovado_sem_acao: "Sem ação",
    aprovado_sem_checkin: "Sem check-in",
    acao_sem_share: "Não compartilhou",
    sem_crm_7d: "Sem contato CRM",
    contato_nao_qualificado: "Contato não qualificado",
    retorno_48h: "Inativo 48h+",
    rsvp_sem_presenca: "RSVP sem presença",
  };

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-50" />
        <p>Nenhum voluntário encontrado para este alerta.</p>
        <p className="text-sm">Isso é uma boa notícia!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message templates */}
      <div className="shrink-0 space-y-3 pb-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Mensagem:</span>
          <div className="flex gap-1">
            {(["short", "mid", "leader"] as const).map((v) => (
              <Button
                key={v}
                variant={selectedVariant === v ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedVariant(v)}
              >
                {v === "short" ? "Curta" : v === "mid" ? "Média" : "Líder"}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          {templates[selectedVariant]}
        </div>
        
        <Button onClick={handleCopyMessage} className="w-full">
          <Copy className="h-4 w-4 mr-2" />
          Copiar mensagem
        </Button>
      </div>

      {/* Member list */}
      <div className="flex-1 min-h-0 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-sm">
            Voluntários ({members.length})
          </h3>
        </div>
        
        <ScrollArea className="h-[calc(100%-2rem)]">
          <div className="space-y-2 pr-4">
            {members.slice(0, 20).map((member) => (
              <MemberCard
                key={member.user_id}
                member={member}
                statusLabel={statusLabels[member.status_resumo] || member.status_resumo}
                messageTemplate={templates[selectedVariant]}
                onOpenWhatsApp={onOpenWhatsApp}
              />
            ))}
            {members.length > 20 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                +{members.length - 20} mais...
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  statusLabel,
  messageTemplate,
  onOpenWhatsApp,
}: {
  member: CohortMember;
  statusLabel: string;
  messageTemplate: string;
  onOpenWhatsApp: () => void;
}) {
  const formatLastAction = (date: string | null) => {
    if (!date) return "Nunca";
    const d = new Date(date);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h atrás`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const handleCopyName = () => {
    navigator.clipboard.writeText(member.display_name);
    toast.success("Nome copiado!");
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyName}
            className="font-medium text-sm truncate hover:underline"
            title="Clique para copiar"
          >
            {member.display_name}
          </button>
          <Badge variant="outline" className="text-xs shrink-0">
            {statusLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {member.city && <span>{member.city}</span>}
          <span>•</span>
          <span>Última ação: {formatLastAction(member.last_action_at)}</span>
        </div>
      </div>
      
      <div className="flex gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            navigator.clipboard.writeText(messageTemplate);
            toast.success("Mensagem copiada!");
          }}
          title="Copiar mensagem"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CohortSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
