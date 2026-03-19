import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useCiclos } from "@/hooks/useCiclos";
import { useAtividades, ATIVIDADE_TIPO_LABELS, Atividade } from "@/hooks/useAtividades";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PreCampaignBadge } from "@/components/ui/PreCampaignBadge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { RsvpButtons } from "@/components/agenda/RsvpButtons";
import { format, isToday, isTomorrow, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Home,
  Calendar,
  MapPin,
  Clock,
  Users,
  AlertCircle,
  CalendarDays,
} from "lucide-react";

export default function VoluntarioAgenda() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { isLoading: authLoading, hasAccess } = useRequireApproval();
  const { activeCycle, isLoadingActive } = useCiclos();
  const navigate = useNavigate();

  const now = new Date();
  const sevenDaysLater = addDays(now, 7);

  // Get activities for the next 7 days
  const { atividades, isLoading: atividadesLoading } = useAtividades({
    status: "publicada",
    startDate: startOfDay(now),
    endDate: sevenDaysLater,
    limit: 20,
  });

  if (authLoading || profileLoading || isLoadingActive) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  // Group activities by day
  const groupedByDay = atividades.reduce((acc, atividade) => {
    const day = startOfDay(new Date(atividade.inicio_em)).toISOString();
    if (!acc[day]) acc[day] = [];
    acc[day].push(atividade);
    return acc;
  }, {} as Record<string, Atividade[]>);

  const formatDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  };

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

      <PreCampaignBadge className="mb-4" />

      <div className="flex-1 space-y-6 animate-slide-up">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <CalendarDays className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Agenda</span>
          </div>
          <h1 className="text-2xl font-bold">Próximas Atividades</h1>
          <p className="text-muted-foreground text-sm">
            Reuniões, panfletagens e ações da semana
          </p>
        </div>

        {/* Active Cycle Info */}
        {activeCycle ? (
          <div className="card-luta border-primary/50 bg-primary/5">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm">Ciclo: {activeCycle.titulo}</h3>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(activeCycle.inicio), "dd/MM", { locale: ptBR })} – {format(new Date(activeCycle.fim), "dd/MM", { locale: ptBR })}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-luta border-muted bg-muted/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Sem ciclo ativo. Mostrando atividades dos próximos 7 dias.
              </p>
            </div>
          </div>
        )}

        {/* Activities List */}
        {atividadesLoading ? (
          <div className="card-luta text-center py-6">
            <p className="text-muted-foreground text-sm">Carregando...</p>
          </div>
        ) : atividades.length === 0 ? (
          <div className="card-luta text-center py-8">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhuma atividade agendada para os próximos dias.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDay).map(([dayStr, dayActivities]) => (
              <section key={dayStr}>
                <h2 className="text-sm uppercase tracking-wider font-bold text-muted-foreground mb-3 capitalize">
                  {formatDayLabel(dayStr)}
                </h2>
                <div className="space-y-3">
                  {dayActivities.map((atividade) => (
                    <ActivityCard
                      key={atividade.id}
                      atividade={atividade}
                      onClick={() => navigate(`/voluntario/agenda/${atividade.id}`)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <p className="signature-luta mt-8">#ÉLUTA — Escutar • Cuidar • Organizar</p>
    </div>
  );
}

function ActivityCard({
  atividade,
  onClick,
}: {
  atividade: Atividade;
  onClick: () => void;
}) {
  const startTime = format(new Date(atividade.inicio_em), "HH:mm");
  const endTime = atividade.fim_em
    ? format(new Date(atividade.fim_em), "HH:mm")
    : null;

  return (
    <div
      className="card-luta hover:bg-secondary/80 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {ATIVIDADE_TIPO_LABELS[atividade.tipo]}
            </Badge>
            {atividade.celula && (
              <Badge variant="outline" className="text-xs">
                {atividade.celula.name}
              </Badge>
            )}
          </div>
          <h3 className="font-bold text-sm mb-1 truncate">{atividade.titulo}</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {startTime}
              {endTime && ` – ${endTime}`}
            </span>
            {atividade.local_texto && (
              <span className="flex items-center gap-1 truncate max-w-[150px]">
                <MapPin className="h-3 w-3" />
                {atividade.local_texto}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <RsvpButtons atividadeId={atividade.id} compact />
        </div>
      </div>
    </div>
  );
}
