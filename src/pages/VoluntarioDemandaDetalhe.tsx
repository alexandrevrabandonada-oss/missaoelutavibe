import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVolunteerStatus } from "@/hooks/useVolunteerStatus";
import { useDemandas, DEMANDA_STATUS_LABELS, DEMANDA_TIPO_LABELS, DEMANDA_PRIORIDADE_LABELS } from "@/hooks/useDemandas";
import { useDemandasUpdates } from "@/hooks/useDemandasUpdates";
import { useMissionsByDemandas } from "@/hooks/useMissionsByDemanda";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FullPageLoader, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect } from "react";
import {
  ArrowLeft,
  MessageSquare,
  MessageSquareDashed,
  MapPin,
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
} from "lucide-react";

export default function VoluntarioDemandaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPending, isRejected, isApproved, isStatusLoading } = useVolunteerStatus();
  const { userDemandas, isLoading } = useDemandas();
  const { updates, isLoading: updatesLoading } = useDemandasUpdates(id);
  
  // Check if this demand has a linked mission
  const { demandaToMission, isLoading: missionLoading } = useMissionsByDemandas(id ? [id] : []);
  const linkedMission = id ? demandaToMission[id] : null;

  // Redirect unapproved users
  useEffect(() => {
    if (!isStatusLoading && (isPending || isRejected)) {
      navigate("/aguardando-aprovacao", { replace: true });
    }
  }, [isPending, isRejected, isStatusLoading, navigate]);

  if (isLoading || isStatusLoading) {
    return <FullPageLoader />;
  }

  if (!isApproved) {
    return <FullPageLoader />;
  }

  const demanda = userDemandas.find((d) => d.id === id);

  if (!demanda) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background texture-concrete">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Demanda não encontrada</h1>
        <Button onClick={() => navigate("/voluntario/demandas")}>Voltar</Button>
      </div>
    );
  }

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta":
        return "text-destructive bg-destructive/10";
      case "media":
        return "text-primary bg-primary/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    if (["concluida", "arquivada"].includes(status)) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    return <Clock className="h-5 w-5 text-primary" />;
  };

  // Only show updates visible to volunteer
  const visibleUpdates = updates.filter((u) => u.visivel_para_voluntario);

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/demandas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6 animate-slide-up">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Minha Demanda</span>
          </div>
          <h1 className="text-2xl font-bold">{demanda.titulo}</h1>
          <p className="text-muted-foreground text-sm">
            Criada em {format(new Date(demanda.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        {/* Linked Mission Card */}
        {linkedMission && (
          <Link 
            to={`/voluntario/missao/${linkedMission.id}`}
            className="card-luta border-green-500/50 bg-green-500/5 hover:bg-green-500/10 transition-colors block"
          >
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm">Virou Missão! 🎯</h3>
                  <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">
                    Ativa
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  Esta demanda foi convertida em missão pela coordenação.
                </p>
                <span className="text-green-600 text-sm font-medium mt-2 inline-block">
                  Ver missão →
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Status Card */}
        <div className="card-luta border-primary/50">
          <div className="flex items-center gap-3">
            {getStatusIcon(demanda.status)}
            <div>
              <p className="font-bold">
                {DEMANDA_STATUS_LABELS[demanda.status as keyof typeof DEMANDA_STATUS_LABELS]}
              </p>
              <p className="text-sm text-muted-foreground">
                {demanda.status === "nova" && "Aguardando análise da coordenação"}
                {demanda.status === "triagem" && "Em análise pela coordenação"}
                {demanda.status === "atribuida" && "Um coordenador está cuidando desta demanda"}
                {demanda.status === "agendada" && "Ação agendada pela coordenação"}
                {demanda.status === "concluida" && "Demanda resolvida!"}
                {demanda.status === "arquivada" && "Demanda arquivada"}
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="card-luta space-y-4">
          <p className="text-foreground">{demanda.descricao}</p>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-secondary rounded-full">
              {DEMANDA_TIPO_LABELS[demanda.tipo as keyof typeof DEMANDA_TIPO_LABELS]}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${getPrioridadeColor(demanda.prioridade)}`}>
              {DEMANDA_PRIORIDADE_LABELS[demanda.prioridade as keyof typeof DEMANDA_PRIORIDADE_LABELS]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {demanda.territorio && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{demanda.territorio}</span>
              </div>
            )}
            {demanda.contato && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{demanda.contato}</span>
              </div>
            )}
            {demanda.prazo && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Prazo: {format(new Date(demanda.prazo), "dd/MM/yyyy")}</span>
              </div>
            )}
          </div>

          {demanda.resolucao && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Resolução</p>
              <p className="text-sm">{demanda.resolucao}</p>
            </div>
          )}
        </div>

        {/* Origin - Debate Link */}
        {demanda.debate_topico_id && (
          <div className="card-luta border-primary/30 bg-primary/5">
            <div className="flex items-start gap-3">
              <MessageSquareDashed className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">Origem: Debate</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  Esta demanda foi criada a partir de um debate.
                </p>
                <Link 
                  to={`/debates/topico/${demanda.debate_topico_id}`}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Ver debate original →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Responses from Coordination */}
        <div className="card-luta">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Respostas da Coordenação
          </p>

          {updatesLoading ? (
            <LoadingSpinner size="sm" />
          ) : visibleUpdates.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhuma resposta ainda. Aguarde o retorno da coordenação.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleUpdates.map((update) => (
                <div key={update.id} className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-sm">{update.mensagem}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(update.created_at), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="signature-luta text-center py-4">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}
