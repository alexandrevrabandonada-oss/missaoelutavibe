/**
 * CRM Apoio/Voto v0 - Support Metrics Card for Coordinator/Admin
 * 
 * Displays support level funnel metrics.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useScopeSupportMetrics, getSupportLevelOptions } from "@/hooks/useContactSupport";
import { useAppMode } from "@/hooks/useAppMode";
import { TrendingUp, Users } from "lucide-react";

interface SupportMetricsCardProps {
  scopeTipo?: 'cidade' | 'all';
  scopeId?: string;
  days?: number;
}

export function SupportMetricsCard({
  scopeTipo = 'all',
  scopeId,
  days = 30,
}: SupportMetricsCardProps) {
  const { mode } = useAppMode();
  const { data: metrics, isLoading } = useScopeSupportMetrics(scopeTipo, scopeId, days);
  
  const options = getSupportLevelOptions(mode);
  const isCampaign = mode === 'campanha';

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {isCampaign ? "Votos" : "Apoios"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum contato cadastrado
          </p>
        </CardContent>
      </Card>
    );
  }

  const positiveCount = (metrics.yes || 0) + (metrics.mobilizer || 0);
  const conversionRate = metrics.conversion_rate || 
    Math.round((positiveCount / metrics.total) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          {isCampaign ? "Votos no Escopo" : "Apoio no Escopo"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversion Rate Highlight */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Conversão</span>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            {conversionRate}%
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress value={conversionRate} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{positiveCount} confirmados</span>
            <span>{metrics.total} total</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="p-2 rounded bg-green-50">
            <p className="font-semibold text-green-700">{metrics.yes || 0}</p>
            <p className="text-xs text-muted-foreground">
              {isCampaign ? "Voto Sim" : "Apoia"}
            </p>
          </div>
          <div className="p-2 rounded bg-primary/5">
            <p className="font-semibold text-primary">{metrics.mobilizer || 0}</p>
            <p className="text-xs text-muted-foreground">Mobiliza</p>
          </div>
          <div className="p-2 rounded bg-amber-50">
            <p className="font-semibold text-amber-700">{metrics.leaning || 0}</p>
            <p className="text-xs text-muted-foreground">Tendendo</p>
          </div>
        </div>

        {/* Unknown count */}
        {metrics.unknown > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {metrics.unknown} contatos ainda não qualificados
          </p>
        )}

        {/* Period changes */}
        {metrics.changes_period > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {metrics.changes_period} atualizações nos últimos {days} dias
          </p>
        )}
      </CardContent>
    </Card>
  );
}
