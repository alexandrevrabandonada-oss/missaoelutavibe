import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCiclos, type Ciclo } from "@/hooks/useCiclos";
import { useMissions } from "@/hooks/useMissions";
import { useAnuncioMutations } from "@/hooks/useAnuncios";
import { useCells } from "@/hooks/useCells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";
import { 
  Calendar, 
  Plus, 
  Play, 
  Square, 
  Megaphone,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

// Extended mission type with ciclo_id (until types regenerate)
interface MissionWithCycle {
  id: string;
  title: string;
  status: string | null;
  ciclo_id?: string | null;
  cell_id?: string | null;
}

export function CycleCard() {
  const navigate = useNavigate();
  const { activeCycle, ciclos, createCycle, activateCycle, endCycle, isCreating, isActivating, isEnding, isLoadingActive } = useCiclos();
  const { missions } = useMissions();
  const { create: createAnuncio } = useAnuncioMutations();
  const { cells } = useCells();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [newCycle, setNewCycle] = useState({
    titulo: "",
    inicio: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    fim: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
    cidade: "",
    celula_id: "",
  });
  const [planText, setPlanText] = useState("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Cast missions to include ciclo_id
  const missionsWithCycle = missions as unknown as MissionWithCycle[];

  // Get missions linked to active cycle
  const cycleMissions = missionsWithCycle.filter(m => 
    activeCycle && m.ciclo_id === activeCycle.id
  );

  // Get draft cycles that can be activated
  const draftCycles = ciclos.filter(c => c.status === "rascunho");

  const handleCreate = async () => {
    if (!newCycle.titulo.trim()) {
      toast.error("Preencha o título do ciclo");
      return;
    }

    try {
      await createCycle({
        titulo: newCycle.titulo,
        inicio: newCycle.inicio,
        fim: newCycle.fim,
        cidade: newCycle.cidade || null,
        celula_id: newCycle.celula_id || null,
      });
      toast.success("Ciclo criado com sucesso!");
      setShowCreateDialog(false);
      setNewCycle({
        titulo: "",
        inicio: format(startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        fim: format(endOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        cidade: "",
        celula_id: "",
      });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar ciclo");
    }
  };

  const handleActivate = async (cycleId: string) => {
    try {
      await activateCycle(cycleId);
      toast.success("Ciclo ativado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar ciclo");
    }
  };

  const handleEnd = async () => {
    if (!activeCycle) return;
    
    try {
      await endCycle(activeCycle.id);
      toast.success("Ciclo encerrado");
    } catch (error: any) {
      toast.error(error.message || "Erro ao encerrar ciclo");
    }
  };

  const generateWeeklyPlan = () => {
    if (!activeCycle) return;

    const missionList = cycleMissions.length > 0
      ? cycleMissions.map(m => `• ${m.title}`).join("\n")
      : "• Nenhuma missão definida ainda";

    const plan = `📅 PLANO DA SEMANA: ${activeCycle.titulo}
${format(new Date(activeCycle.inicio), "dd/MM", { locale: ptBR })} a ${format(new Date(activeCycle.fim), "dd/MM", { locale: ptBR })}

🎯 MISSÕES DA SEMANA:
${missionList}

💪 NOSSA FORÇA É COLETIVA
Estamos em pré-campanha — cada missão cumprida nos fortalece para a disputa.

#ÉLuta — Escutar • Cuidar • Organizar`;

    setPlanText(plan);
    setShowPlanDialog(true);
  };

  const publishWeeklyPlan = async () => {
    if (!activeCycle || !planText.trim()) return;

    setIsGeneratingPlan(true);
    try {
      await createAnuncio.mutateAsync({
        titulo: `Plano da Semana: ${activeCycle.titulo}`,
        texto: planText,
        escopo: activeCycle.cidade ? "CIDADE" : "GLOBAL",
        cidade: activeCycle.cidade || undefined,
        celula_id: activeCycle.celula_id || undefined,
        status: "PUBLICADO",
        tags: ["plano-semanal", "missões"],
      });
      toast.success("Plano da Semana publicado!");
      setShowPlanDialog(false);
      setPlanText("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao publicar anúncio");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  if (isLoadingActive) {
    return (
      <div className="card-luta">
        <div className="flex items-center justify-center py-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="card-luta">
      <div className="flex items-center gap-2 text-primary mb-4">
        <Calendar className="h-5 w-5" />
        <span className="text-sm uppercase tracking-wider font-bold">Ciclo da Semana</span>
      </div>

      {activeCycle ? (
        <div className="space-y-4">
          {/* Active Cycle Info */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">{activeCycle.titulo}</h3>
              <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full uppercase">
                Ativo
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(activeCycle.inicio), "dd/MM", { locale: ptBR })} — {" "}
              {format(new Date(activeCycle.fim), "dd/MM", { locale: ptBR })}
            </p>
            {activeCycle.cidade && (
              <p className="text-xs text-muted-foreground mt-1">
                Escopo: {activeCycle.cidade}
              </p>
            )}
          </div>

          {/* Cycle Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <Target className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{cycleMissions.length}</p>
              <p className="text-xs text-muted-foreground">Missões</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">
                {cycleMissions.filter(m => m.status === "validada").length}
              </p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate(`/admin/semana/${activeCycle.id}`)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Editar Semana
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/ops")}
            >
              <Target className="h-4 w-4 mr-1" />
              Ops
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/playbook")}
            >
              <BookOpen className="h-4 w-4 mr-1" />
              Playbook
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/admin/agenda/nova")}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Atividade
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={generateWeeklyPlan}
            >
              <Megaphone className="h-4 w-4 mr-1" />
              Gerar Plano
            </Button>
            <Button 
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={handleEnd}
              disabled={isEnding}
            >
              {isEnding ? <LoadingSpinner size="sm" /> : <Square className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* No Active Cycle */}
          <div className="text-center py-4">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              Nenhum ciclo ativo no momento
            </p>
          </div>

          {/* Draft Cycles to Activate */}
          {draftCycles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                Rascunhos disponíveis:
              </p>
              {draftCycles.slice(0, 2).map((cycle) => (
                <div key={cycle.id} className="flex items-center justify-between bg-secondary/30 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-sm">{cycle.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(cycle.inicio), "dd/MM")} — {format(new Date(cycle.fim), "dd/MM")}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleActivate(cycle.id)}
                    disabled={isActivating}
                  >
                    {isActivating ? <LoadingSpinner size="sm" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Create New Cycle */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full btn-luta">
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Ciclo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Ciclo Semanal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="titulo">Título do Ciclo *</Label>
                  <Input
                    id="titulo"
                    value={newCycle.titulo}
                    onChange={(e) => setNewCycle({ ...newCycle, titulo: e.target.value })}
                    placeholder="Ex: Semana da Escuta Ativa"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inicio">Início</Label>
                    <Input
                      id="inicio"
                      type="date"
                      value={newCycle.inicio}
                      onChange={(e) => setNewCycle({ ...newCycle, inicio: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fim">Fim</Label>
                    <Input
                      id="fim"
                      type="date"
                      value={newCycle.fim}
                      onChange={(e) => setNewCycle({ ...newCycle, fim: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade (opcional)</Label>
                  <Input
                    id="cidade"
                    value={newCycle.cidade}
                    onChange={(e) => setNewCycle({ ...newCycle, cidade: e.target.value })}
                    placeholder="Deixe vazio para ciclo global"
                  />
                </div>
                <div>
                  <Label htmlFor="celula">Célula (opcional)</Label>
                  <Select
                    value={newCycle.celula_id}
                    onValueChange={(value) => setNewCycle({ ...newCycle, celula_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma célula" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma (escopo geral)</SelectItem>
                      {cells.map((cell) => (
                        <SelectItem key={cell.id} value={cell.id}>
                          {cell.name} — {cell.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full btn-luta" 
                  onClick={handleCreate}
                  disabled={isCreating}
                >
                  {isCreating ? <LoadingSpinner size="sm" /> : "Criar Ciclo"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Weekly Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Gerar Plano da Semana
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Pré-visualização</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Edite o texto abaixo antes de publicar. O anúncio será fixado no topo.
              </p>
            </div>
            <Textarea
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowPlanDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 btn-luta"
                onClick={publishWeeklyPlan}
                disabled={isGeneratingPlan || !planText.trim()}
              >
                {isGeneratingPlan ? <LoadingSpinner size="sm" /> : (
                  <>
                    <Megaphone className="h-4 w-4 mr-2" />
                    Publicar Anúncio
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
