/**
 * CellPendingTab - Admin tab for managing profiles needing cell assignment
 */

import { useState } from "react";
import { useCellPending } from "@/hooks/useCellPending";
import { useCidadeCelulas } from "@/hooks/useTerritorio";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, UserX, Check, MapPin } from "lucide-react";

export function CellPendingTab() {
  const { pending, isLoading, assignCell, isAssigning, markNoCell, isMarkingNoCell } = useCellPending();
  const [selectedCells, setSelectedCells] = useState<Record<string, string>>({});
  const [expandedCityId, setExpandedCityId] = useState<string | null>(null);

  // Get cells for expanded city
  const { data: cityCells, isLoading: cellsLoading } = useCidadeCelulas(expandedCityId);

  const handleAssign = (profileId: string) => {
    const cellId = selectedCells[profileId];
    if (!cellId) return;
    assignCell({ profileId, cellId });
  };

  const handleMarkNoCell = (profileId: string) => {
    markNoCell(profileId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="card-luta text-center py-12">
        <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg mb-2">Tudo em ordem!</h3>
        <p className="text-muted-foreground">
          Não há voluntários aguardando atribuição de célula.
        </p>
      </div>
    );
  }

  // Group by city for better organization
  const byCity = pending.reduce((acc, p) => {
    const cityKey = p.city_id || "sem-cidade";
    if (!acc[cityKey]) {
      acc[cityKey] = {
        cityName: p.city_name || "Sem cidade",
        profiles: [],
      };
    }
    acc[cityKey].profiles.push(p);
    return acc;
  }, {} as Record<string, { cityName: string; profiles: typeof pending }>);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-bold">{pending.length} pendência(s)</span>
        </div>
        <Badge variant="outline">{Object.keys(byCity).length} cidade(s)</Badge>
      </div>

      {/* By city groups */}
      {Object.entries(byCity).map(([cityId, { cityName, profiles }]) => (
        <div key={cityId} className="card-luta">
          <button
            className="w-full flex items-center justify-between p-0 mb-4"
            onClick={() => setExpandedCityId(expandedCityId === cityId ? null : cityId)}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold">{cityName}</span>
              <Badge variant="secondary" className="text-xs">
                {profiles.length}
              </Badge>
            </div>
          </button>

          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.profile_id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-secondary/50 rounded-lg"
              >
                {/* Profile info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {profile.display_name || "Voluntário"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {profile.profile_id.slice(0, 8)}... •{" "}
                    {formatDistanceToNow(new Date(profile.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Cell selector */}
                  <Select
                    value={selectedCells[profile.profile_id] || ""}
                    onValueChange={(v) =>
                      setSelectedCells((prev) => ({ ...prev, [profile.profile_id]: v }))
                    }
                    disabled={cellsLoading && expandedCityId === cityId}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Escolher célula" />
                    </SelectTrigger>
                    <SelectContent>
                      {cityCells && expandedCityId === cityId ? (
                        cityCells.map((cell) => (
                          <SelectItem key={cell.id} value={cell.id}>
                            {cell.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="_loading" disabled>
                          Clique para carregar...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    disabled={!selectedCells[profile.profile_id] || isAssigning}
                    onClick={() => handleAssign(profile.profile_id)}
                  >
                    {isAssigning ? <LoadingSpinner size="sm" /> : "Atribuir"}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={isMarkingNoCell}
                    onClick={() => handleMarkNoCell(profile.profile_id)}
                    title="Marcar como avulso (sem célula)"
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
