/**
 * EventParticipationMetricsCard - Coordinator view of event participation
 * 
 * Shows aggregated metrics without PII
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useScopeEventParticipationMetrics } from "@/hooks/useEventParticipation";
import { CalendarCheck, Users, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventParticipationMetricsCardProps {
  days?: number;
  className?: string;
}

export function EventParticipationMetricsCard({ days = 14, className }: EventParticipationMetricsCardProps) {
  const { data: metrics, isLoading } = useScopeEventParticipationMetrics(days);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.length === 0) {
    return null;
  }

  // Get top 3 upcoming events
  const upcomingEvents = metrics
    .filter(m => new Date(m.event_date) >= new Date())
    .slice(0, 3);

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          Participação em Eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.map((event) => (
          <div 
            key={event.event_id}
            className="p-2 rounded-lg bg-muted/50 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{event.event_title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.event_date), "dd/MM HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {event.participations_checked_in > 0 && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {event.participations_checked_in} check-in
                </Badge>
              )}
              {event.participations_completed > 0 && (
                <Badge variant="secondary" className="text-xs">
                  ✅ {event.participations_completed} completo
                </Badge>
              )}
              {event.invites_attended_total > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {event.invites_attended_total} convidados
                </Badge>
              )}
              {event.participations_checked_in === 0 && event.participations_completed === 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Aguardando participação
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
