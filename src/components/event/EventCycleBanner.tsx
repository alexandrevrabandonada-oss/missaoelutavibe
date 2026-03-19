/**
 * EventCycleBanner - Shows contextual banner when user has upcoming event
 * 
 * Appears on Hoje page only when relevant (event within 36h window)
 */

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNextEventPrompt, EventStage } from "@/hooks/useEventParticipation";
import { useLogGrowthEvent } from "@/hooks/useGrowth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, MapPin, Clock, CheckCircle, PartyPopper } from "lucide-react";
import { useEffect } from "react";

export function EventCycleBanner() {
  const navigate = useNavigate();
  const { data: prompt, isLoading } = useNextEventPrompt();
  const { mutate: logEvent } = useLogGrowthEvent();

  // Track banner shown
  useEffect(() => {
    if (prompt && prompt.suggested_stage !== "none") {
      logEvent({
        eventType: "event_cycle_banner_shown",
        meta: { stage: prompt.suggested_stage },
      });
    }
  }, [prompt?.event_id, prompt?.suggested_stage]);

  if (isLoading || !prompt || prompt.suggested_stage === "none") {
    return null;
  }

  const { event_id, title, starts_at, location, suggested_stage, my_participation_status } = prompt;

  const handleClick = () => {
    logEvent({
      eventType: "event_cycle_banner_clicked",
      meta: { stage: suggested_stage },
    });
    navigate(`/voluntario/agenda/${event_id}?mode=event`);
  };

  const startDate = new Date(starts_at);
  const dateStr = format(startDate, "EEEE, dd/MM", { locale: ptBR });
  const timeStr = format(startDate, "HH:mm");

  const getStageConfig = (stage: EventStage) => {
    switch (stage) {
      case "pre":
        return {
          icon: CalendarCheck,
          title: "Atividade chegando!",
          buttonText: "VER ATIVIDADE",
          buttonVariant: "default" as const,
          bgClass: "bg-primary/10 border-primary/30",
        };
      case "day_of":
        return {
          icon: CheckCircle,
          title: my_participation_status === "checked_in" ? "Você está no evento!" : "Evento acontecendo!",
          buttonText: my_participation_status === "checked_in" ? "CONTINUAR" : "FAZER CHECK-IN",
          buttonVariant: "default" as const,
          bgClass: "bg-green-500/10 border-green-500/30",
        };
      case "post":
        return {
          icon: PartyPopper,
          title: "Evento finalizado!",
          buttonText: "FECHAR EVENTO (2 min)",
          buttonVariant: "secondary" as const,
          bgClass: "bg-amber-500/10 border-amber-500/30",
        };
      default:
        return null;
    }
  };

  const config = getStageConfig(suggested_stage);
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Card className={`${config.bgClass} border`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-background">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {config.title}
            </p>
            <h3 className="font-bold text-base truncate mb-2">{title}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {dateStr} às {timeStr}
              </span>
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[150px]">{location}</span>
                </span>
              )}
            </div>
            <Button
              onClick={handleClick}
              variant={config.buttonVariant}
              className="w-full font-bold"
            >
              {config.buttonText}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
