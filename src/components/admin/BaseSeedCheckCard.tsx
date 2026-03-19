/**
 * BaseSeedCheckCard - Diagnostics card for checking the content seed status.
 * Shows total materials, canonical count, and warnings.
 */

import { useContentItems } from "@/hooks/useContentItems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Package } from "lucide-react";

export function BaseSeedCheckCard() {
  const { data: items = [], isLoading } = useContentItems({ status: "PUBLISHED" });

  const materials = items.filter((i) => i.type === "MATERIAL");
  const canonical = materials.filter((i) => i.tags?.includes("canonical"));

  const warnings: string[] = [];
  if (materials.length < 20) warnings.push(`Menos de 20 materiais publicados (${materials.length})`);
  if (canonical.length < 8) warnings.push(`Menos de 8 canônicos (${canonical.length})`);

  const isHealthy = warnings.length === 0;

  return (
    <Card className={isHealthy ? "border-green-500/50" : "border-yellow-500/50"}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Base Seed Check
          {isHealthy ? (
            <Badge variant="outline" className="ml-auto text-green-600 border-green-500/50">
              <CheckCircle className="h-3 w-3 mr-1" /> OK
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-500/50">
              <AlertTriangle className="h-3 w-3 mr-1" /> {warnings.length} aviso(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold">{materials.length}</p>
                <p className="text-xs text-muted-foreground">Materiais</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{canonical.length}</p>
                <p className="text-xs text-muted-foreground">Canônicos</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{items.length}</p>
                <p className="text-xs text-muted-foreground">Total publicados</p>
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="space-y-1 mt-2">
                {warnings.map((w, i) => (
                  <p key={i} className="text-xs text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    {w}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
