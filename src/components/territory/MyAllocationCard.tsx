/**
 * MyAllocationCard - Shows volunteer's cell allocation status
 * Simplified: 2 states - allocated (show cell + transfer option) or unallocated (info only)
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCellAssignmentRequest,
} from "@/hooks/useCellAssignmentRequest";
import { CellPlaybookCompact } from "./CellPlaybookCompact";
import {
  MapPin,
  CheckCircle2,
  Users,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Info,
} from "lucide-react";

export function MyAllocationCard() {
  const {
    allocation,
    isLoading,
    error,
  } = useCellAssignmentRequest();

  const [showPlaybook, setShowPlaybook] = useState(true);

  if (isLoading) {
    return <Skeleton className="h-40" />;
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-6 text-center text-muted-foreground">
          <p>Erro ao carregar status de alocação</p>
        </CardContent>
      </Card>
    );
  }

  if (!allocation) return null;

  const { state, currentCell, cityName } = allocation;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Minha Alocação
        </CardTitle>
        <CardDescription>
          {state === "allocated"
            ? "Você está alocado em uma célula"
            : "Aguardando alocação pela coordenação"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Allocated */}
        {state === "allocated" && currentCell && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <p className="font-bold text-lg">{currentCell.name}</p>
                {currentCell.neighborhood && (
                  <p className="text-sm text-muted-foreground">{currentCell.neighborhood}</p>
                )}
                {cityName && (
                  <p className="text-xs text-muted-foreground">{cityName}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPlaybook(!showPlaybook)}
                className="shrink-0"
              >
                {showPlaybook ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {showPlaybook && (
              <CellPlaybookCompact 
                cellName={currentCell.name}
                cellId={currentCell.id}
                playbook={currentCell.meta_json?.playbook}
              />
            )}

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link to={`/voluntario/celula/${currentCell.id}`}>
                  <Users className="h-4 w-4 mr-2" />
                  Ver Célula
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled
                title="Em breve: pedir troca de célula"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Pedir Troca
              </Button>
            </div>
          </div>
        )}

        {/* Unallocated or Pending - same UI now */}
        {(state === "unallocated" || state === "pending") && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Info className="h-6 w-6 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Célula será atribuída automaticamente</p>
              <p className="text-sm text-muted-foreground">
                Ao ser aprovado, você entra na célula Geral da sua cidade.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
