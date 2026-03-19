/**
 * PostEventFollowupMetricsCard - Coordinator metrics for post-event follow-ups
 * 
 * Shows aggregated stats: overdue, done rate, etc. No PII.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePostEventFollowupMetrics } from "@/hooks/usePostEventFollowups";
import { CalendarClock, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PostEventFollowupMetricsCardProps {
  days?: number;
}

export function PostEventFollowupMetricsCard({ days = 14 }: PostEventFollowupMetricsCardProps) {
  const { data: metrics, isLoading } = usePostEventFollowupMetrics(days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Aggregate totals
  const totals = metrics?.reduce(
    (acc: any, event: any) => ({
      attended: acc.attended + Number(event.attended_total || 0),
      scheduled: acc.scheduled + Number(event.followups_scheduled_total || 0),
      done: acc.done + Number(event.followups_done_total || 0),
      overdue: acc.overdue + Number(event.followups_overdue_total || 0),
    }),
    { attended: 0, scheduled: 0, done: 0, overdue: 0 }
  ) || { attended: 0, scheduled: 0, done: 0, overdue: 0 };

  const doneRate = totals.scheduled > 0 
    ? Math.round((totals.done / totals.scheduled) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Follow-ups Pós-Evento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{totals.attended}</p>
            <p className="text-xs text-muted-foreground">Presentes</p>
          </div>
          <div>
            <p className="text-lg font-bold">{totals.scheduled}</p>
            <p className="text-xs text-muted-foreground">Agendados</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary">{doneRate}%</p>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${totals.overdue > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {totals.overdue}
            </p>
            <p className="text-xs text-muted-foreground">Atrasados</p>
          </div>
        </div>

        {/* Alert for overdue */}
        {totals.overdue > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{totals.overdue} follow-ups atrasados</span>
          </div>
        )}

        {/* Recent events with follow-ups */}
        {metrics && metrics.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Por evento:</p>
            {metrics.slice(0, 3).map((event: any) => (
              <div 
                key={event.event_id}
                className="flex items-center justify-between text-xs p-2 rounded bg-muted/50"
              >
                <div className="truncate max-w-[140px]">
                  <span className="font-medium">{event.event_title}</span>
                  <span className="text-muted-foreground ml-1">
                    ({format(new Date(event.event_date), "dd/MM", { locale: ptBR })})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {Number(event.followups_overdue_total) > 0 && (
                    <Badge variant="destructive" className="text-xs px-1">
                      {event.followups_overdue_total} atrasado
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {event.followups_done_total}/{event.followups_scheduled_total}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
