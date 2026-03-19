import { useState, useMemo } from "react";
import { useMissions } from "@/hooks/useMissions";
import { useCiclos, Ciclo } from "@/hooks/useCiclos";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Target, 
  Plus,
  X,
  Calendar,
  FileText,
  AlertTriangle,
  Pencil,
  RefreshCw,
  Factory,
  List,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import MissionFactoryTab from "./MissionFactoryTab";

type MissionType = Database["public"]["Enums"]["mission_type"];
type MissionStatus = Database["public"]["Enums"]["mission_status"];
type Mission = Database["public"]["Tables"]["missions"]["Row"];

const MISSION_TYPES: { value: MissionType; label: string }[] = [
  { value: "escuta", label: "Escuta" },
  { value: "rua", label: "Rua" },
  { value: "mobilizacao", label: "Mobilização" },
  { value: "conteudo", label: "Conteúdo" },
  { value: "dados", label: "Dados" },
  { value: "formacao", label: "Formação" },
  { value: "conversa", label: "Conversa (CRM)" },
];

const STATUS_LABELS: Record<MissionStatus, string> = {
  rascunho: "Rascunho",
  publicada: "Publicada",
  em_andamento: "Em Andamento",
  enviada: "Enviada",
  validada: "Validada",
  reprovada: "Rejeitada",
  concluida: "Concluída",
};

