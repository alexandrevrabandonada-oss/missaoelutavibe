import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInviteLoopMetrics } from "@/hooks/useInviteLoop";
import { Users, TrendingUp, Share2 } from "lucide-react";

export function InviteLoopMetricsCard() {
  const { data: metrics, isLoading } = useInviteLoopMetrics();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-4 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const conversionRate = metrics && metrics.convites_compartilhados_7d > 0
    ? Math.round((metrics.conversao_approved_por_ref_7d / metrics.convites_compartilhados_7d) * 100)
    : 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Loop Convide 1
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-bold text-primary">
              {metrics?.convites_compartilhados_7d || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              Compartilhados 7d
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {metrics?.conversao_approved_por_ref_7d || 0}
            </p>
            <p className="text-xs text-muted-foreground">
              Aprovados via ref 7d
            </p>
          </div>
        </div>

        {conversionRate > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm">
              Taxa de conversão: <span className="font-bold">{conversionRate}%</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
