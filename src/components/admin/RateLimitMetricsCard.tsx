import { useRateLimitMetrics, ACTION_KEY_LABELS } from "@/hooks/useRateLimits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Shield, TrendingDown } from "lucide-react";

export function RateLimitMetricsCard() {
  const { data: metrics, isLoading, error } = useRateLimitMetrics(7);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return null;
  }

  const hasBlocks = metrics.total_7d > 0 || metrics.total_30d > 0;

  return (
    <Card className={hasBlocks ? "border-orange-500/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Anti-caos / Rate Limits
            </CardTitle>
          </div>
          {hasBlocks && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{metrics.total_7d}</p>
            <p className="text-xs text-muted-foreground">Bloqueios 7d</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{metrics.total_30d}</p>
            <p className="text-xs text-muted-foreground">Bloqueios 30d</p>
          </div>
        </div>

        {/* By Action */}
        {metrics.by_action.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Por Ação
            </h4>
            <div className="space-y-1.5">
              {metrics.by_action.slice(0, 5).map((item) => (
                <div
                  key={item.action_key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">
                    {ACTION_KEY_LABELS[item.action_key] || item.action_key}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.blocked_count}x
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.unique_users} usuários
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By City */}
        {metrics.by_city.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Por Cidade
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {metrics.by_city.slice(0, 5).map((item) => (
                <Badge key={item.cidade} variant="outline" className="text-xs">
                  {item.cidade}: {item.blocked_count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasBlocks && (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm">Nenhum bloqueio registrado</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