export default function AdminMissoesPanel() {
  const { profile } = useProfile();
  const { getScope, isMasterAdmin } = useUserRoles();
  const scope = getScope();
  
  const { ciclos, activeCycle, isLoading: ciclosLoading, getCyclesForScope } = useCiclos();
  
  // Filter state
  const [cycleFilter, setCycleFilter] = useState<string>("active"); // "active" | "none" | ciclo_id
  
  // Determine which cycle ID to filter by
  const filterCicloId = useMemo(() => {
    if (cycleFilter === "active") return activeCycle?.id ?? null;
    if (cycleFilter === "none") return null;
    return cycleFilter;
  }, [cycleFilter, activeCycle]);
  
  const { missions, isLoading, createMission, isCreating } = useMissions(
    cycleFilter === "none" ? undefined : filterCicloId
  );
  
  const [showForm, setShowForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [editCycleId, setEditCycleId] = useState<string>("");
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    type: "escuta" as MissionType,
    points: 10,
    deadline: "",
    ciclo_id: activeCycle?.id ?? "",
  });

  // Get cycles available for this admin's scope
  const availableCycles = useMemo(() => {
    if (isMasterAdmin()) return ciclos;
    return getCyclesForScope(scope.cidade, scope.cellId);
  }, [ciclos, scope, isMasterAdmin, getCyclesForScope]);

  // Hide archived toggle
  const [showArchived, setShowArchived] = useState(false);

  // Filter missions when "none" filter is selected (show missions without cycle)
  const filteredMissions = useMemo(() => {
    let list = missions;
    if (cycleFilter === "none") {
      list = list.filter(m => !m.ciclo_id);
    }
    // Hide archived by default
    if (!showArchived) {
      list = list.filter(m => {
        const meta = m.meta_json as { archived?: boolean } | null;
        return meta?.archived !== true;
      });
    }
    return list;
  }, [missions, cycleFilter, showArchived]);

  // Update form's ciclo_id when activeCycle changes
  useMemo(() => {
    if (activeCycle && !form.ciclo_id) {
      setForm(f => ({ ...f, ciclo_id: activeCycle.id }));
    }
  }, [activeCycle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    // Validate scope
    if (!isMasterAdmin() && form.ciclo_id) {
      const selectedCycle = ciclos.find(c => c.id === form.ciclo_id);
      if (selectedCycle) {
        if (scope.type === "cidade" && selectedCycle.cidade !== scope.cidade) {
          toast({ 
            title: "Fora do escopo", 
            description: "Você não pode criar missões para ciclos de outra cidade.",
            variant: "destructive" 
          });
          return;
        }
        if (scope.type === "celula" && selectedCycle.celula_id !== scope.cellId) {
          toast({ 
            title: "Fora do escopo", 
            description: "Você não pode criar missões para ciclos de outra célula.",
            variant: "destructive" 
          });
          return;
        }
      }
    }

    await createMission({
      title: form.title,
      description: form.description || null,
      instructions: form.instructions || null,
      type: form.type,
      points: form.points,
      deadline: form.deadline || null,
      ciclo_id: form.ciclo_id || null,
      status: "publicada",
      requires_validation: true,
    });

    setForm({
      title: "",
      description: "",
      instructions: "",
      type: "escuta",
      points: 10,
      deadline: "",
      ciclo_id: activeCycle?.id ?? "",
    });
    setShowForm(false);
    toast({ title: "Missão criada!" });
  };

  const openEditCycleDialog = (mission: Mission) => {
    setEditingMission(mission);
    setEditCycleId(mission.ciclo_id ?? "");
    setShowEditDialog(true);
  };

  const handleUpdateCycle = async () => {
    if (!editingMission) return;

    // Validate scope before updating
    if (!isMasterAdmin() && editCycleId) {
      const selectedCycle = ciclos.find(c => c.id === editCycleId);
      if (selectedCycle) {
        if (scope.type === "cidade" && selectedCycle.cidade !== scope.cidade) {
          toast({ 
            title: "Operação bloqueada", 
            description: "Você não pode mover missões para ciclos fora do seu escopo.",
            variant: "destructive" 
          });
          return;
        }
        if (scope.type === "celula" && selectedCycle.celula_id !== scope.cellId) {
          toast({ 
            title: "Operação bloqueada", 
            description: "Você não pode mover missões para ciclos fora da sua célula.",
            variant: "destructive" 
          });
          return;
        }
      }
    }

    try {
      const { error } = await (await import("@/integrations/supabase/client")).supabase
        .from("missions")
        .update({ ciclo_id: editCycleId || null })
        .eq("id", editingMission.id);

      if (error) throw error;

      toast({ title: "Ciclo atualizado!" });
      setShowEditDialog(false);
      setEditingMission(null);
      // Refetch missions
      window.location.reload();
    } catch (error) {
      toast({ title: "Erro ao atualizar ciclo", variant: "destructive" });
    }
  };

  if (isLoading || ciclosLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Target className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-bold">Gestão de Missões</span>
          </div>
          <h2 className="text-2xl font-bold">Missões</h2>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista / Ciclo
          </TabsTrigger>
          <TabsTrigger value="factory" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Fábrica
          </TabsTrigger>
        </TabsList>

        <TabsContent value="factory" className="mt-4">
          <MissionFactoryTab />
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-6">
          {/* Quick create button */}
          <div className="flex justify-end">
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {showForm ? "Cancelar" : "Nova Missão Rápida"}
            </Button>
          </div>

      {/* Cycle Filter */}
      <div className="card-luta">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-2 block">Filtrar por Ciclo</Label>
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ciclo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  Ciclo ativo do meu escopo {activeCycle ? `(${activeCycle.titulo})` : "(nenhum)"}
                </SelectItem>
                <SelectItem value="none">Sem ciclo (fora da cadência)</SelectItem>
                {availableCycles
                  .filter(c => c.id !== activeCycle?.id)
                  .map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.titulo} ({cycle.status}) - {format(new Date(cycle.inicio), "dd/MM", { locale: ptBR })}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
          {activeCycle && (
            <div className="text-sm">
              <Badge variant="outline" className="bg-primary/10">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(activeCycle.inicio), "dd/MM", { locale: ptBR })} – {format(new Date(activeCycle.fim), "dd/MM", { locale: ptBR })}
              </Badge>
            </div>
          )}

          {/* Archived toggle */}
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-border"
            />
            Mostrar arquivadas
          </label>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card-luta space-y-4">
          <h3 className="font-bold text-lg">Criar Nova Missão</h3>
          
          {/* Cycle Selector */}
          <div>
            <Label className="text-sm font-medium mb-1 block">Vincular ao Ciclo</Label>
            <Select
              value={form.ciclo_id}
              onValueChange={(v) => setForm({ ...form, ciclo_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ciclo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    Sem ciclo (fora da cadência)
                  </span>
                </SelectItem>
                {availableCycles
                  .filter(c => c.status === "ativo" || c.status === "rascunho")
                  .map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.titulo} ({cycle.status === "ativo" ? "✓ Ativo" : "Rascunho"})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {!form.ciclo_id && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Missões sem ciclo não aparecem na "Semana" do voluntário.
              </p>
            )}
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Título *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Conversar com 3 moradores do bairro"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as MissionType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MISSION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Pontos</label>
              <Input
                type="number"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Descrição</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o objetivo da missão..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Instruções</label>
            <Textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Passo a passo para completar a missão..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Prazo (opcional)</label>
            <Input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isCreating}>
            {isCreating ? <LoadingSpinner size="sm" /> : "Criar Missão"}
          </Button>
        </form>
      )}

      {/* Missions List */}
      {filteredMissions.length === 0 ? (
        <div className="card-luta text-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-bold text-lg">Nenhuma missão {cycleFilter === "none" ? "sem ciclo" : "neste ciclo"}</p>
          <p className="text-muted-foreground">
            {cycleFilter === "active" && !activeCycle 
              ? "Não há ciclo ativo. Crie um ciclo primeiro." 
              : "Crie uma missão para começar."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMissions.map((mission) => {
            const missionCycle = ciclos.find(c => c.id === mission.ciclo_id);
            
            return (
              <div key={mission.id} className="card-luta">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    mission.status === "publicada" ? "bg-primary/20" : "bg-secondary"
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      mission.status === "publicada" ? "text-primary" : ""
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold">{mission.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        mission.status === "publicada" 
                          ? "bg-primary/20 text-primary" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {STATUS_LABELS[mission.status as MissionStatus] || mission.status}
                      </span>
                      {mission.demanda_origem_id && (
                        <Badge variant="outline" className="text-green-600 border-green-500/50 text-xs">
                          Da Base
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {mission.description || "Sem descrição"}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="capitalize">{mission.type}</span>
                      <span>{mission.points} pts</span>
                      {mission.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(mission.deadline).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {missionCycle ? (
                        <Badge variant="outline" className="text-xs">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {missionCycle.titulo}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-500/50">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Sem ciclo
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditCycleDialog(mission)}
                    title="Alterar ciclo"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Cycle Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Ciclo da Missão</DialogTitle>
            <DialogDescription>
              Mova a missão "{editingMission?.title}" para outro ciclo ou remova do ciclo atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ciclo</Label>
              <Select value={editCycleId} onValueChange={setEditCycleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      Sem ciclo
                    </span>
                  </SelectItem>
                  {availableCycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.titulo} ({cycle.status === "ativo" ? "✓ Ativo" : cycle.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCycle}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
