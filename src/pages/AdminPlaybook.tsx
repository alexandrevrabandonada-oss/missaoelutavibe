import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { usePlaybook, getRitualStepStatus, getStatusDisplay, ScopeType } from "@/hooks/usePlaybook";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PreCampaignBadge } from "@/components/ui/PreCampaignBadge";
import { TTSButton } from "@/components/a11y/TTSButton";
import { toast } from "sonner";
import { 
  ArrowLeft,
  RefreshCw,
  BookOpen,
  Vote,
  Calendar,
  Package,
  CalendarDays,
  Target,
  CheckCircle,
  XCircle,
  ExternalLink,
  AlertCircle,
  Save,
  ChevronRight,
} from "lucide-react";
import { format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RitualStep {
  id: string;
  title: string;
  icon: React.ElementType;
  getStatus: () => { status: "ok" | "pendente" | "atrasado"; icon: string; color: string };
  getReason: () => string;
  primaryCta: { label: string; url: string } | null;
  secondaryCta?: { label: string; url: string } | null;
}

export default function AdminPlaybook() {
  const { isCoordinator, isAdmin, getScope, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  
  const userScope = getScope();
  const [selectedScopeType, setSelectedScopeType] = useState<ScopeType>(
    userScope.type === "none" ? "global" : (userScope.type as ScopeType)
  );
  
  const { 
    ritual, 
    notes, 
    isLoading, 
    refetch, 
    saveNotes, 
    isSavingNotes,
    effectiveScope,
    canChangeScope 
  } = usePlaybook(selectedScopeType);
  
  const [localNotes, setLocalNotes] = useState<string>("");
  const [notesEdited, setNotesEdited] = useState(false);

  // Initialize notes when loaded
  if (notes?.notes && !notesEdited && localNotes === "") {
    setLocalNotes(notes.notes);
  }

  if (rolesLoading || isLoading) {
    return <FullPageLoader text="Carregando playbook..." />;
  }

  if (!isCoordinator()) {
    navigate("/missao");
    return null;
  }

  const handleSaveNotes = async () => {
    try {
      await saveNotes(localNotes);
      setNotesEdited(false);
      toast.success("Notas salvas!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar notas");
    }
  };

  // Define ritual steps based on data
  const ritualSteps: RitualStep[] = [
    {
      id: "plenaria",
      title: "Plenária",
      icon: Vote,
      getStatus: () => getRitualStepStatus(
        (ritual?.plenaria?.abertas_count ?? 0) > 0 || (ritual?.plenaria?.encerradas_7d ?? 0) > 0,
        false
      ),
      getReason: () => {
        if ((ritual?.plenaria?.abertas_count ?? 0) > 0) {
          return `${ritual?.plenaria?.abertas_count} plenária(s) aberta(s)`;
        }
        if ((ritual?.plenaria?.encerradas_7d ?? 0) > 0) {
          return `${ritual?.plenaria?.encerradas_7d} encerrada(s) esta semana`;
        }
        return "Nenhuma plenária aberta";
      },
      primaryCta: { label: "Ver Plenárias", url: "/admin/plenaria" },
      secondaryCta: { label: "Criar Plenária", url: "/admin/plenaria?action=nova" },
    },
    {
      id: "semana",
      title: "Semana (Metas/Plano)",
      icon: Calendar,
      getStatus: () => getRitualStepStatus(
        ritual?.semana?.has_metas || ritual?.semana?.has_plano,
        ritual?.ciclo?.exists && !ritual?.semana?.has_plano
      ),
      getReason: () => {
        if (!ritual?.ciclo?.exists) return "Nenhum ciclo ativo";
        const parts = [];
        if (ritual?.semana?.has_metas) parts.push("metas definidas");
        if (ritual?.semana?.has_plano) parts.push("plano publicado");
        if (ritual?.semana?.has_backlog_tasks) parts.push("tarefas vinculadas");
        if (parts.length === 0) return "Sem metas ou plano publicado";
        return parts.join(" • ");
      },
      primaryCta: ritual?.ciclo?.id 
        ? { label: "Editar Semana", url: `/admin/semana/${ritual.ciclo.id}` }
        : { label: "Criar Ciclo", url: "/admin/semana" },
      secondaryCta: ritual?.ciclo?.id && !ritual?.semana?.has_plano
        ? { label: "Publicar Plano", url: `/admin/semana/${ritual.ciclo.id}?tab=plano` }
        : null,
    },
    {
      id: "fabrica",
      title: "Fábrica de Base",
      icon: Package,
      getStatus: () => getRitualStepStatus(
        (ritual?.fabrica?.aprovados_7d ?? 0) > 0,
        (ritual?.fabrica?.em_revisao ?? 0) > 3
      ),
      getReason: () => {
        const parts = [];
        if ((ritual?.fabrica?.aprovados_7d ?? 0) > 0) {
          parts.push(`${ritual?.fabrica?.aprovados_7d} aprovados esta semana`);
        }
        if ((ritual?.fabrica?.em_revisao ?? 0) > 0) {
          parts.push(`${ritual?.fabrica?.em_revisao} em revisão`);
        }
        return parts.length > 0 ? parts.join(" • ") : "Sem pacotes aprovados recentes";
      },
      primaryCta: { label: "Ver Fábrica", url: "/admin/fabrica" },
      secondaryCta: { label: "Criar Pacote", url: "/admin/fabrica?action=novo" },
    },
    {
      id: "agenda",
      title: "Agenda",
      icon: CalendarDays,
      getStatus: () => getRitualStepStatus(
        (ritual?.agenda?.publicadas_7d ?? 0) > 0,
        (ritual?.agenda?.concluidas_sem_recibo ?? 0) > 0
      ),
      getReason: () => {
        const parts = [];
        if ((ritual?.agenda?.publicadas_7d ?? 0) > 0) {
          parts.push(`${ritual?.agenda?.publicadas_7d} atividades publicadas`);
        }
        if ((ritual?.agenda?.proximas_48h ?? 0) > 0) {
          parts.push(`${ritual?.agenda?.proximas_48h} nas próximas 48h`);
        }
        if ((ritual?.agenda?.concluidas_sem_recibo ?? 0) > 0) {
          parts.push(`${ritual?.agenda?.concluidas_sem_recibo} sem recibo`);
        }
        return parts.length > 0 ? parts.join(" • ") : "Nenhuma atividade publicada";
      },
      primaryCta: { label: "Ver Agenda", url: "/admin/agenda" },
      secondaryCta: { label: "Nova Atividade", url: "/admin/agenda/nova" },
    },
    {
      id: "execucao",
      title: "Execução (Missões)",
      icon: Target,
      getStatus: () => getRitualStepStatus(
        (ritual?.execucao?.em_execucao ?? 0) > 0 || (ritual?.execucao?.concluidas_7d ?? 0) > 0,
        (ritual?.execucao?.missoes_abertas ?? 0) > 10
      ),
      getReason: () => {
        const parts = [];
        if ((ritual?.execucao?.missoes_abertas ?? 0) > 0) {
          parts.push(`${ritual?.execucao?.missoes_abertas} abertas`);
        }
        if ((ritual?.execucao?.em_execucao ?? 0) > 0) {
          parts.push(`${ritual?.execucao?.em_execucao} em execução`);
        }
        if ((ritual?.execucao?.concluidas_7d ?? 0) > 0) {
          parts.push(`${ritual?.execucao?.concluidas_7d} concluídas`);
        }
        return parts.length > 0 ? parts.join(" • ") : "Sem missões ativas";
      },
      primaryCta: { label: "Ver Missões", url: "/admin?tab=missoes" },
      secondaryCta: { label: "Criar Missão", url: "/admin?tab=missoes&action=nova" },
    },
    {
      id: "validacao",
      title: "Validação",
      icon: CheckCircle,
      getStatus: () => getRitualStepStatus(
        (ritual?.validacao?.evidencias_pendentes ?? 0) === 0 && (ritual?.validacao?.tickets_abertos ?? 0) === 0,
        (ritual?.validacao?.evidencias_pendentes ?? 0) > 5 || (ritual?.validacao?.tickets_antigos_dias ?? 0) > 3
      ),
      getReason: () => {
        const parts = [];
        if ((ritual?.validacao?.evidencias_pendentes ?? 0) > 0) {
          parts.push(`${ritual?.validacao?.evidencias_pendentes} evidências pendentes`);
        }
        if ((ritual?.validacao?.tickets_abertos ?? 0) > 0) {
          parts.push(`${ritual?.validacao?.tickets_abertos} tickets abertos`);
        }
        if ((ritual?.validacao?.tickets_antigos_dias ?? 0) > 0) {
          parts.push(`mais antigo: ${ritual?.validacao?.tickets_antigos_dias}d`);
        }
        return parts.length > 0 ? parts.join(" • ") : "Tudo validado ✓";
      },
      primaryCta: { label: "Validar Evidências", url: "/admin/validar" },
      secondaryCta: { label: "Ver Inbox", url: "/admin/inbox" },
    },
    {
      id: "fechamento",
      title: "Fechamento",
      icon: XCircle,
      getStatus: () => getRitualStepStatus(
        ritual?.semana?.has_recibo ?? false,
        ritual?.ciclo?.exists && !ritual?.semana?.has_recibo && (ritual?.execucao?.concluidas_7d ?? 0) > 0
      ),
      getReason: () => {
        if (ritual?.semana?.has_recibo) return "Recibo da semana publicado ✓";
        if (!ritual?.ciclo?.exists) return "Nenhum ciclo para fechar";
        return "Recibo pendente";
      },
      primaryCta: ritual?.ciclo?.id 
        ? { label: "Fechar Semana", url: `/admin/semana/${ritual.ciclo.id}?tab=fechar` }
        : null,
    },
  ];

  const statusDisplay = ritual?.status_geral 
    ? getStatusDisplay(ritual.status_geral) 
    : getStatusDisplay("amarelo");

  const weekLabel = format(
    startOfWeek(new Date(effectiveScope.weekStart), { weekStartsOn: 1 }),
    "'Semana de' dd/MM",
    { locale: ptBR }
  );

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/ops")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="space-y-6 animate-slide-up">
          {/* Title + Scope */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm uppercase tracking-wider font-bold">Playbook</span>
              </div>
              <h1 className="text-2xl font-bold">Rito da Semana</h1>
              <p className="text-sm text-muted-foreground">{weekLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <TTSButton 
                text={`Playbook. Rito da Semana. ${weekLabel}. Checklist: ${ritualSteps.map(s => `${s.title}: ${s.getReason()}`).join(". ")}. ${localNotes ? `Notas: ${localNotes}` : ""}`}
                variant="iconOnly"
              />
              <PreCampaignBadge />
            </div>
          </div>

          {/* Scope Selector */}
          {canChangeScope && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Escopo:</span>
              <Select 
                value={selectedScopeType} 
                onValueChange={(val) => setSelectedScopeType(val as ScopeType)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                  <SelectItem value="celula">Célula</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Geral */}
          <div className={`card-luta border ${statusDisplay.bgClass}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{statusDisplay.icon}</span>
                <div>
                  <p className="text-sm text-muted-foreground">Status Geral</p>
                  <p className={`text-xl font-bold ${statusDisplay.color}`}>
                    {statusDisplay.label}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={() => navigate("/admin/ops")}
              >
                <Target className="h-4 w-4 mr-2" />
                Ops
              </Button>
            </div>
          </div>

          {/* Actionable Alerts */}
          {ritual?.alerts && ritual.alerts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Alertas Acionáveis
              </h2>
              <div className="space-y-2">
                {ritual.alerts.slice(0, 4).map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border flex items-center justify-between gap-3 cursor-pointer hover:bg-secondary/50 transition-colors ${
                      alert.level === "vermelho" 
                        ? "border-destructive/30 bg-destructive/10" 
                        : alert.level === "amarelo"
                        ? "border-yellow-500/30 bg-yellow-500/10"
                        : "border-green-500/30 bg-green-500/10"
                    }`}
                    onClick={() => navigate(alert.action_url)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.hint}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ritual Steps */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Checklist do Rito
            </h2>
            <div className="space-y-2">
              {ritualSteps.map((step) => {
                const stepStatus = step.getStatus();
                const reason = step.getReason();
                const Icon = step.icon;

                return (
                  <div 
                    key={step.id}
                    className="card-luta p-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <span className="text-xl">{stepStatus.icon}</span>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-bold">{step.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{reason}</p>
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex gap-2 mt-3 pl-8">
                      {step.primaryCta && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(step.primaryCta!.url)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {step.primaryCta.label}
                        </Button>
                      )}
                      {step.secondaryCta && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => navigate(step.secondaryCta!.url)}
                        >
                          {step.secondaryCta.label}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coordinator Notes */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Notas da Coordenação
            </h2>
            <div className="card-luta">
              <Textarea
                value={localNotes}
                onChange={(e) => {
                  setLocalNotes(e.target.value);
                  setNotesEdited(true);
                }}
                placeholder="Anotações, lembretes, observações..."
                className="min-h-[100px] resize-none"
              />
              {notesEdited && (
                <div className="flex justify-end mt-3">
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSavingNotes ? "Salvando..." : "Salvar Notas"}
                  </Button>
                </div>
              )}
              {notes?.updated_at && !notesEdited && (
                <p className="text-xs text-muted-foreground mt-2">
                  Última atualização: {format(new Date(notes.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}
