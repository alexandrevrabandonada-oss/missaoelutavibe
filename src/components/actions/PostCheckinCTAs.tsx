/**
 * PostCheckinCTAs - Fixed CTAs after check-in
 * 
 * Transforms check-in into action with clear next steps:
 * 1. Pegar uma missão
 * 2. Convidar +1 (or Registrar demanda)
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, UserPlus, FileText } from "lucide-react";

interface PostCheckinCTAsProps {
  showInvite?: boolean;
  compact?: boolean;
}

export function PostCheckinCTAs({ showInvite = true, compact = false }: PostCheckinCTAsProps) {
  if (compact) {
    return (
      <div className="flex gap-2">
        <Button asChild className="flex-1" size="sm">
          <Link to="/voluntario/missoes">
            <Target className="h-4 w-4 mr-2" />
            Pegar missão
          </Link>
        </Button>
        {showInvite ? (
          <Button asChild variant="secondary" className="flex-1" size="sm">
            <Link to="/voluntario/convite">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar +1
            </Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" className="flex-1" size="sm">
            <Link to="/voluntario/demandas/nova">
              <FileText className="h-4 w-4 mr-2" />
              Registrar demanda
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-center mb-3 text-muted-foreground">
          Próximo passo: escolha uma ação
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild className="w-full">
            <Link to="/voluntario/missoes">
              <Target className="h-5 w-5 mr-2" />
              Pegar uma missão
            </Link>
          </Button>
          {showInvite ? (
            <Button asChild variant="secondary" className="w-full">
              <Link to="/voluntario/convite">
                <UserPlus className="h-5 w-5 mr-2" />
                Convidar +1
              </Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" className="w-full">
              <Link to="/voluntario/demandas/nova">
                <FileText className="h-5 w-5 mr-2" />
                Registrar demanda
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
