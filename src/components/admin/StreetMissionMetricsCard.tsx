import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStreetMissionMetrics, STREET_ACTION_LABELS } from "@/hooks/useStreetMission";
import { MapPin, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface StreetMissionMetricsCardProps {
  periodDays?: number;
  scopeCidade?: string;
}

export function StreetMissionMetricsCard({
  periodDays = 7,
  scopeCidade,
}: StreetMissionMetricsCardProps) {
  const { data: metrics, isLoading } = useStreetMissionMetrics(periodDays, scopeCidade);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Card className="border-orange-500/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            <span>Missões de Rua</span>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            {periodDays}d
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-orange-500/10">
            <p className="text-2xl font-bold text-orange-600">{metrics.total_geradas}</p>
            <p className="text-xs text-muted-foreground">Geradas</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10">
            <p className="text-2xl font-bold text-green-600">{metrics.total_concluidas}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <p className="text-2xl font-bold text-primary">{metrics.taxa_conclusao}%</p>
            <p className="text-xs text-muted-foreground">Taxa</p>
          </div>
        </div>

        {/* In Progress */}
        {metrics.em_andamento > 0 && (
          <div className="flex items-center justify-between p-2 rounded bg-yellow-500/10">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">Em andamento</span>
            </div>
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700">
              {metrics.em_andamento}
            </Badge>
          </div>
        )}

        {/* By Action Type */}
        {metrics.por_acao.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Por Tipo de Ação
            </p>
            <div className="space-y-1">
              {metrics.por_acao.map((item) => (
                <div
                  key={item.acao}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <span>
                    {STREET_ACTION_LABELS[item.acao as keyof typeof STREET_ACTION_LABELS] ||
                      item.acao}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{item.total}</span>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="font-medium">{item.concluidas}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Bairros */}
        {metrics.top_bairros.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Top Bairros
            </p>
            <div className="flex flex-wrap gap-1">
              {metrics.top_bairros.slice(0, 5).map((item, idx) => (
                <Badge key={item.bairro || idx} variant="secondary" className="text-xs">
                  {item.bairro || "N/A"} ({item.total})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top Cidades (only for global scope) */}
        {!scopeCidade && metrics.top_cidades.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Top Cidades
            </p>
            <div className="flex flex-wrap gap-1">
              {metrics.top_cidades.slice(0, 5).map((item, idx) => (
                <Badge key={item.cidade || idx} variant="outline" className="text-xs">
                  {item.cidade || "N/A"} ({item.total})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {metrics.total_geradas === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Nenhuma missão de rua no período
          </p>
        )}
      </CardContent>
    </Card>
  );
}
