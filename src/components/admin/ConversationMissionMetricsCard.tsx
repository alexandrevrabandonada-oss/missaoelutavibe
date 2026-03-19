import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, TrendingUp, Users, Target } from "lucide-react";
import {
  useConversationMissionMetrics,
  OBJECTIVE_LABELS,
  OUTCOME_LABELS,
} from "@/hooks/useConversationMission";

interface ConversationMissionMetricsCardProps {
  periodDays?: number;
  scopeCidade?: string;
}

export function ConversationMissionMetricsCard({
  periodDays = 7,
  scopeCidade,
}: ConversationMissionMetricsCardProps) {
  const { data: metrics, isLoading } = useConversationMissionMetrics(periodDays, scopeCidade);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  const hasData = metrics.generated > 0;

  return (
    <Card className="border-purple-500/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">Conversas ({periodDays}d)</CardTitle>
          </div>
          {hasData && (
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              {metrics.completion_rate}%
            </Badge>
          )}
        </div>
        <CardDescription>Missões de conversa geradas e concluídas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma missão de conversa no período
          </p>
        ) : (
          <>
            {/* Main Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-purple-500">{metrics.generated}</p>
                <p className="text-xs text-muted-foreground">Geradas</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-green-500">{metrics.completed}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{metrics.completion_rate}%</p>
                <p className="text-xs text-muted-foreground">Taxa</p>
              </div>
            </div>

            {/* Outcomes */}
            {Object.keys(metrics.outcomes || {}).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Resultados das Conversas
                </p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(metrics.outcomes).map(([outcome, count]) => (
                    <Badge key={outcome} variant="secondary" className="text-xs">
                      {OUTCOME_LABELS[outcome as keyof typeof OUTCOME_LABELS] || outcome}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* By Objective */}
            {Object.keys(metrics.by_objective || {}).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Por Objetivo
                </p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(metrics.by_objective).map(([objective, count]) => (
                    <Badge key={objective} variant="outline" className="text-xs">
                      {OBJECTIVE_LABELS[objective as keyof typeof OBJECTIVE_LABELS] || objective}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Top Cities */}
            {metrics.top_cities && metrics.top_cities.length > 0 && !scopeCidade && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Top Cidades</p>
                <div className="flex flex-wrap gap-1">
                  {metrics.top_cities.slice(0, 3).map((city, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {city.cidade}: {city.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
