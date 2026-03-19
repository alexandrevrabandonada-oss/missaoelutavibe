import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useSemana } from "@/hooks/useSemana";
import { useMyCycleTasks } from "@/hooks/useCycleBacklog";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PreCampaignBadge } from "@/components/ui/PreCampaignBadge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { CycleTasksSection } from "@/components/volunteer/CycleTasksSection";
import { RadioPlayer } from "@/components/a11y/RadioPlayer";
import { useRadioQueue, buildQueueFromSemana } from "@/hooks/useRadioQueue";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Home,
  Calendar,
  Target,
  CalendarDays,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  FileText,
  Rocket,
  Trophy,
  Radio,
} from "lucide-react";

export default function VoluntarioSemana() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { isLoading, hasAccess } = useRequireApproval();
  const {
    activeCycle,
    hasCycle,
    isLoadingCycle,
    weeklyPlan,
    isLoadingPlan,
    metas,
    missions,
    isLoadingMissions,
    atividades,
    isLoadingAtividades,
  } = useSemana();

  const { tasks: cycleTasks } = useMyCycleTasks(activeCycle?.id);
  const [showRadio, setShowRadio] = useState(false);
  const radio = useRadioQueue();

  // Build radio queue when data is available
  useEffect(() => {
    if (hasCycle && activeCycle && !radio.hasQueue) {
      const now = new Date();
      const upcomingAtvs = atividades.filter(
        (a) => new Date(a.inicio_em) >= now && a.status === "publicada"
      );
      
      const queue = buildQueueFromSemana({
        weeklyPlan: weeklyPlan,
        metas: metas,
        atividades: upcomingAtvs,
        tasks: cycleTasks,
        missions: missions.filter(m => m.status === "publicada" || m.status === "em_andamento"),
      });
      
      if (queue.length > 0) {
        radio.setQueue(queue);
      }
    }
  }, [hasCycle, activeCycle, weeklyPlan, metas, atividades, cycleTasks, missions]);

  const handleStartRadio = () => {
    setShowRadio(true);
    radio.play();
  };

  if (isLoading || profileLoading || isLoadingCycle) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  // Filter missions by status
  const activeMissions = missions.filter(
    (m) => m.status === "publicada" || m.status === "em_andamento"
  );
  const completedMissions = missions.filter(
    (m) => m.status === "validada" || m.status === "concluida"
  );

  // Filter upcoming activities
  const now = new Date();
  const upcomingAtividades = atividades.filter(
    (a) => new Date(a.inicio_em) >= now && a.status === "publicada"
  );
  
  // Filter completed activities (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const completedAtividades = atividades.filter(
    (a) => a.status === "concluida" && a.concluida_em && new Date(a.concluida_em) >= sevenDaysAgo
  );

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
          <Home className="h-5 w-5" />
        </Button>
      </div>

      {/* Pre-campaign Badge */}
      <PreCampaignBadge className="mb-4" />

      <div className="flex-1 space-y-6 animate-slide-up">
        {hasCycle && activeCycle ? (
          <>
            {/* Active Cycle Header */}
            <div className="card-luta border-primary/50 bg-primary/5">
              <div className="flex items-start gap-3">
                <Calendar className="h-6 w-6 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl font-bold">{activeCycle.titulo}</h1>
                    <Badge variant="default" className="text-xs uppercase">
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(activeCycle.inicio), "dd/MM", { locale: ptBR })} —{" "}
                    {format(new Date(activeCycle.fim), "dd/MM", { locale: ptBR })}
                  </p>
                </div>
              </div>
              
              {/* Radio Button */}
              {radio.hasQueue && radio.ttsSupported && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/50 text-primary"
                  onClick={handleStartRadio}
                >
                  <Radio className="h-4 w-4 mr-1" />
                  Ouvir
                </Button>
              )}
            </div>

            {/* Radio Player */}
            {showRadio && radio.hasQueue && (
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
              />
            )}

            {/* Weekly Plan */}
            <section>
              <div className="flex items-center gap-2 text-primary mb-3">
                <Megaphone className="h-5 w-5" />
                <span className="text-sm uppercase tracking-wider font-bold">
                  Plano da Semana
                </span>
              </div>

              {isLoadingPlan ? (
                <div className="card-luta text-center py-6">
                  <p className="text-muted-foreground text-sm">Carregando...</p>
                </div>
              ) : weeklyPlan ? (
                <Link
                  to={`/voluntario/anuncios/${weeklyPlan.id}`}
                  className="card-luta block hover:bg-secondary/80 transition-colors"
                >
                  <h3 className="font-bold mb-2">{weeklyPlan.titulo}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {weeklyPlan.texto}
                  </p>
                  <span className="text-xs text-primary mt-2 inline-block">
                    Ler mais →
                  </span>
                </Link>
              ) : (
                <div className="card-luta text-center py-6 border-dashed">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Plano da semana ainda não publicado
                  </p>
                </div>
              )}
            </section>

            {/* Weekly Goals */}
            <section>
              <div className="flex items-center gap-2 text-primary mb-3">
                <Target className="h-5 w-5" />
                <span className="text-sm uppercase tracking-wider font-bold">
                  Metas da Semana
                </span>
              </div>

              {metas.length > 0 ? (
                <div className="card-luta space-y-2">
                  {metas.map((meta, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{meta}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-luta text-center py-6 border-dashed">
                  <p className="text-muted-foreground text-sm">
                    Metas ainda não definidas
                  </p>
                </div>
              )}
            </section>

            {/* Weekly Agenda */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-primary">
                  <CalendarDays className="h-5 w-5" />
                  <span className="text-sm uppercase tracking-wider font-bold">
                    Agenda da Semana
                  </span>
                </div>
                <Link
                  to="/voluntario/agenda"
                  className="text-xs text-primary hover:underline"
                >
                  Ver todas →
                </Link>
              </div>

              {isLoadingAtividades ? (
                <div className="card-luta text-center py-6">
                  <p className="text-muted-foreground text-sm">Carregando...</p>
                </div>
              ) : upcomingAtividades.length > 0 || completedAtividades.length > 0 ? (
                <div className="space-y-4">
                  {/* Upcoming */}
                  {upcomingAtividades.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        Próximas
                      </p>
                      <div className="space-y-2">
                        {upcomingAtividades.slice(0, 3).map((atividade) => (
                          <Link
                            key={atividade.id}
                            to={`/voluntario/agenda/${atividade.id}`}
                            className="card-luta block hover:bg-secondary/80 transition-colors py-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-center min-w-[50px]">
                                <p className="text-lg font-bold text-primary">
                                  {format(new Date(atividade.inicio_em), "dd")}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase">
                                  {format(new Date(atividade.inicio_em), "EEE", {
                                    locale: ptBR,
                                  })}
                                </p>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{atividade.titulo}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(atividade.inicio_em), "HH:mm")}
                                  {atividade.local_texto && ` • ${atividade.local_texto}`}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed with receipts */}
                  {completedAtividades.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        Concluídas
                      </p>
                      <div className="space-y-2">
                        {completedAtividades.slice(0, 2).map((atividade) => (
                          <Link
                            key={atividade.id}
                            to={`/voluntario/agenda/${atividade.id}`}
                            className="card-luta block hover:bg-secondary/80 transition-colors py-3 border-green-500/20"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-center min-w-[50px]">
                                <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{atividade.titulo}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {atividade.recibo_json ? (
                                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                                      <FileText className="h-3 w-3 mr-1" />
                                      Recibo disponível
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Concluída</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card-luta text-center py-6 border-dashed">
                  <p className="text-muted-foreground text-sm">
                    Nenhuma atividade agendada
                  </p>
                </div>
              )}
            </section>

            {/* Cycle Tasks */}
            {activeCycle && (
              <CycleTasksSection cicloId={activeCycle.id} compact />
            )}

            {/* Weekly Missions */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-primary">
                  <Rocket className="h-5 w-5" />
                  <span className="text-sm uppercase tracking-wider font-bold">
                    Missões da Semana
                  </span>
                </div>
                <Link
                  to="/voluntario/missoes"
                  className="text-xs text-primary hover:underline"
                >
                  Ver todas →
                </Link>
              </div>

              {isLoadingMissions ? (
                <div className="card-luta text-center py-6">
                  <p className="text-muted-foreground text-sm">Carregando...</p>
                </div>
              ) : missions.length > 0 ? (
                <div className="space-y-2">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card-luta text-center py-3">
                      <p className="text-2xl font-bold text-primary">
                        {activeMissions.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Ativas</p>
                    </div>
                    <div className="card-luta text-center py-3">
                      <p className="text-2xl font-bold text-green-600">
                        {completedMissions.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Concluídas</p>
                    </div>
                  </div>

                  {/* Mission list preview */}
                  {activeMissions.slice(0, 2).map((mission) => (
                    <Link
                      key={mission.id}
                      to={`/voluntario/missao/${mission.id}`}
                      className="card-luta block hover:bg-secondary/80 transition-colors py-3"
                    >
                      <h4 className="font-medium text-sm">{mission.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {mission.type}
                        </Badge>
                        {mission.points && (
                          <span className="text-xs text-primary font-bold">
                            +{mission.points} pts
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="card-luta text-center py-6 border-dashed">
                  <p className="text-muted-foreground text-sm">
                    Nenhuma missão neste ciclo
                  </p>
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section>
              <div className="flex items-center gap-2 text-primary mb-3">
                <span className="text-sm uppercase tracking-wider font-bold">
                  Ações Rápidas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => navigate("/voluntario/agenda")}
                >
                  <CalendarDays className="h-5 w-5" />
                  <span className="text-xs">Ver Agenda</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => navigate("/voluntario/missoes")}
                >
                  <Target className="h-5 w-5" />
                  <span className="text-xs">Ver Missões</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => navigate("/voluntario/inbox/novo")}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-xs">Abrir Ticket</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => navigate("/voluntario/anuncios")}
                >
                  <Megaphone className="h-5 w-5" />
                  <span className="text-xs">Ver Anúncios</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1 border-primary/30"
                  onClick={() => navigate("/voluntario/top")}
                >
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="text-xs">Top da Semana</span>
                </Button>
              </div>
            </section>
          </>
        ) : (
          /* No Active Cycle */
          <div className="space-y-6">
            <div className="card-luta text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-bold mb-2">Sem ciclo ativo</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Não há ciclo semanal ativo no seu território.
              </p>
            </div>

            {/* Fallback: Recent missions */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-primary">
                  <Rocket className="h-5 w-5" />
                  <span className="text-sm uppercase tracking-wider font-bold">
                    Missões Recentes
                  </span>
                </div>
                <Link
                  to="/voluntario/missoes"
                  className="text-xs text-primary hover:underline"
                >
                  Ver todas →
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Acesse suas missões para ver atividades dos últimos 7 dias.
              </p>
            </section>

            {/* Fallback: Upcoming activities */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-primary">
                  <CalendarDays className="h-5 w-5" />
                  <span className="text-sm uppercase tracking-wider font-bold">
                    Próximas Atividades
                  </span>
                </div>
                <Link
                  to="/voluntario/agenda"
                  className="text-xs text-primary hover:underline"
                >
                  Ver todas →
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Confira a agenda para atividades no seu território.
              </p>
            </section>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                onClick={() => navigate("/voluntario/missoes")}
              >
                <Target className="h-5 w-5" />
                <span className="text-xs">Ver Missões</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex-col gap-1"
                onClick={() => navigate("/voluntario/agenda")}
              >
                <CalendarDays className="h-5 w-5" />
                <span className="text-xs">Ver Agenda</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Signature */}
      <p className="signature-luta mt-8">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}
