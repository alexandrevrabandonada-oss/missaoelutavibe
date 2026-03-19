/**
 * CoordCellsSection - Cell entry points for CoordenadorHoje
 * 
 * Shows coordinator's cells with quick stats and CTA to open each hub.
 */

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoordCells } from "@/hooks/useCoordCells";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Grid3X3,
  MapPin,
  Users,
} from "lucide-react";

export function CoordCellsSection() {
  const { cells, isLoading, isError } = useCoordCells();

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Erro ao carregar células. Tente recarregar a página.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-primary" />
          Minhas células
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : cells.length === 0 ? (
          <div className="py-6 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma célula atribuída à sua coordenação.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fale com um coordenador de nível superior para receber acesso.
            </p>
          </div>
        ) : (
          cells.map((cell) => {
            const hasAlerts = cell.registros_pendentes > 0 || cell.registros_ajuste > 0;
            return (
              <Link
                key={cell.id}
                to={`/coordenador/celula/${cell.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {cell.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cell.neighborhood ? `${cell.neighborhood} — ` : ""}
                    {cell.city}/{cell.state}
                  </p>
                  {/* Quick stats */}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {cell.voluntarios_ativos}
                    </span>
                    {cell.registros_pendentes > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <Clock className="h-3 w-3" />
                        {cell.registros_pendentes}
                        {cell.oldest_pending_hours !== null && cell.oldest_pending_hours > 24 && (
                          <span className="text-[10px] text-muted-foreground">
                            ({cell.oldest_pending_hours < 48
                              ? `${Math.round(cell.oldest_pending_hours)}h`
                              : `${Math.floor(cell.oldest_pending_hours / 24)}d`})
                          </span>
                        )}
                      </span>
                    )}
                    {cell.registros_ajuste > 0 && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {cell.registros_ajuste}
                      </span>
                    )}
                  </div>
                </div>
                {hasAlerts && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    Ação
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
