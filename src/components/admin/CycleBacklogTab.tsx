import { useState, useMemo } from "react";
import { useCycleBacklog, type MetaTaskMapping } from "@/hooks/useCycleBacklog";
import { useSquadsForScope } from "@/hooks/useSquads";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ListTodo,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Target,
  Clock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@/hooks/useSquads";

interface CycleBacklogTabProps {
  cicloId: string;
  metas: string[];
  cidade: string | null;
  celulaId: string | null;
  isEncerrado: boolean;
}

export function CycleBacklogTab({
  cicloId,
  metas,
  cidade,
  celulaId,
  isEncerrado,
}: CycleBacklogTabProps) {
  const {
    tasks,
    isLoadingTasks,
    metrics,
    isMetaLinked,
    getLinkedTask,
    createTasksFromMetas,
    isCreatingTasks,
  } = useCycleBacklog(cicloId);

  // Get squads for the scope
  const escopoTipo = celulaId ? "celula" : "cidade";
  const escopoId = celulaId || cidade || "";
  const { squads, isLoading: isLoadingSquads } = useSquadsForScope(escopoTipo, escopoId);

  // State for dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMetas, setSelectedMetas] = useState<Set<number>>(new Set());
  const [squadId, setSquadId] = useState<string>("");
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta">("media");

  // Filter metas that don't have tasks yet
  const unlinkedMetas = useMemo(() => {
    return metas
      .map((meta, idx) => ({ meta, idx, key: `meta_${idx}` }))
      .filter(({ key }) => !isMetaLinked(key));
  }, [metas, isMetaLinked]);

  const linkedMetas = useMemo(() => {
    return metas
      .map((meta, idx) => ({ meta, idx, key: `meta_${idx}`, task: getLinkedTask(`meta_${idx}`) }))
      .filter(({ task }) => !!task);
  }, [metas, getLinkedTask]);

  const handleToggleMeta = (idx: number) => {
    const newSet = new Set(selectedMetas);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedMetas(newSet);
  };

  const handleSelectAll = () => {
    if (selectedMetas.size === unlinkedMetas.length) {
      setSelectedMetas(new Set());
    } else {
      setSelectedMetas(new Set(unlinkedMetas.map((m) => m.idx)));
    }
  };

  const handleCreateTasks = async () => {
    if (!squadId) {
      toast.error("Selecione um squad");
      return;
    }

    if (selectedMetas.size === 0) {
      toast.error("Selecione pelo menos uma meta");
      return;
    }

    const mappings: MetaTaskMapping[] = Array.from(selectedMetas).map((idx) => ({
      meta_key: `meta_${idx}`,
      titulo: metas[idx],
      descricao: `Tarefa gerada a partir da meta da semana: "${metas[idx]}"`,
      squad_id: squadId,
      prioridade,
    }));

    try {
      const result = await createTasksFromMetas(mappings);
      toast.success(`${result.created} tarefa(s) criada(s)${result.skipped > 0 ? `, ${result.skipped} já existente(s)` : ""}`);
      setShowCreateDialog(false);
      setSelectedMetas(new Set());
      setSquadId("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar tarefas");
    }
  };

  if (isLoadingTasks || isLoadingSquads) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{metrics.abertas}</p>
            <p className="text-xs text-muted-foreground">Abertas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-500/10">
            <p className="text-lg font-bold text-green-600">{metrics.feitas}</p>
            <p className="text-xs text-muted-foreground">Feitas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-destructive/10">
            <p className="text-lg font-bold text-destructive">{metrics.bloqueadas}</p>
            <p className="text-xs text-muted-foreground">Bloqueadas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-orange-500/10">
            <p className="text-lg font-bold text-orange-500">{metrics.vencendo_7d}</p>
            <p className="text-xs text-muted-foreground">Vencendo 7d</p>
          </div>
        </div>
      )}

      {/* Insight: metas without tasks */}
      {metrics && metrics.metas_sem_tarefa > 0 && !isEncerrado && (
        <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/10 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
          <p className="text-sm">
            <strong>{metrics.metas_sem_tarefa}</strong> meta(s) ainda sem tarefa vinculada
          </p>
        </div>
      )}

      {/* Metas -> Tasks Section */}
      <div className="card-luta">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas → Tarefas
          </h3>
          {!isEncerrado && unlinkedMetas.length > 0 && squads.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Gerar Tarefas
            </Button>
          )}
        </div>

        {metas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma meta definida. Adicione metas na aba "Metas" primeiro.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Metas with tasks */}
            {linkedMetas.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Com tarefa ({linkedMetas.length})
                </p>
                {linkedMetas.map(({ meta, idx, task }) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-green-500/5 border border-green-500/20 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm truncate">{meta}</span>
                    </div>
                    {task && (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={TASK_STATUS_LABELS[task.status]?.color}
                        >
                          {TASK_STATUS_LABELS[task.status]?.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {task.squad_nome}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Metas without tasks */}
            {unlinkedMetas.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Sem tarefa ({unlinkedMetas.length})
                </p>
                {unlinkedMetas.map(({ meta, idx }) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-muted/30 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{meta}</span>
                    </div>
                    {!isEncerrado && squads.length > 0 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isEncerrado && squads.length === 0 && metas.length > 0 && (
          <div className="mt-4 p-3 rounded-lg border border-muted bg-muted/20 text-center">
            <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Crie um squad no escopo deste ciclo para poder gerar tarefas
            </p>
          </div>
        )}
      </div>

      {/* All Cycle Tasks */}
      {tasks.length > 0 && (
        <div className="card-luta">
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <ListTodo className="h-5 w-5 text-primary" />
            Tarefas do Ciclo ({tasks.length})
          </h3>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between bg-secondary/30 rounded-lg p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.squad_nome}
                    {task.prazo_em && (
                      <>
                        {" • "}
                        <Clock className="h-3 w-3 inline" />{" "}
                        {new Date(task.prazo_em).toLocaleDateString("pt-BR")}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={TASK_PRIORITY_LABELS[task.prioridade]?.color}
                  >
                    {TASK_PRIORITY_LABELS[task.prioridade]?.label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={TASK_STATUS_LABELS[task.status]?.color}
                  >
                    {TASK_STATUS_LABELS[task.status]?.label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Tasks Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Gerar Tarefas das Metas
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Squad selection */}
            <div>
              <Label>Squad destino *</Label>
              <Select value={squadId} onValueChange={setSquadId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o squad" />
                </SelectTrigger>
                <SelectContent>
                  {squads.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label>Prioridade padrão</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as any)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Metas selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Metas a transformar em tarefas</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedMetas.size === unlinkedMetas.length
                    ? "Desmarcar todas"
                    : "Selecionar todas"}
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {unlinkedMetas.map(({ meta, idx }) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMetas.has(idx)}
                      onCheckedChange={() => handleToggleMeta(idx)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">{meta}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTasks}
              disabled={isCreatingTasks || !squadId || selectedMetas.size === 0}
              className="btn-luta"
            >
              {isCreatingTasks ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar {selectedMetas.size} Tarefa(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
