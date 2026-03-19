import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { VoluntarioNavBar } from "@/components/navigation/VoluntarioNavBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  Target,
  Users,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Edit,
  Phone,
} from "lucide-react";
import {
  useDailyCheckin,
  DISPONIBILIDADE_OPTIONS,
  FOCO_TIPO_LABELS,
} from "@/hooks/useCadencia";
import { QuickCaptureCard } from "@/components/crm/QuickCaptureCard";
import { useRadioQueue, buildQueueFromHoje } from "@/hooks/useRadioQueue";
import { RadioPlayer, RadioMiniCard } from "@/components/a11y/RadioPlayer";
import { FirstActionCard } from "@/components/activation/FirstActionCard";
import { Bring1ProgressCard } from "@/components/activation/Bring1ProgressCard";
import { AdminShortcutButton } from "@/components/navigation/AdminShortcutButton";
import { DailyActionCTA } from "@/components/actions/DailyActionCTA";
import { ExecutionMode } from "@/components/actions/ExecutionMode";
import { PostCompletionCTAs } from "@/components/actions/PostCompletionCTAs";
import { LocalSuggestions } from "@/components/actions/LocalSuggestions";
import { MicroCompletionBanner } from "@/components/actions/MicroCompletionBanner";
import { StreakCard } from "@/components/actions/StreakCard";
import { ReturnModeBanner } from "@/components/actions/ReturnModeBanner";
import { ReturnCompleteBanner } from "@/components/actions/ReturnCompleteBanner";
import { WeeklySharePackBanner } from "@/components/growth/WeeklySharePackBanner";
import { ValidationFeedbackCard } from "@/components/feedback/ValidationFeedbackCard";
import { DailyPlanCard } from "@/components/actions/DailyPlanCard";
import { EventCycleBanner } from "@/components/event/EventCycleBanner";
// NeedsCellBanner removed - cells auto-assigned on approval
import { TerritorioBadge } from "@/components/onboarding/TerritorioBadge";
import { WelcomeBlock } from "@/components/onboarding/WelcomeBlock";
import { TodayMissionCard } from "@/components/actions/TodayMissionCard";
import { TodayStack, ModuleConfig } from "@/components/today/TodayStack";
import { PilotTrackCard } from "@/components/pilot/PilotTrackCard";
import { PilotBanner } from "@/components/pilot/PilotBanner";
import { WeekHeadlineCard } from "@/components/cycle/WeekHeadlineCard";
import { MinhaCelulaCard } from "@/components/celula/MinhaCelulaCard";
import { HojePendencias } from "@/components/today/HojePendencias";
import { useDailyAction } from "@/hooks/useDailyAction";
import { useNavTracking } from "@/hooks/useNavTracking";
import { useReturnMode } from "@/hooks/useReturnMode";
import { useWeeklySharePack } from "@/hooks/useWeeklySharePack";
import { useFirstAction } from "@/hooks/useFirstAction";
import { useValidationFeedback } from "@/hooks/useValidationFeedback";
import { focusRingClass } from "@/utils/a11y";

