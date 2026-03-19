import { useNavigate } from "react-router-dom";
import { useDistributionMetrics } from "@/hooks/useDistribution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { QrCode, TrendingUp, MapPin, ExternalLink } from "lucide-react";

export function DistributionMetricsCard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useDistributionMetrics(7);

  if (isLoading) {
    return (
      <Card className="card-luta">
        <CardContent className="py-6 flex justify-center">
          <LoadingSpinner size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <Card className="card-luta">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          Links & QR Codes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-secondary rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {metrics.links_abertos_7d}
            </div>
            <div className="text-xs text-muted-foreground">Aberturas 7d</div>
          </div>
          <div className="text-center p-3 bg-secondary rounded-lg">
            <div className="text-2xl font-bold">
              {metrics.links_abertos_30d}
            </div>
            <div className="text-xs text-muted-foreground">Aberturas 30d</div>
          </div>
        </div>

        {/* Top cities */}
        {metrics.top_cidades.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Top Cidades
            </div>
            <div className="flex flex-wrap gap-1">
              {metrics.top_cidades.slice(0, 3).map((item) => (
                <Badge key={item.cidade} variant="outline" className="text-xs">
                  {item.cidade}
                  <span className="ml-1 text-muted-foreground">({item.count})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Top sources */}
        {metrics.top_sources.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Top Origens
            </div>
            <div className="flex flex-wrap gap-1">
              {metrics.top_sources.slice(0, 3).map((item) => (
                <Badge key={item.source} variant="secondary" className="text-xs">
                  {item.source}
                  <span className="ml-1 text-muted-foreground">({item.count})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Link to territory */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate("/admin/territorio")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Gerar Links por Cidade
        </Button>
      </CardContent>
    </Card>
  );
}
