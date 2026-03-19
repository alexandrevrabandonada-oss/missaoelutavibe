/**
 * EventInviteMetricsCard - Shows aggregated event invite metrics for coordinators
 * 
 * Displays top events by RSVP (going/maybe) without PII
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useScopeEventInviteMetrics } from "@/hooks/useEventInvites";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Users, TrendingUp, Loader2 } from "lucide-react";

interface EventInviteMetricsCardProps {
  days?: number;
  limit?: number;
  className?: string;
}

export function EventInviteMetricsCard({
  days = 30,
  limit = 5,
  className,
}: EventInviteMetricsCardProps) {
  const { data: metrics, isLoading } = useScopeEventInviteMetrics(days);

  // Get top events by conversion (going / total)
  const topEvents = (metrics || [])
    .filter((e) => e.total_invited > 0)
    .sort((a, b) => (b.going + b.maybe) - (a.going + a.maybe))
    .slice(0, limit);

  const totalInvited = topEvents.reduce((sum, e) => sum + e.total_invited, 0);
  const totalGoing = topEvents.reduce((sum, e) => sum + e.going, 0);
  const totalMaybe = topEvents.reduce((sum, e) => sum + e.maybe, 0);

  const conversionRate = totalInvited > 0 
    ? Math.round(((totalGoing + totalMaybe) / totalInvited) * 100) 
    : 0;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (topEvents.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Convites para Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum convite registrado nos últimos {days} dias
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Convites para Atividades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <p className="text-lg font-bold">{totalInvited}</p>
            <p className="text-xs text-muted-foreground">Convidados</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2">
            <p className="text-lg font-bold text-green-600">{totalGoing}</p>
            <p className="text-xs text-muted-foreground">Confirmados</p>
          </div>
          <div className="bg-yellow-500/10 rounded-lg p-2">
            <p className="text-lg font-bold text-yellow-600">{totalMaybe}</p>
            <p className="text-xs text-muted-foreground">Talvez</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Conversão</span>
              <span className="text-sm font-medium">{conversionRate}%</span>
            </div>
            <Progress value={conversionRate} className="h-1.5" />
          </div>
        </div>

        {/* Top Events */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Top Atividades
          </p>
          {topEvents.map((event) => {
            const eventConversion = event.total_invited > 0
              ? Math.round(((event.going + event.maybe) / event.total_invited) * 100)
              : 0;

            return (
              <div
                key={event.event_id}
                className="flex items-center justify-between p-2 border border-border rounded-lg"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium truncate">{event.event_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(event.event_date), "EEE, dd/MM", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-xs">
                    <Users className="h-3 w-3" />
                    <span>{event.total_invited}</span>
                  </div>
                  <Badge
                    variant={eventConversion >= 50 ? "default" : "outline"}
                    className="text-xs"
                  >
                    ✅ {event.going} 🤔 {event.maybe}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
