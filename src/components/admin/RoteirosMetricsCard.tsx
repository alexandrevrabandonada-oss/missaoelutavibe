import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Copy, CheckCircle, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useRoteirosMetrics, OBJETIVO_LABELS, RoteiroObjetivo } from "@/hooks/useRoteiros";
import { Skeleton } from "@/components/ui/skeleton";

export function RoteirosMetricsCard() {
  const { data: metrics, isLoading } = useRoteirosMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Roteiros de Conversa
          </CardTitle>
          <Link to="/admin/roteiros">
            <Button variant="ghost" size="sm" className="h-7">
              Ver todos
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded">
            <div className="text-lg font-bold">{metrics.total_roteiros}</div>
            <div className="text-xs text-muted-foreground">Aprovados</div>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <div className="text-lg font-bold">{metrics.acoes_periodo}</div>
            <div className="text-xs text-muted-foreground">Ações 7d</div>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <div className="text-lg font-bold">{metrics.usuarios_ativos}</div>
            <div className="text-xs text-muted-foreground">Usuários</div>
          </div>
        </div>

        {/* Pending review alert */}
        {metrics.roteiros_revisao > 0 && (
          <div className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <span className="text-yellow-800">
              {metrics.roteiros_revisao} roteiro(s) aguardando revisão
            </span>
            <Link to="/admin/roteiros">
              <Badge variant="outline" className="cursor-pointer">
                Revisar
              </Badge>
            </Link>
          </div>
        )}

        {/* Top roteiros */}
        {metrics.top_roteiros && metrics.top_roteiros.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
              Top 3 mais usados (7 dias)
            </p>
            {metrics.top_roteiros.slice(0, 3).map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-xs p-1.5 bg-muted/30 rounded"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="truncate">{r.titulo}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <span className="flex items-center gap-0.5">
                    <Copy className="h-3 w-3" />
                    {r.total_acoes}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <CheckCircle className="h-3 w-3" />
                    {r.usos}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* By objective */}
        {metrics.por_objetivo && Object.keys(metrics.por_objetivo).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(metrics.por_objetivo).map(([objetivo, count]) => (
              <Badge key={objetivo} variant="outline" className="text-xs">
                {OBJETIVO_LABELS[objetivo as RoteiroObjetivo]}: {count}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
