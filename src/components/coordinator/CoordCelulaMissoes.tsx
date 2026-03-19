/**
 * CoordCelulaMissoes - Tab "Missões" do hub de coordenação da célula
 */

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoordCelulaMissoes } from "@/hooks/useCoordCelulaMissoes";
import { ChevronRight, ClipboardList, Target } from "lucide-react";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  publicada: "default",
  em_andamento: "secondary",
  rascunho: "outline",
  concluida: "secondary",
  validada: "secondary",
  reprovada: "destructive",
  enviada: "secondary",
};

interface Props {
  celulaId: string;
}

export function CoordCelulaMissoes({ celulaId }: Props) {
  const { data: missions, isLoading, isError } = useCoordCelulaMissoes(celulaId);

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Erro ao carregar missões.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!missions?.length) {
    return (
      <div className="py-12 text-center">
        <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma missão criada para esta célula</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {missions.map((mission) => (
        <Link
          key={mission.id}
          to={`/voluntario/missao/${mission.id}`}
          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <Target className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{mission.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={STATUS_VARIANT[mission.status || ""] || "outline"} className="text-[10px]">
                {mission.statusLabel}
              </Badge>
              {mission.evidence_count > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ClipboardList className="h-3 w-3" />
                  {mission.evidence_count}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      ))}
    </div>
  );
}
