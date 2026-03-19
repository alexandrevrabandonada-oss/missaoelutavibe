import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import {
  useMySquads,
  useMyTasks,
  useTaskUpdates,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  SquadTaskStatus,
} from "@/hooks/useSquads";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { format, isPast, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Users,
  ListTodo,
  Clock,
  AlertTriangle,
  CheckCircle,
  Circle,
  Loader2,
  MessageSquare,
  Link as LinkIcon,
} from "lucide-react";

export default function VoluntarioSquads() {
  const navigate = useNavigate();
  const { hasAccess, isLoading: isAuthLoading } = useRequireApproval();
  const { squads, isLoading: isSquadsLoading } = useMySquads();
  const { tasks, isLoading: isTasksLoading, updateStatus, isUpdating } = useMyTasks();
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [newComment, setNewComment] = useState("");

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const { updates, isLoading: isUpdatesLoading, addUpdate, isAdding } = useTaskUpdates(selectedTaskId ?? undefined);

  if (isAuthLoading || isSquadsLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return null;
  }

  const handleStatusChange = async (taskId: string, newStatus: SquadTaskStatus) => {
    try {
      await updateStatus({ taskId, status: newStatus });
      toast.success("Status atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleAddComment = async () => {
    if (!selectedTaskId || !newComment.trim()) return;
    try {
      await addUpdate({ tipo: "comentario", texto: newComment });
      setNewComment("");
      toast.success("Comentário adicionado!");
    } catch (error) {
      toast.error("Erro ao adicionar comentário");
    }
  };

  const openTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskDialog(true);
  };

  const getStatusIcon = (status: SquadTaskStatus) => {
    switch (status) {
      case "a_fazer":
        return <Circle className="h-4 w-4" />;
      case "fazendo":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "feito":
        return <CheckCircle className="h-4 w-4" />;
      case "bloqueado":
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const isOverdue = (prazo: string | null) => {
    return prazo && isPast(new Date(prazo));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <h1 className="text-lg font-semibold flex-1">Meus Squads & Tarefas</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <Tabs defaultValue="tarefas">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="tarefas" className="flex-1">
              <ListTodo className="h-4 w-4 mr-2" />
              Minhas Tarefas
              {tasks.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {tasks.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="squads" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Meus Squads
            </TabsTrigger>
          </TabsList>

          {/* Tarefas Tab */}
          <TabsContent value="tarefas" className="space-y-4">
            {isTasksLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : tasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma tarefa atribuída a você no momento.</p>
                  <p className="text-sm">
                    Candidate-se a chamados no Banco de Talentos!
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/voluntario/talentos")}
                  >
                    Ver Chamados
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const statusInfo = TASK_STATUS_LABELS[task.status];
                  const prioInfo = TASK_PRIORITY_LABELS[task.prioridade];
                  const overdue = isOverdue(task.prazo_em);

                  return (
                    <Card
                      key={task.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => openTaskDetail(task.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              {task.titulo}
                            </CardTitle>
                            {task.squad && (
                              <CardDescription className="mt-1">
                                Squad: {task.squad.nome}
                              </CardDescription>
                            )}
                          </div>
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={prioInfo.color}>
                          {prioInfo.label}
                        </Badge>
                        {task.prazo_em && (
                          <Badge
                            variant="outline"
                            className={overdue ? "text-red-600 border-red-300" : ""}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {overdue
                              ? "Atrasada"
                              : formatDistanceToNow(new Date(task.prazo_em), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                          </Badge>
                        )}
                        {task.chamado && (
                          <Badge variant="secondary" className="text-xs">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            {task.chamado.titulo}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Squads Tab */}
          <TabsContent value="squads" className="space-y-4">
            {squads.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Você ainda não faz parte de nenhum squad.</p>
                  <p className="text-sm">
                    Squads são formados quando candidaturas são aceitas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {squads.map((squad) => (
                  <Card key={squad.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{squad.nome}</CardTitle>
                        <Badge variant="outline">{squad.my_papel}</Badge>
                      </div>
                      {squad.objetivo && (
                        <CardDescription>{squad.objetivo}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.titulo}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedTask.descricao && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTask.descricao}
                  </p>
                )}

                {/* Status Selector */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Alterar Status
                  </label>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(v) =>
                      handleStatusChange(selectedTask.id, v as SquadTaskStatus)
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_LABELS).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          {info.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Updates */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Atualizações
                  </label>
                  
                  {isUpdatesLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : updates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma atualização ainda.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {updates.map((u) => (
                        <div
                          key={u.id}
                          className="text-sm p-2 bg-muted rounded-md"
                        >
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{u.author?.nickname || "Anônimo"}</span>
                            <span>
                              {format(new Date(u.created_at), "dd/MM HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          {u.texto && <p>{u.texto}</p>}
                          {u.anexo_url && (
                            <a
                              href={u.anexo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              Ver anexo
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment */}
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Adicionar comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={isAdding || !newComment.trim()}
                    >
                      {isAdding ? <LoadingSpinner size="sm" /> : "Enviar"}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