export default function VoluntarioHoje() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const {
    todayCheckin,
    suggestions,
    isLoading,
    loadingSuggestions,
    createCheckin,
    updateCheckin,
    hasCheckedInToday,
  } = useDailyCheckin();

  const { trackCheckinSubmitted } = useNavTracking();
  
  // Daily action execution flow
  const dailyAction = useDailyAction();

  // Return mode for 48h+ inactive users
  const returnMode = useReturnMode();
  
  // Weekly share pack eligibility
  const weeklyShare = useWeeklySharePack();
  
  // First action status
  const firstAction = useFirstAction();
  
  // Validation feedback
  const validationFeedback = useValidationFeedback();

  const [disponibilidade, setDisponibilidade] = useState(30);
  const [focoTipo, setFocoTipo] = useState<"task" | "mission" | "crm" | "agenda" | "none">("none");
  const [focoId, setFocoId] = useState<string | null>(null);
  const [travaTexto, setTravaTexto] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showRadio, setShowRadio] = useState(false);
  
  // Micro-completion banner state
  const [showMicroBanner, setShowMicroBanner] = useState(
    searchParams.get("done") === "micro"
  );
  
  // Return mode completion banner state
  const [showReturnBanner, setShowReturnBanner] = useState(
    searchParams.get("done") === "return"
  );
  
  // Dismiss state for return mode banner (controlled via orchestrator now)
  const [returnModeDismissed, setReturnModeDismissed] = useState(false);

  const today = new Date();

  // Radio queue
  const radio = useRadioQueue();

  // Build radio queue from suggestions
  useEffect(() => {
    if (suggestions && !radio.hasQueue) {
      const queue = buildQueueFromHoje({
        task: suggestions.task,
        mission: suggestions.mission,
        agenda: suggestions.agenda,
      });
      if (queue.length > 0) {
        radio.setQueue(queue);
      }
    }
  }, [suggestions]);

  const handleStartRadio = () => {
    setShowRadio(true);
    radio.play();
  };

  const handleSubmitCheckin = () => {
    createCheckin.mutate(
      {
        disponibilidade,
        foco_tipo: focoTipo,
        foco_id: focoId,
        trava_texto: travaTexto || null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          // Track checkin submitted (without PII)
          trackCheckinSubmitted({
            disponibilidade,
            foco_tipo: focoTipo,
            has_blocker: !!travaTexto,
          });
        },
      }
    );
  };

  const handleUpdateCheckin = () => {
    updateCheckin.mutate(
      {
        disponibilidade,
        foco_tipo: focoTipo,
        foco_id: focoId,
        trava_texto: travaTexto || null,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleSelectSuggestion = (tipo: "task" | "mission" | "crm" | "agenda", id: string) => {
    setFocoTipo(tipo);
    setFocoId(id);
  };

  // Build orchestrator modules
  const orchestratorModules = useMemo<ModuleConfig[]>(() => {
    const modules: ModuleConfig[] = [];

    // 1. Micro-completion banner (highest priority when shown)
    modules.push({
      key: "micro_banner",
      visible: showMicroBanner,
      dismissible: false,
      reason: "micro_action_done",
      component: (
        <MicroCompletionBanner
          onDismiss={() => {
            setShowMicroBanner(false);
            searchParams.delete("done");
            setSearchParams(searchParams, { replace: true });
          }}
          hasSuggestion={!!dailyAction.suggestedAction}
          onStartExecution={() => dailyAction.startExecution()}
        />
      ),
    });

    // 2. Return complete banner
    modules.push({
      key: "return_complete",
      visible: showReturnBanner,
      dismissible: false,
      component: (
        <ReturnCompleteBanner
          onDismiss={() => setShowReturnBanner(false)}
        />
      ),
    });

    // 3. Primary CTA — hidden from primary area (PilotTrackCard is the dominant CTA)
    // Moved to "Ver mais" by setting priorityOverride high
    modules.push({
      key: "primary_cta",
      visible: dailyAction.hasActions || !!dailyAction.suggestedAction,
      dismissible: false,
      priorityOverride: 90,
      component: (
        <DailyActionCTA onStartExecution={() => dailyAction.startExecution()} />
      ),
    });

    // 3b. Today Mission Card — also moved to "Ver mais" (not primary)
    modules.push({
      key: "today_mission",
      visible: true,
      dismissible: false,
      priorityOverride: 91,
      component: <TodayMissionCard />,
    });

    // 4. Event Cycle Banner (event within 36h)
    modules.push({
      key: "event_cycle",
      visible: true, // Component handles its own visibility
      dismissible: true,
      reason: "event_36h",
      component: <EventCycleBanner />,
    });

    // 5. Return Mode Banner (48h+ inactive)
    modules.push({
      key: "return_mode",
      visible: returnMode.isAtRisk && !showReturnBanner && !returnModeDismissed,
      dismissible: true,
      reason: "48h_inactive",
      component: (
        <ReturnModeBanner
          onDismiss={() => setReturnModeDismissed(true)}
        />
      ),
    });

    // 6. Validation Feedback
    modules.push({
      key: "validation_feedback",
      visible: (validationFeedback.rejectedItems?.length ?? 0) > 0 || (validationFeedback.approvedItems?.length ?? 0) > 0,
      dismissible: true,
      reason: "validation_pending",
      component: <ValidationFeedbackCard compact />,
    });

    // 7. Daily Plan (3 steps)
    modules.push({
      key: "daily_plan",
      visible: true,
      dismissible: true,
      component: <DailyPlanCard />,
    });

    // 8. Streak Card
    modules.push({
      key: "streak",
      visible: true,
      dismissible: true,
      component: <StreakCard />,
    });

    // 9. Weekly Share Pack
    modules.push({
      key: "weekly_share",
      visible: weeklyShare.shouldShowBanner,
      dismissible: true,
      reason: "weekly_goal_met",
      component: <WeeklySharePackBanner />,
    });

    // 10. First Action Card
    modules.push({
      key: "first_action",
      visible: firstAction.needsFirstAction,
      dismissible: true,
      component: <FirstActionCard compact />,
    });

    // 11. Bring +1 Progress
    modules.push({
      key: "bring1",
      visible: !firstAction.needsFirstAction,
      dismissible: true,
      component: <Bring1ProgressCard compact />,
    });

    // 12. Quick Capture
    modules.push({
      key: "quick_capture",
      visible: true,
      dismissible: true,
      component: <QuickCaptureCard />,
    });

    // 13. Impact link (always lowest, but shown inline)
    modules.push({
      key: "impact",
      visible: true,
      dismissible: false,
      component: (
        <Link 
          to="/voluntario/impacto" 
          className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors py-2"
        >
          Ver meu impacto →
        </Link>
      ),
    });

    return modules;
  }, [
    showMicroBanner,
    showReturnBanner,
    returnModeDismissed,
    dailyAction,
    returnMode.isAtRisk,
    weeklyShare.shouldShowBanner,
    firstAction.needsFirstAction,
    validationFeedback.rejectedItems,
    validationFeedback.approvedItems,
    searchParams,
    setSearchParams,
  ]);

  if (isLoading) {
    return (
      <>
        <AppShell>
          <div className="max-w-2xl mx-auto space-y-4 p-4 pb-24">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </AppShell>
        <VoluntarioNavBar />
      </>
    );
  }

  // === EXECUTION MODE: Full-screen focused action ===
  if (dailyAction.isInProgress && dailyAction.selectedAction && dailyAction.startedAt) {
    return (
      <ExecutionMode
        action={dailyAction.selectedAction}
        startedAt={dailyAction.startedAt}
        onComplete={(options) => dailyAction.completeAction(options)}
        onCancel={dailyAction.resetExecution}
      />
    );
  }

  // === POST-COMPLETION: Show engagement CTAs ===
  if (dailyAction.isCompleted) {
    return (
      <>
        <AppShell>
          <div className="max-w-2xl mx-auto space-y-6 p-4 pb-24">
            <PostCompletionCTAs onReset={dailyAction.resetExecution} />
          </div>
        </AppShell>
        <VoluntarioNavBar />
      </>
    );
  }

  // Show summary if already checked in and not editing
  if (hasCheckedInToday && !isEditing) {
    return (
      <>
        <AppShell>
          <div className="max-w-2xl mx-auto space-y-6 p-4 pb-24">
            {/* Pilot Banner */}
            <PilotBanner />

            {/* Território Badge */}
            <TerritorioBadge />

            {/* Welcome Block (first-time after onboarding) */}
            <WelcomeBlock />

            {/* NeedsCellBanner removed - auto-allocation */}

            {/* Pilot Track Card */}
            <PilotTrackCard />

            {/* Week Headline */}
            <WeekHeadlineCard />

            {/* Cell Entry Point */}
            <MinhaCelulaCard />

            {/* F13-A: Consolidated member status */}
            <HojePendencias />
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  Check-in feito!
                </h1>
                <p className="text-muted-foreground">
                  {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AdminShortcutButton />
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className={focusRingClass()}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>

            {/* === ORCHESTRATED MODULES — pilot: only PilotTrackCard is hero === */}
            <TodayStack modules={orchestratorModules} maxPrimary={2} />

            {/* All secondary content collapsed in pilot mode */}
            <details className="text-sm">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-2 font-medium">
                📋 Detalhes do dia
              </summary>
              <div className="mt-3 space-y-4">
                {/* Radio Player or Mini Card */}
                {showRadio && radio.hasQueue ? (
                  <RadioPlayer
                    currentItem={radio.currentItem}
                    currentIndex={radio.currentIndex}
                    totalItems={radio.queue.length}
                    isPlaying={radio.isPlaying}
                    isPaused={radio.isPaused}
                    ttsSupported={radio.ttsSupported}
                    onPlay={radio.play}
                    onPause={radio.pause}
                    onResume={radio.resume}
                    onStop={() => {
                      radio.stop();
                      setShowRadio(false);
                    }}
                    onNext={radio.next}
                    onPrev={radio.prev}
                    compact
                  />
                ) : (
                  <RadioMiniCard
                    estimatedMinutes={radio.estimatedMinutes}
                    itemCount={radio.queue.length}
                    ttsSupported={radio.ttsSupported}
                    onStart={handleStartRadio}
                  />
                )}

                {/* Today's Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Seu dia</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <span>
                        Disponibilidade:{" "}
                        <strong>
                          {DISPONIBILIDADE_OPTIONS.find((o) => o.value === todayCheckin?.disponibilidade)?.label}
                        </strong>
                      </span>
                    </div>

                    {todayCheckin?.foco_tipo && todayCheckin.foco_tipo !== "none" && (
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-primary" />
                        <span>
                          Foco: <Badge variant="secondary">{FOCO_TIPO_LABELS[todayCheckin.foco_tipo]}</Badge>
                        </span>
                      </div>
                    )}

                    {todayCheckin?.trava_texto && (
                      <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                        <div>
                          <p className="font-medium text-destructive">Bloqueio reportado</p>
                          <p className="text-sm text-muted-foreground">{todayCheckin.trava_texto}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions based on focus */}
                {todayCheckin?.foco_tipo === "task" && todayCheckin.foco_id && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Sua tarefa de hoje
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link to="/voluntario/squads">
                          Ver tarefa <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {todayCheckin?.foco_tipo === "mission" && todayCheckin.foco_id && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Sua missão de hoje
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link to={`/voluntario/missao/${todayCheckin.foco_id}`}>
                          Ver missão <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {todayCheckin?.foco_tipo === "crm" && todayCheckin.foco_id && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Phone className="h-5 w-5 text-primary" />
                        Contato de hoje
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link to="/voluntario/crm">
                          Ver contatos <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {todayCheckin?.foco_tipo === "agenda" && todayCheckin.foco_id && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Atividade de hoje
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button asChild className="w-full">
                        <Link to={`/voluntario/agenda/${todayCheckin.foco_id}`}>
                          Ver atividade <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Suggestions */}
                <LocalSuggestions 
                  apiSuggestions={suggestions || undefined}
                  isLoading={loadingSuggestions}
                  compact 
                />
              </div>
            </details>
          </div>
        </AppShell>
        <VoluntarioNavBar />
      </>
    );
  }

  // Check-in form
  return (
    <>
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6 p-4 pb-24">
        {/* Pilot Banner */}
        <PilotBanner />

        {/* Território Badge */}
        <TerritorioBadge />

        {/* Welcome Block (first-time after onboarding) */}
        <WelcomeBlock />

        {/* State A: No PilotTrackCard or WeekHeadline pre-checkin — the form IS the CTA */}
        
        {/* Header */}
        <div id="checkin-form">
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Check-in" : "Check-in do Dia"}
          </h1>
          <p className="text-muted-foreground">
            {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Availability */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quanto tempo você tem hoje?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={disponibilidade.toString()}
              onValueChange={(v) => setDisponibilidade(parseInt(v))}
              className="grid grid-cols-2 gap-3"
            >
              {DISPONIBILIDADE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value.toString()} id={`disp-${opt.value}`} />
                  <Label htmlFor={`disp-${opt.value}`} className="cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Focus Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Qual será seu foco?
            </CardTitle>
            <CardDescription>Escolha uma sugestão ou selecione manualmente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Suggestions */}
            {loadingSuggestions ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions?.task && (
                  <button
                    onClick={() => handleSelectSuggestion("task", suggestions.task!.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      focoTipo === "task" && focoId === suggestions.task.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Users className="h-5 w-5 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{suggestions.task.titulo}</p>
                      <p className="text-sm text-muted-foreground">{suggestions.task.squad_nome}</p>
                    </div>
                    {focoTipo === "task" && focoId === suggestions.task.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </button>
                )}

                {suggestions?.crm && (
                  <button
                    onClick={() => handleSelectSuggestion("crm", suggestions.crm!.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      focoTipo === "crm" && focoId === suggestions.crm.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Phone className="h-5 w-5 text-green-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">Contatar: {suggestions.crm.nome}</p>
                      <p className="text-sm text-muted-foreground">Follow-up pendente</p>
                    </div>
                    {focoTipo === "crm" && focoId === suggestions.crm.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </button>
                )}

                {suggestions?.mission && (
                  <button
                    onClick={() => handleSelectSuggestion("mission", suggestions.mission!.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      focoTipo === "mission" && focoId === suggestions.mission.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Target className="h-5 w-5 text-orange-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{suggestions.mission.title}</p>
                      <p className="text-sm text-muted-foreground">Missão ativa</p>
                    </div>
                    {focoTipo === "mission" && focoId === suggestions.mission.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </button>
                )}

                {suggestions?.agenda && (
                  <button
                    onClick={() => handleSelectSuggestion("agenda", suggestions.agenda!.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      focoTipo === "agenda" && focoId === suggestions.agenda.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{suggestions.agenda.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(suggestions.agenda.inicio_em), "HH:mm")} -{" "}
                        {suggestions.agenda.local_texto || "Local a definir"}
                      </p>
                    </div>
                    {focoTipo === "agenda" && focoId === suggestions.agenda.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </button>
                )}

                {/* No focus option */}
                <button
                  onClick={() => {
                    setFocoTipo("none");
                    setFocoId(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    focoTipo === "none" ? "border-primary bg-primary/5" : "hover:bg-accent"
                  }`}
                >
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Sem foco específico</p>
                    <p className="text-sm text-muted-foreground">Vou ver o que aparece</p>
                  </div>
                  {focoTipo === "none" && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blocker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Algum bloqueio?
            </CardTitle>
            <CardDescription>
              Opcional. Informe se algo está impedindo você de avançar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ex: Preciso de ajuda com..."
              value={travaTexto}
              onChange={(e) => setTravaTexto(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          {isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
              Cancelar
            </Button>
          )}
          <Button
            onClick={isEditing ? handleUpdateCheckin : handleSubmitCheckin}
            disabled={createCheckin.isPending || updateCheckin.isPending}
            className="flex-1"
          >
            {createCheckin.isPending || updateCheckin.isPending
              ? "Salvando..."
              : isEditing
              ? "Atualizar"
              : "Fazer Check-in"}
          </Button>
        </div>
      </div>
    </AppShell>
    <VoluntarioNavBar />
    </>
  );
}
