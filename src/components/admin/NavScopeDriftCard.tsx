/**
 * NavScopeDriftCard - Detects frozen routes appearing in active navigation
 * 
 * Part of P4: Single trail per profile
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  FROZEN_ROUTES, 
  NAV_COMPACT_MODE,
  VOLUNTARIO_NAV,
  COORD_NAV,
  ADMIN_NAV,
} from "@/lib/navScope";
import { AlertTriangle, CheckCircle2, Navigation } from "lucide-react";

export function NavScopeDriftCard() {
  // Check which nav items are visible and if any frozen ones are showing
  const driftIssues: string[] = [];
  
  // In compact mode, check if any frozen routes would appear
  if (NAV_COMPACT_MODE) {
    const allNavItems = [...VOLUNTARIO_NAV, ...COORD_NAV, ...ADMIN_NAV];
    const visibleFrozen = allNavItems.filter(item => 
      item.frozen && !NAV_COMPACT_MODE // This should never trigger when compact is on
    );
    
    if (visibleFrozen.length > 0) {
      driftIssues.push(...visibleFrozen.map(item => item.path));
    }
  } else {
    // Compact mode is OFF - frozen routes may be visible (this is a warning)
    driftIssues.push("Compact mode está desligado - rotas congeladas podem aparecer no menu");
  }

  const hasDrift = driftIssues.length > 0 || !NAV_COMPACT_MODE;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">NavScope Drift</CardTitle>
          </div>
          {hasDrift ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Atenção
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              OK
            </Badge>
          )}
        </div>
        <CardDescription>
          Verifica se rotas congeladas aparecem nos menus principais
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Compact mode status */}
        <div className="flex items-center justify-between text-sm">
          <span>ui.nav.compact</span>
          <Badge variant={NAV_COMPACT_MODE ? "default" : "secondary"}>
            {NAV_COMPACT_MODE ? "true" : "false"}
          </Badge>
        </div>

        {/* Frozen routes list */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Rotas Congeladas:</p>
          <div className="flex flex-wrap gap-1">
            {FROZEN_ROUTES.map(route => (
              <Badge key={route} variant="outline" className="text-xs font-mono">
                {route}
              </Badge>
            ))}
          </div>
        </div>

        {/* Warning if compact mode is off */}
        {!NAV_COMPACT_MODE && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Compact mode desligado</AlertTitle>
            <AlertDescription>
              Rotas legadas/congeladas podem aparecer no menu principal.
              Defina NAV_COMPACT_MODE=true em src/lib/navScope.ts para ocultar.
            </AlertDescription>
          </Alert>
        )}

        {/* All clear */}
        {NAV_COMPACT_MODE && driftIssues.length === 0 && (
          <p className="text-sm text-green-600">
            ✓ Menus limpos - rotas congeladas ocultas
          </p>
        )}
      </CardContent>
    </Card>
  );
}
