import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useMissions } from "@/hooks/useMissions";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useDailyCheckin } from "@/hooks/useCadencia";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { SignalsBar } from "@/components/signals/SignalsBar";
import { TTSButton } from "@/components/a11y/TTSButton";
import { MissionProofGuide } from "@/components/missions/MissionProofGuide";
import { JourneyStepIndicator } from "@/components/missions/JourneyStepIndicator";
import { getJourneyStatus } from "@/lib/journeyStatus";
import { resolveTemplate } from "@/lib/missionTemplate";
import { 
  ArrowLeft, 
  Send,
  Target,
  Clock,
  FileText,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  MessageSquareDashed,
  Heart,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VoluntarioMissao() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { missions, isLoading, updateStatus } = useMissions();
  const { isPending, isRejected, isApproved, isStatusLoading } = useVolunteerStatus();
  const { todayCheckin } = useDailyCheckin();
  const navigate = useNavigate();

  // Fetch user's latest evidence for this mission
  const { data: latestEvidence } = useQuery({
    queryKey: ["mission-evidence", id, user?.id],
    queryFn: async () => {
      if (!id || !user?.id) return null;
      const { data } = await supabase
        .from("evidences")
        .select("id, status, rejection_reason, how_to_fix")
        .eq("mission_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  // Redirect unapproved users
  useEffect(() => {
    if (!isStatusLoading && (isPending || isRejected)) {
      navigate("/aguardando-aprovacao", { replace: true });
    }
  }, [isPending, isRejected, isStatusLoading, navigate]);

  const mission = missions.find(m => m.id === id);

  const template = useMemo(() => {
    if (!mission) return null;
    const availableMin = todayCheckin?.disponibilidade ?? null;
    return resolveTemplate(mission, availableMin);
  }, [mission, todayCheckin]);

  if (isLoading || isStatusLoading) {
    return <FullPageLoader />;
  }

  if (!isApproved) {
    return <FullPageLoader />;
  }

  if (!mission) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Missão não encontrada</h1>
        <Button onClick={() => navigate("/voluntario")} variant="outline">
          Voltar
        </Button>
      </div>
    );
  }

  const handleAcceptMission = async () => {
    if (!user?.id || !id) return;

    try {
      const { error } = await supabase
        .from("missions")
        .update({ 
          assigned_to: user.id,
          status: "em_andamento"
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Missão aceita! Boa sorte!");
      updateStatus({ id, status: "em_andamento" });
    } catch (error) {
      console.error("Error accepting mission:", error);
      toast.error("Erro ao aceitar missão");
    }
  };

  const isAssignedToUser = mission.assigned_to === user?.id;
  const canSendEvidence = isAssignedToUser && 
    ["em_andamento", "reprovada"].includes(mission.status || "");
  const isCompleted = mission.status === "validada" || mission.status === "concluida";
  const isPendingValidation = mission.status === "enviada";
  const wasRejected = mission.status === "reprovada";

  const missionTypeLabels: Record<string, string> = {
    escuta: "Escuta Ativa",
    rua: "Ação de Rua",
    mobilizacao: "Mobilização",
    conteudo: "Criação de Conteúdo",
    dados: "Coleta de Dados",
    formacao: "Formação",
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
      </div>

      <div className="flex-1 animate-slide-up">
        {/* F20: Unified status indicator */}
        {(() => {
          const evidenceStatus = latestEvidence?.status ?? null;
          const hasEvidence = !!latestEvidence;
          const jStatus = getJourneyStatus(evidenceStatus, hasEvidence);
          const StatusIcon = jStatus.icon;
          
          // Only show for states beyond "not started"
          if (!hasEvidence && !isCompleted) return null;
          
          const isActionNeeded = evidenceStatus === "precisa_ajuste" || evidenceStatus === "rejeitado";
          
          return (
            <div className="mb-4 space-y-2">
              {isActionNeeded ? (
                <Link
                  to="/voluntario/meus-registros"
                  className={`flex items-center gap-2 ${jStatus.colorClass} hover:underline`}
                >
                  <StatusIcon className="h-5 w-5" />
                  <span className="text-sm uppercase tracking-wider font-bold">{jStatus.label}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className={`flex items-center gap-2 ${jStatus.colorClass}`}>
                  <StatusIcon className="h-5 w-5" />
                  <span className="text-sm uppercase tracking-wider font-bold">{jStatus.label}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{jStatus.hint}</p>
              <JourneyStepIndicator currentStep={jStatus.journeyStep} />
            </div>
          );
        })()}

        {/* Mission Title + TTS */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold">{mission.title}</h1>
          <TTSButton 
            text={`${mission.title}. ${mission.description || ""}. ${mission.instructions ? `Instruções: ${mission.instructions}` : ""}`}
            variant="iconOnly"
          />
        </div>
        
        {/* Meta Info */}
        <div className="flex flex-wrap gap-3 mb-6">
          <span className="inline-flex items-center gap-1 text-sm px-3 py-1 bg-secondary rounded-full">
            <Target className="h-4 w-4" />
            {missionTypeLabels[mission.type] || mission.type}
          </span>
          {mission.points && (
            <span className="inline-flex items-center gap-1 text-sm px-3 py-1 bg-primary/20 text-primary rounded-full font-bold">
              +{mission.points} pontos
            </span>
          )}
          {mission.deadline && (
            <span className="inline-flex items-center gap-1 text-sm px-3 py-1 bg-secondary rounded-full">
              <Calendar className="h-4 w-4" />
              {format(new Date(mission.deadline), "dd MMM", { locale: ptBR })}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="card-luta mb-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-bold mb-2">Descrição</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {mission.description || "Sem descrição detalhada."}
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {mission.instructions && (
          <div className="card-luta mb-6">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-bold mb-2">Instruções</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {mission.instructions}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Template: Por que importa */}
        {template?.porque_importa && (
          <div className="card-luta mb-6 border-primary/30 bg-primary/5">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-bold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Por que importa</h3>
                <p className="text-foreground font-medium">{template.porque_importa}</p>
              </div>
            </div>
          </div>
        )}

        {/* Template: Como fazer (time-adapted) */}
        {template && template.como_fazer.length > 0 && (
          <div className="card-luta mb-6">
            <div className="flex items-start gap-3">
              <ListChecks className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Como fazer</h3>
                  {template.resolved_minutes && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />~{template.resolved_minutes}min
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  {template.como_fazer.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="font-bold text-primary mt-0.5">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Template: Como provar */}
        {template?.como_provar && (
          <div className="card-luta mb-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-bold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Como provar</h3>
                <p className="text-sm text-muted-foreground">{template.como_provar}</p>
              </div>
            </div>
          </div>
        )}

        {/* Proof Guide — shown before CTA when user can send a registro */}
        {canSendEvidence && (
          <MissionProofGuide missionType={mission.type} className="mb-6" />
        )}

        {mission.debate_topico_id && (
          <div className="card-luta mb-6 border-primary/30 bg-primary/5">
            <div className="flex items-start gap-3">
              <MessageSquareDashed className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">Origem: Debate</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  Esta missão foi criada a partir de um debate.
                </p>
                <Link 
                  to={`/debates/topico/${mission.debate_topico_id}`}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Ver debate original →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Feedback */}
        {wasRejected && (
          <div className="card-luta border-destructive/50 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-bold text-destructive mb-2">Registro rejeitado</h3>
                <p className="text-muted-foreground text-sm">
                  Seu registro foi rejeitado. Revise e reenvie pelo modo rápido ou completo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Signals - only for public missions */}
        {!mission.privado && mission.type !== "conversa" && (
          <div className="card-luta mb-6">
            <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
              Sinais de Utilidade
            </h3>
            <SignalsBar targetType="mission" targetId={mission.id} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-6 space-y-3 safe-bottom">
        {/* Published & unassigned — primary CTA goes to Runner */}
        {(!mission.assigned_to || !isAssignedToUser) && mission.status === "publicada" && (
          <Button
            onClick={() => navigate(`/voluntario/runner/${mission.id}`)}
            className="btn-luta w-full"
          >
            <Target className="h-4 w-4 mr-2" />
            COMEÇAR AGORA
          </Button>
        )}

        {/* Already assigned — Runner shortcut */}
        {isAssignedToUser && mission.status === "em_andamento" && (
          <Button
            onClick={() => navigate(`/voluntario/runner/${mission.id}`)}
            className="btn-luta w-full"
          >
            <Target className="h-4 w-4 mr-2" />
            CONTINUAR MISSÃO
          </Button>
        )}

        {/* Quick Registration — primary CTA when canSendEvidence */}
        {canSendEvidence && (
          <>
            <Button
              onClick={() => navigate(`/voluntario/registro/${mission.id}`)}
              className="btn-luta w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {wasRejected ? "Reenviar Registro" : "Registrar ação"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/voluntario/evidencia/${mission.id}`)}
              className="w-full text-muted-foreground"
            >
              <FileText className="h-4 w-4 mr-2" />
              Modo completo
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </>
        )}

        {/* Pending validation */}
        {isPendingValidation && (
          <div className="text-center py-4 rounded-lg bg-muted/50 border border-border">
            <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-sm">Registro em análise</p>
            <p className="text-muted-foreground text-xs mt-1">
              A coordenação está revisando seu registro.
            </p>
          </div>
        )}

        {/* Completed */}
        {isCompleted && (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="font-bold text-primary">Parabéns!</p>
            <p className="text-muted-foreground text-sm">
              Missão concluída com sucesso.
            </p>
          </div>
        )}

        <Button 
          variant="outline" 
          onClick={() => navigate("/voluntario")} 
          className="w-full"
        >
          Voltar às Missões
        </Button>
      </div>
    </div>
  );
}
