import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCellOpsKPIs } from "@/hooks/useCellOps";
import {
  Building2,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export function CellOpsKPICard() {
  const { data: kpis, isLoading, error } = useCellOpsKPIs();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  if (error || !kpis) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Células v0
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">Erro ao carregar KPIs</p>
        </CardContent>
      </Card>
    );
  }

  const hasPendingRequests = kpis.pending_requests > 0;
  const hasCitiesWithoutCells = kpis.cities_without_cells > 0;

  return (
    <Card className={hasPendingRequests ? "border-amber-500" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Células v0
        </CardTitle>
        <CardDescription>
          Operação de células e alocação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-muted rounded-lg">
            <MapPin className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{kpis.total_cities}</p>
            <p className="text-xs text-muted-foreground">Cidades ativas</p>
          </div>
          <div className="text-center p-2 bg-muted rounded-lg">
            <Building2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{kpis.total_cells}</p>
            <p className="text-xs text-muted-foreground">Células ativas</p>
          </div>
          <div className={`text-center p-2 rounded-lg ${
            hasPendingRequests ? "bg-amber-500/10" : "bg-muted"
          }`}>
            <Users className="h-4 w-4 mx-auto mb-1 text-amber-600" />
            <p className="text-lg font-bold">{kpis.pending_requests}</p>
            <p className="text-xs text-muted-foreground">Pedidos pendentes</p>
          </div>
          <div className={`text-center p-2 rounded-lg ${
            hasCitiesWithoutCells ? "bg-orange-500/10" : "bg-green-500/10"
          }`}>
            {hasCitiesWithoutCells ? (
              <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-orange-600" />
            ) : (
              <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-600" />
            )}
            <p className="text-lg font-bold">
              {kpis.cities_with_cells}/{kpis.total_cities}
            </p>
            <p className="text-xs text-muted-foreground">Cidades c/ células</p>
          </div>
        </div>

        {/* Pending by City */}
        {kpis.pending_by_city && kpis.pending_by_city.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Pedidos pendentes por cidade
            </p>
            <div className="flex flex-wrap gap-2">
              {kpis.pending_by_city.map((city, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className="text-xs bg-amber-500/10"
                >
                  {city.city_name} ({city.pending_count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Cells by City */}
        {kpis.cells_by_city && kpis.cells_by_city.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Células por cidade (top 10)
            </p>
            <div className="flex flex-wrap gap-2">
              {kpis.cells_by_city.map((city, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className="text-xs"
                >
                  {city.city_name}: {city.cell_count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
