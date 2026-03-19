import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCells } from "@/hooks/useCells";
import { useProfile } from "@/hooks/useProfile";
import {
  useSquadsAdmin,
  useSquadMembers,
  useSquadTasksAdmin,
  useBlockedTasks,
  useSquadMetrics,
  SQUAD_STATUS_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  Squad,
  SquadTaskStatus,
  SquadTaskPrioridade,
  SquadStatus,
} from "@/hooks/useSquads";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingSpinner, FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Users,
  ListTodo,
  Plus,
  AlertTriangle,
  Settings,
  Clock,
  BarChart3,
} from "lucide-react";

export default function AdminSquads() {
  const navigate = useNavigate();
  const { isCoordinator, getScope } = useUserRoles();
  const { cells } = useCells();
  const { profile } = useProfile();
  const scope = getScope();

  const [activeTab, setActiveTab] = useState("squads");
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [showNewSquadDialog, setShowNewSquadDialog] = useState(false);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);

  // New squad form
  const [newSquad, setNewSquad] = useState({
    nome: "",
    objetivo: "",
    escopo_tipo: "celula" as "celula" | "cidade",
    escopo_id: "",
    escopo_cidade: "",
    lider_user_id: "",
  });

  // New task form
  const [newTask, setNewTask] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media" as SquadTaskPrioridade,
    prazo_em: "",
    assigned_to: "",
  });

  const { squads, isLoading, createSquad, isCreating, updateSquad } = useSquadsAdmin();
  const { members, addMember, removeMember } = useSquadMembers(selectedSquadId ?? undefined);
  const { tasks, createTask, updateTask, isCreating: isTaskCreating } = useSquadTasksAdmin(
    selectedSquadId ?? undefined
  );
  const { blockedTasks } = useBlockedTasks();
  const { metrics } = useSquadMetrics();

  if (!isCoordinator()) {
    navigate("/voluntario/hoje");
    return null;
  }

  const selectedSquad = squads.find((s) => s.id === selectedSquadId);
  const scopedCells = scope.cellId
    ? cells?.filter((c) => c.id === scope.cellId)
    : scope.cidade
    ? cells?.filter((c) => c.city === scope.cidade)
    : cells;

  const handleCreateSquad = async () => {
    if (!newSquad.nome || !newSquad.escopo_id || !newSquad.lider_user_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    try {
      await createSquad({
        nome: newSquad.nome,
        objetivo: newSquad.objetivo || undefined,
        escopo_tipo: newSquad.escopo_tipo,
        escopo_id: newSquad.escopo_id,
        escopo_cidade: newSquad.escopo_cidade || undefined,
        lider_user_id: newSquad.lider_user_id,
      });
      toast.success("Squad criado!");
      setShowNewSquadDialog(false);
      setNewSquad({
        nome: "",
        objetivo: "",
        escopo_tipo: "celula",
        escopo_id: "",
        escopo_cidade: "",
        lider_user_id: "",
      });
    } catch (error) {
      toast.error("Erro ao criar squad");
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.titulo || !selectedSquadId) {
      toast.error("Preencha o título");
      return;
    }
    try {
      await createTask({
        titulo: newTask.titulo,
        descricao: newTask.descricao || undefined,
        prioridade: newTask.prioridade,
        prazo_em: newTask.prazo_em || undefined,
        assigned_to: newTask.assigned_to || undefined,
      });
      toast.success("Tarefa criada!");
      setShowNewTaskDialog(false);
      setNewTask({
        titulo: "",
        descricao: "",
        prioridade: "media",
        prazo_em: "",
        assigned_to: "",
      });
    } catch (error) {
      toast.error("Erro ao criar tarefa");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: SquadTaskStatus) => {
    try {
      await updateTask({ id: taskId, status });
      toast.success("Status atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar");
    }
  };

  const handleUpdateSquadStatus = async (squadId: string, status: SquadStatus) => {
    try {
      await updateSquad({ id: squadId, status });
      toast.success("Status do squad atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar");
    }
  };

  const tasksByStatus = {
    a_fazer: tasks.filter((t) => t.status === "a_fazer"),
    fazendo: tasks.filter((t) => t.status === "fazendo"),
    feito: tasks.filter((t) => t.status === "feito"),
    bloqueado: tasks.filter((t) => t.status === "bloqueado"),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <h1 className="text-lg font-semibold flex-1">Squads & Tarefas</h1>
          <Button size="sm" onClick={() => setShowNewSquadDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Squad
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-6xl mx-auto">
        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.squads_ativos}</p>
                    <p className="text-xs text-muted-foreground">Squads Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.tarefas_abertas}</p>
                    <p className="text-xs text-muted-foreground">Tarefas Abertas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.tarefas_bloqueadas}</p>
                    <p className="text-xs text-muted-foreground">Bloqueadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{metrics.tarefas_vencendo_7d}</p>
                    <p className="text-xs text-muted-foreground">Vencendo 7d</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="squads">
              <Users className="h-4 w-4 mr-2" />
              Squads
            </TabsTrigger>
            <TabsTrigger value="board">
              <BarChart3 className="h-4 w-4 mr-2" />
              Board
            </TabsTrigger>
            <TabsTrigger value="bloqueados">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Bloqueados
              {blockedTasks.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {blockedTasks.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Squads List Tab */}
          <TabsContent value="squads" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : squads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum squad criado ainda.</p>
                  <Button className="mt-4" onClick={() => setShowNewSquadDialog(true)}>
                    Criar primeiro squad
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {squads.map((squad) => {
                  const statusInfo = SQUAD_STATUS_LABELS[squad.status];
                  return (
                    <Card
                      key={squad.id}
                      className={`cursor-pointer transition-colors ${
                        selectedSquadId === squad.id
                          ? "ring-2 ring-primary"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => setSelectedSquadId(squad.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{squad.nome}</CardTitle>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </div>
                        {squad.objetivo && (
                          <CardDescription>{squad.objetivo}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {squad.members_count} membros
                        </span>
                        <span className="flex items-center gap-1">
                          <ListTodo className="h-4 w-4" />
                          {squad.tasks_count} tarefas
                        </span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Selected Squad Detail */}
            {selectedSquad && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{selectedSquad.nome}</CardTitle>
                    <div className="flex gap-2">
                      <Select
                        value={selectedSquad.status}
                        onValueChange={(v) =>
                          handleUpdateSquadStatus(selectedSquad.id, v as SquadStatus)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SQUAD_STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => setShowNewTaskDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Tarefa
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <h4 className="font-medium mb-2">Membros ({members.length})</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {members.map((m) => (
                      <Badge key={m.id} variant="outline">
                        {m.profile?.nickname || m.user_id.slice(0, 8)}
                        <span className="ml-1 text-xs opacity-70">({m.papel})</span>
                      </Badge>
                    ))}
                  </div>

                  <h4 className="font-medium mb-2">Tarefas ({tasks.length})</h4>
                  <div className="space-y-2">
                    {tasks.slice(0, 5).map((task) => {
                      const statusInfo = TASK_STATUS_LABELS[task.status];
                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <span className="text-sm">{task.titulo}</span>
                          <div className="flex gap-2">
                            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                            <Select
                              value={task.status}
                              onValueChange={(v) =>
                                handleUpdateTaskStatus(task.id, v as SquadTaskStatus)
                              }
                            >
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>
                                    {v.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Board Tab */}
          <TabsContent value="board">
            {!selectedSquadId ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecione um squad na aba anterior para ver o board.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {(["a_fazer", "fazendo", "bloqueado", "feito"] as SquadTaskStatus[]).map(
                  (status) => {
                    const info = TASK_STATUS_LABELS[status];
                    const statusTasks = tasksByStatus[status];
                    return (
                      <div key={status}>
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Badge className={info.color}>{info.label}</Badge>
                          <span className="text-sm text-muted-foreground">
                            ({statusTasks.length})
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {statusTasks.map((task) => (
                            <Card key={task.id} className="p-3">
                              <p className="text-sm font-medium">{task.titulo}</p>
                              {task.assigned_profile && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  → {task.assigned_profile.nickname}
                                </p>
                              )}
                              {task.prazo_em && (
                                <Badge
                                  variant="outline"
                                  className={`mt-2 text-xs ${
                                    isPast(new Date(task.prazo_em)) ? "text-red-600" : ""
                                  }`}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(new Date(task.prazo_em), "dd/MM")}
                                </Badge>
                              )}
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </TabsContent>

          {/* Blocked Tab */}
          <TabsContent value="bloqueados" className="space-y-4">
            {blockedTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma tarefa bloqueada!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {blockedTasks.map((task) => (
                  <Card key={task.id} className="border-red-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{task.titulo}</CardTitle>
                          <CardDescription>
                            Squad: {task.squad?.nome} •{" "}
                            {task.assigned_profile?.nickname || "Não atribuído"}
                          </CardDescription>
                        </div>
                        <Select
                          value={task.status}
                          onValueChange={(v) =>
                            handleUpdateTaskStatus(task.id, v as SquadTaskStatus)
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* New Squad Dialog */}
      <Dialog open={showNewSquadDialog} onOpenChange={setShowNewSquadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Squad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={newSquad.nome}
                onChange={(e) => setNewSquad({ ...newSquad, nome: e.target.value })}
                placeholder="Ex: Squad Comunicação"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Objetivo</label>
              <Textarea
                value={newSquad.objetivo}
                onChange={(e) => setNewSquad({ ...newSquad, objetivo: e.target.value })}
                placeholder="Descreva o objetivo do squad..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Célula *</label>
              <Select
                value={newSquad.escopo_id}
                onValueChange={(v) => {
                  const cell = cells?.find((c) => c.id === v);
                  setNewSquad({
                    ...newSquad,
                    escopo_id: v,
                    escopo_cidade: cell?.city || "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {scopedCells?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Líder (user_id) *</label>
              <Input
                value={newSquad.lider_user_id}
                onChange={(e) => setNewSquad({ ...newSquad, lider_user_id: e.target.value })}
                placeholder="UUID do líder"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use seu ID: {profile?.id?.slice(0, 8)}...
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSquadDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSquad} disabled={isCreating}>
              {isCreating ? <LoadingSpinner size="sm" /> : "Criar Squad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Task Dialog */}
      <Dialog open={showNewTaskDialog} onOpenChange={setShowNewTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={newTask.titulo}
                onChange={(e) => setNewTask({ ...newTask, titulo: e.target.value })}
                placeholder="Ex: Criar arte para redes"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={newTask.descricao}
                onChange={(e) => setNewTask({ ...newTask, descricao: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Prioridade</label>
                <Select
                  value={newTask.prioridade}
                  onValueChange={(v) =>
                    setNewTask({ ...newTask, prioridade: v as SquadTaskPrioridade })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Prazo</label>
                <Input
                  type="datetime-local"
                  value={newTask.prazo_em}
                  onChange={(e) => setNewTask({ ...newTask, prazo_em: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Atribuir a (user_id)</label>
              <Input
                value={newTask.assigned_to}
                onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                placeholder="UUID (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTaskDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTask} disabled={isTaskCreating}>
              {isTaskCreating ? <LoadingSpinner size="sm" /> : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
