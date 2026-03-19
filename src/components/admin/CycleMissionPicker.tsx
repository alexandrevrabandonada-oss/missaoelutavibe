/**
 * CycleMissionPicker - Admin picks up to 6 missions for a cycle
 */
import { useState } from "react";
import { useMissions } from "@/hooks/useMissions";
import { useCycleMissions } from "@/hooks/useCycleMissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { Plus, X, Target, Search, GripVertical } from "lucide-react";

interface CycleMissionPickerProps {
  cicloId: string;
  isEncerrado?: boolean;
}

export function CycleMissionPicker({ cicloId, isEncerrado }: CycleMissionPickerProps) {
  const { missions: allMissions, isLoading: loadingAll } = useMissions(cicloId);
  const {
    activeMissions,
    isLoading,
    isFull,
    count,
    addMission,
    isAdding,
    removeMission,
    isRemoving,
    isMissionInCycle,
  } = useCycleMissions(cicloId);

  const [search, setSearch] = useState("");

  // Available missions not yet in the cycle
  const availableMissions = allMissions
    .filter((m) => m.status === "publicada" && !isMissionInCycle(m.id))
    .filter((m) =>
      search
        ? m.title.toLowerCase().includes(search.toLowerCase()) ||
          m.type.toLowerCase().includes(search.toLowerCase())
        : true
    );

  const handleAdd = async (missionId: string) => {
    try {
      await addMission(missionId);
      toast.success("Missão adicionada ao ciclo");
    } catch (e: any) {
      toast.error(e.message || "Erro ao adicionar");
    }
  };

  const handleRemove = async (missionId: string) => {
    try {
      await removeMission(missionId);
      toast.success("Missão removida do ciclo");
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover");
    }
  };

  if (isLoading || loadingAll) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected missions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Missões Ativas no Ciclo
          </h4>
          <Badge variant={isFull ? "destructive" : "outline"} className="text-xs">
            {count}/6
          </Badge>
        </div>

        {activeMissions.length > 0 ? (
          <div className="space-y-2">
            {activeMissions.map((mission) => (
              <div
                key={mission.id}
                className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mission.title}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {mission.type}
                  </Badge>
                </div>
                {!isEncerrado && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(mission.id)}
                    disabled={isRemoving}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4 bg-secondary/30 rounded-lg">
            Nenhuma missão selecionada. Adicione até 6 missões abaixo.
          </p>
        )}
      </div>

      {/* Add missions */}
      {!isEncerrado && !isFull && (
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar missão para adicionar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {availableMissions.length > 0 ? (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {availableMissions.slice(0, 10).map((mission) => (
                <button
                  key={mission.id}
                  onClick={() => handleAdd(mission.id)}
                  disabled={isAdding}
                  className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <Plus className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">{mission.title}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {mission.type}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              {search ? "Nenhuma missão encontrada" : "Todas as missões já foram adicionadas"}
            </p>
          )}
        </div>
      )}

      {isFull && !isEncerrado && (
        <p className="text-xs text-muted-foreground text-center">
          Limite de 6 missões atingido. Remova uma para adicionar outra.
        </p>
      )}
    </div>
  );
}
