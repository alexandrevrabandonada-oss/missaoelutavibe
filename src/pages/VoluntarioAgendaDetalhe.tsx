import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useAtividades, useAtividadeRsvp, ATIVIDADE_TIPO_LABELS, Atividade } from "@/hooks/useAtividades";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PreCampaignBadge } from "@/components/ui/PreCampaignBadge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { RsvpButtons } from "@/components/agenda/RsvpButtons";
import { CheckinButton } from "@/components/agenda/CheckinButton";
import { ReciboAtividade } from "@/components/agenda/ReciboAtividade";
import { MyEventInvitesCard } from "@/components/crm/MyEventInvitesCard";
import { EventModePanel } from "@/components/event/EventModePanel";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Home,
  Calendar,
  MapPin,
  Clock,
  User,
  CalendarDays,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default function VoluntarioAgendaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading: authLoading, hasAccess } = useRequireApproval();
  const { getAtividade } = useAtividades();
  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const isEventMode = searchParams.get("mode") === "event";

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await getAtividade(id);
        setAtividade(data);
      } catch (error) {
        console.error("Error loading atividade:", error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, getAtividade]);

  if (authLoading || isLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  if (!atividade) {
    return (
      <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/agenda")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
            <Home className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Atividade não encontrada.</p>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = atividade.status === "cancelada";
  const isCompleted = atividade.status === "concluida";
  const isPast = new Date(atividade.inicio_em) < new Date();

  const startDate = new Date(atividade.inicio_em);
  const endDate = atividade.fim_em ? new Date(atividade.fim_em) : null;

  return (
    <div className="min-h-screen flex flex-col p-6 bg-background texture-concrete">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/agenda")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Logo size="sm" />
        <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
          <Home className="h-5 w-5" />
        </Button>
      </div>

      <PreCampaignBadge className="mb-4" />

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Event Mode Panel - Shows when ?mode=event */}
        {isEventMode && !isCancelled && (
          <EventModePanel eventId={atividade.id} eventTitle={atividade.titulo} />
        )}

        {/* Status Banners */}
        {isCancelled && (
          <div className="card-luta border-destructive/50 bg-destructive/10">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-bold">Atividade Cancelada</span>
            </div>
          </div>
        )}
        {isCompleted && (
          <div className="card-luta border-green-500/50 bg-green-500/10">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-bold">Atividade Concluída</span>
            </div>
          </div>
        )}

        {/* Header Info */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="secondary">{ATIVIDADE_TIPO_LABELS[atividade.tipo]}</Badge>
            {atividade.celula && (
              <Badge variant="outline">{atividade.celula.name}</Badge>
            )}
            {atividade.ciclo && (
              <Badge variant="outline" className="text-primary border-primary/50">
                {atividade.ciclo.titulo}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-2">{atividade.titulo}</h1>
        </div>

        {/* Date & Time */}
        <div className="card-luta">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-medium">
                {format(startDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <span>
                {format(startDate, "HH:mm")}
                {endDate && ` – ${format(endDate, "HH:mm")}`}
              </span>
            </div>
            {atividade.local_texto && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <span>{atividade.local_texto}</span>
              </div>
            )}
            {atividade.responsavel && (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <span>
                  Responsável: {atividade.responsavel.nickname || atividade.responsavel.full_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {atividade.descricao && (
          <div className="card-luta">
            <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-2">
              Descrição
            </h2>
            <p className="text-sm whitespace-pre-wrap">{atividade.descricao}</p>
          </div>
        )}

        {/* Cycle Link */}
        {atividade.ciclo_id && (
          <Link
            to="/voluntario/missoes"
            className="card-luta border-primary/30 bg-primary/5 flex items-center gap-2 text-primary hover:underline"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="text-sm">Ver Semana Operacional →</span>
          </Link>
        )}

        {/* Receipt Section - Show if activity is completed with receipt */}
        {isCompleted && atividade.recibo_json && (
          <div className="card-luta border-green-500/30 bg-green-500/5">
            <ReciboAtividade recibo={atividade.recibo_json} />
          </div>
        )}

        {/* My Event Invites Card - Show user's CRM invites for this event */}
        <MyEventInvitesCard eventId={atividade.id} className="card-luta" />

        {/* Check-in Section */}
        {!isCancelled && !isCompleted && !isPast && (
          <div className="card-luta">
            <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-3">
              Check-in
            </h2>
            <CheckinButton atividadeId={atividade.id} />
          </div>
        )}

        {/* RSVP Section */}
        {!isCancelled && !isCompleted && !isPast && (
          <div className="card-luta">
            <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-3">
              Confirmar Presença
            </h2>
            <RsvpButtons atividadeId={atividade.id} />
          </div>
        )}
      </div>

      <p className="signature-luta mt-8">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}
