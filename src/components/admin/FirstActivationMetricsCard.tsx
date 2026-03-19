import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirstActivationMetrics } from "@/hooks/useFirstActivation";
import {
  Rocket,
  Target,
  Share2,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export function FirstActivationMetricsCard() {
  const { data: metrics, isLoading } = useFirstActivationMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const {
    missions_assigned_7d,
    modal_opened_7d,
    share_completed_7d,
    approved_to_first_action_rate,
    approved_7d,
    first_action_7d,
  } = metrics;

  // Calculate modal engagement rate
  const modalEngagementRate = missions_assigned_7d > 0
    ? Math.round((modal_opened_7d / missions_assigned_7d) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          Ativação Automática
          <Badge variant="secondary" className="text-xs ml-auto">7d</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main conversion metric */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Aprovado → 1ª Ação</span>
          </div>
          <Badge 
            variant={approved_to_first_action_rate >= 50 ? "default" : "secondary"}
            className={approved_to_first_action_rate >= 50 ? "bg-green-500" : ""}
          >
            {approved_to_first_action_rate}%
          </Badge>
        </div>

        {/* Funnel breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Aprovados
            </span>
            <span className="font-medium">{approved_7d}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Missões atribuídas
            </span>
            <span className="font-medium">{missions_assigned_7d}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5" />
              Modal ativação aberto
            </span>
            <span className="font-medium">
              {modal_opened_7d}
              {modalEngagementRate > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({modalEngagementRate}%)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              1ª Ação realizada
            </span>
            <span className="font-medium">{first_action_7d}</span>
          </div>
        </div>

        {/* Quick insight */}
        {approved_7d > 0 && first_action_7d < approved_7d * 0.3 && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
            💡 Taxa de ativação baixa. Considere revisar o onboarding ou missões iniciais.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
