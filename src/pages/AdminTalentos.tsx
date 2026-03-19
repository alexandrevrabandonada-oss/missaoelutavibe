import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCells } from "@/hooks/useCells";
import {
  useSkillsSearch,
  useChamadosAdmin,
  useCandidaturasAdmin,
  AVAILABLE_SKILLS,
  SKILL_NIVEL_LABELS,
  CHAMADO_URGENCIA_LABELS,
  CHAMADO_STATUS_LABELS,
  CANDIDATURA_STATUS_LABELS,
  type ChamadoEscopoTipo,
  type ChamadoUrgencia,
  type ChamadoStatus,
  type CandidaturaStatus,
} from "@/hooks/useTalentos";
import {
  useSquadsForScope,
  useAcceptCandidaturaWithTask,
  TASK_PRIORITY_LABELS,
  SquadTaskPrioridade,
} from "@/hooks/useSquads";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingSpinner, FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Plus,
  Users,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  MessageSquare,
  ListTodo,
  History,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { GovernanceHistorySheet } from "@/components/admin/GovernanceHistorySheet";

export default function AdminTalentos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoordinator, isAdmin, getScope } = useUserRoles();
  const { cells } = useCells();
  const scope = getScope();

  // Tab state
  const [activeTab, setActiveTab] = useState("banco");

  // Skills search state
  const [skillFilter, setSkillFilter] = useState("");
  const [cidadeFilter, setCidadeFilter] = useState("");
  const { results: skillsResults, isLoading: isSearching } = useSkillsSearch({
    skill: skillFilter || undefined,
    cidade: cidadeFilter || undefined,
  });

  // Chamados state
  const {
    chamados,
    isLoading: isChamadosLoading,
    createChamado,
    isCreating,
    updateChamado,
    isUpdating,
  } = useChamadosAdmin();

  // New chamado dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newChamado, setNewChamado] = useState({
    escopo_tipo: "celula" as ChamadoEscopoTipo,
    escopo_id: "",
    escopo_cidade: "",
    titulo: "",
    descricao: "",
    skills_requeridas: [] as string[],
    urgencia: "media" as ChamadoUrgencia,
    publicarNoMural: false,
  });

  // Candidaturas
  const [selectedChamadoId, setSelectedChamadoId] = useState<string | null>(null);
  const {
    candidaturas,
    isLoading: isCandidaturasLoading,
    updateStatus,
    isUpdating: isUpdatingCandidatura,
  } = useCandidaturasAdmin(selectedChamadoId || undefined);

  // Accept with task state
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [acceptingCandidatura, setAcceptingCandidatura] = useState<any>(null);
  const [createTaskOnAccept, setCreateTaskOnAccept] = useState(true);
  const [taskData, setTaskData] = useState({
    titulo: "",
    prioridade: "media" as SquadTaskPrioridade,
    prazo_em: "",
    squadId: "",
  });

  // Governance History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyEntityId, setHistoryEntityId] = useState<string | null>(null);
  const [historyEntityType, setHistoryEntityType] = useState<"chamado_talentos" | "candidatura_chamado">("chamado_talentos");
  const [historyEntityTitle, setHistoryEntityTitle] = useState<string>("");

  // Get squads for the chamado's scope
  const selectedChamado = chamados.find((c) => c.id === selectedChamadoId);
  const { squads: availableSquads } = useSquadsForScope(
    selectedChamado?.escopo_tipo,
    selectedChamado?.escopo_id
  );
  const { acceptWithTask, isAccepting } = useAcceptCandidaturaWithTask();

  // Auth check
  if (!isCoordinator()) {
    navigate("/voluntario/hoje");
    return null;
  }

  // Get managed cells for scope
  const managedCells = cells?.filter((c) => {
    if (isAdmin() || scope.type === "all") return true;
    if (scope.cidade) return c.city === scope.cidade;
    if (scope.cellId) return c.id === scope.cellId;
    return false;
  }) ?? [];

  const uniqueCities = [...new Set(managedCells.map((c) => c.city))];

  const toggleSkill = (skill: string) => {
    setNewChamado((prev) => ({
      ...prev,
      skills_requeridas: prev.skills_requeridas.includes(skill)
        ? prev.skills_requeridas.filter((s) => s !== skill)
        : [...prev.skills_requeridas, skill],
    }));
  };

  const handleCreateChamado = async () => {
    if (!newChamado.titulo || !newChamado.descricao || newChamado.skills_requeridas.length === 0) {
      toast.error("Preencha título, descrição e pelo menos uma skill");
      return;
    }
    if (!newChamado.escopo_id) {
      toast.error("Selecione o escopo");
      return;
    }

    try {
      const created = await createChamado({
        escopo_tipo: newChamado.escopo_tipo,
        escopo_id: newChamado.escopo_id,
        escopo_cidade: newChamado.escopo_tipo === "cidade" ? newChamado.escopo_cidade : undefined,
        titulo: newChamado.titulo,
        descricao: newChamado.descricao,
        skills_requeridas: newChamado.skills_requeridas,
        urgencia: newChamado.urgencia,
      });

      // Publish to mural if enabled
      if (newChamado.publicarNoMural && newChamado.escopo_tipo === "celula") {
        const cell = cells?.find((c) => c.id === newChamado.escopo_id);
        const skillLabels = newChamado.skills_requeridas
          .map((s) => AVAILABLE_SKILLS.find((sk) => sk.value === s)?.label ?? s)
          .join(", ");

        const corpo = `## ${newChamado.titulo}\n\n${newChamado.descricao}\n\n**Habilidades procuradas:** ${skillLabels}\n\n👉 [Candidate-se aqui](/voluntario/talentos)`;

        const { data: muralPost, error: muralError } = await supabase
          .from("mural_posts")
          .insert({
            escopo_tipo: "celula",
            escopo_id: newChamado.escopo_id,
            autor_user_id: user!.id,
            tipo: "chamado",
            titulo: `🔔 Chamado: ${newChamado.titulo}`,
            corpo_markdown: corpo,
          })
          .select()
          .single();

        if (!muralError && muralPost) {
          await updateChamado({ id: created.id, mural_post_id: muralPost.id });
          toast.success("Chamado criado e publicado no Mural!");
        } else {
          toast.success("Chamado criado!");
        }
      } else {
        toast.success("Chamado criado!");
      }

      setShowNewDialog(false);
      setNewChamado({
        escopo_tipo: "celula",
        escopo_id: "",
        escopo_cidade: "",
        titulo: "",
        descricao: "",
        skills_requeridas: [],
        urgencia: "media",
        publicarNoMural: false,
      });
    } catch (error) {
      toast.error("Erro ao criar chamado");
    }
  };

  const handleUpdateChamadoStatus = async (id: string, status: ChamadoStatus) => {
    try {
      await updateChamado({ id, status });
      toast.success("Status atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar");
    }
  };

  const handleUpdateCandidaturaStatus = async (id: string, status: CandidaturaStatus) => {
    try {
      await updateStatus({ id, status });
      toast.success("Candidatura atualizada");
    } catch (error) {
      toast.error("Erro ao atualizar");
    }
  };

  const openAcceptDialog = (candidatura: any) => {
    const chamado = chamados.find((c) => c.id === candidatura.chamado_id);
    setAcceptingCandidatura(candidatura);
    setTaskData({
      titulo: `Atender chamado: ${chamado?.titulo ?? "Chamado"}`,
      prioridade: "media",
      prazo_em: "",
      squadId: availableSquads[0]?.id ?? "",
    });
    setCreateTaskOnAccept(true);
    setShowAcceptDialog(true);
  };

  const handleAcceptWithTask = async () => {
    if (!acceptingCandidatura) return;

    try {
      if (createTaskOnAccept && taskData.squadId) {
        await acceptWithTask({
          candidaturaId: acceptingCandidatura.id,
          squadId: taskData.squadId,
          taskTitulo: taskData.titulo,
          taskPrioridade: taskData.prioridade,
          taskPrazo: taskData.prazo_em || undefined,
        });
        toast.success("Candidatura aceita e tarefa criada!");
      } else {
        await updateStatus({ id: acceptingCandidatura.id, status: "aceito" });
        toast.success("Candidatura aceita!");
      }
      setShowAcceptDialog(false);
      setAcceptingCandidatura(null);
    } catch (error) {
      toast.error("Erro ao aceitar candidatura");
    }
  };

  const getSkillLabel = (value: string) => {
    return AVAILABLE_SKILLS.find((s) => s.value === value)?.label ?? value;
  };

  const getCellName = (cellId: string) => {
    return cells?.find((c) => c.id === cellId)?.name ?? "Célula";
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
          <h1 className="text-lg font-semibold flex-1">Banco de Talentos</h1>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="banco" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              Banco
            </TabsTrigger>
            <TabsTrigger value="chamados" className="flex-1">
              <Briefcase className="h-4 w-4 mr-2" />
              Chamados
            </TabsTrigger>
            <TabsTrigger value="candidaturas" className="flex-1">
              <Clock className="h-4 w-4 mr-2" />
              Candidaturas
            </TabsTrigger>
          </TabsList>

          {/* Banco Tab - Skills Search */}
          <TabsContent value="banco" className="space-y-4">
            <div className="flex gap-2">
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Filtrar por skill..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {AVAILABLE_SKILLS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Cidade..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {uniqueCities.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isSearching ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : skillsResults.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum voluntário encontrado com os filtros selecionados.</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voluntário</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Disponibilidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skillsResults.map((result: any) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        {result.profiles?.nickname || result.profiles?.full_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getSkillLabel(result.skill)}</Badge>
                      </TableCell>
                      <TableCell>{SKILL_NIVEL_LABELS[result.nivel]}</TableCell>
                      <TableCell>{result.profiles?.city || "—"}</TableCell>
                      <TableCell>
                        {result.disponibilidade_horas
                          ? `${result.disponibilidade_horas}h/sem`
                          : result.disponibilidade_tags?.join(", ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Chamados Tab */}
          <TabsContent value="chamados" className="space-y-4">
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Chamado
            </Button>

            {isChamadosLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : chamados.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum chamado criado ainda.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {chamados.map((chamado) => {
                  const urgenciaInfo = CHAMADO_URGENCIA_LABELS[chamado.urgencia];
                  const statusInfo = CHAMADO_STATUS_LABELS[chamado.status];

                  return (
                    <Card key={chamado.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base">{chamado.titulo}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {chamado.escopo_tipo === "celula"
                                ? getCellName(chamado.escopo_id)
                                : chamado.escopo_cidade}
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Badge className={urgenciaInfo.color}>{urgenciaInfo.label}</Badge>
                            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{chamado.descricao}</p>
                        <div className="flex flex-wrap gap-1">
                          {chamado.skills_requeridas.map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {getSkillLabel(skill)}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setHistoryEntityId(chamado.id);
                              setHistoryEntityType("chamado_talentos");
                              setHistoryEntityTitle(chamado.titulo);
                              setHistoryOpen(true);
                            }}
                            aria-label={`Ver histórico de ${chamado.titulo}`}
                          >
                            <History className="h-4 w-4 mr-1" />
                            Histórico
                          </Button>
                          <Select
                            value={chamado.status}
                            onValueChange={(v) =>
                              handleUpdateChamadoStatus(chamado.id, v as ChamadoStatus)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aberto">Aberto</SelectItem>
                              <SelectItem value="em_andamento">Em andamento</SelectItem>
                              <SelectItem value="fechado">Fechado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedChamadoId(chamado.id);
                              setActiveTab("candidaturas");
                            }}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            Ver Candidaturas
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Candidaturas Tab */}
          <TabsContent value="candidaturas" className="space-y-4">
            <Select
              value={selectedChamadoId || ""}
              onValueChange={(v) => setSelectedChamadoId(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um chamado..." />
              </SelectTrigger>
              <SelectContent>
                {chamados.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.titulo} ({CHAMADO_STATUS_LABELS[c.status].label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!selectedChamadoId ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Selecione um chamado para ver as candidaturas.</p>
                </CardContent>
              </Card>
            ) : isCandidaturasLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : candidaturas.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma candidatura para este chamado.</p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voluntário</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidaturas.map((c: any) => {
                    const statusInfo = CANDIDATURA_STATUS_LABELS[c.status as CandidaturaStatus];
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          {c.profile?.nickname || c.profile?.full_name || "—"}
                        </TableCell>
                        <TableCell>{c.profile?.city || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {c.mensagem || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {c.status === "pendente" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAcceptDialog(c)}
                                disabled={isUpdatingCandidatura}
                              >
                                <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                                Aceitar
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleUpdateCandidaturaStatus(c.id, "recusado")}
                                disabled={isUpdatingCandidatura}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* New Chamado Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Chamado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Escopo */}
            <div className="space-y-2">
              <Label>Escopo *</Label>
              <Select
                value={newChamado.escopo_tipo}
                onValueChange={(v) =>
                  setNewChamado((p) => ({
                    ...p,
                    escopo_tipo: v as ChamadoEscopoTipo,
                    escopo_id: "",
                    escopo_cidade: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="celula">Célula</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newChamado.escopo_tipo === "celula" ? (
              <div className="space-y-2">
                <Label>Célula *</Label>
                <Select
                  value={newChamado.escopo_id}
                  onValueChange={(v) => setNewChamado((p) => ({ ...p, escopo_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {managedCells.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Cidade *</Label>
                <Select
                  value={newChamado.escopo_cidade}
                  onValueChange={(v) =>
                    setNewChamado((p) => ({
                      ...p,
                      escopo_cidade: v,
                      escopo_id: v, // Use cidade as ID for city scope
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Titulo */}
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Precisamos de designer para campanha"
                value={newChamado.titulo}
                onChange={(e) => setNewChamado((p) => ({ ...p, titulo: e.target.value }))}
              />
            </div>

            {/* Descricao */}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Descreva o que é necessário..."
                value={newChamado.descricao}
                onChange={(e) => setNewChamado((p) => ({ ...p, descricao: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Habilidades Necessárias *</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SKILLS.map((s) => (
                  <Badge
                    key={s.value}
                    variant={newChamado.skills_requeridas.includes(s.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSkill(s.value)}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Urgencia */}
            <div className="space-y-2">
              <Label>Urgência</Label>
              <Select
                value={newChamado.urgencia}
                onValueChange={(v) =>
                  setNewChamado((p) => ({ ...p, urgencia: v as ChamadoUrgencia }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Publicar no Mural */}
            {newChamado.escopo_tipo === "celula" && newChamado.escopo_id && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Publicar no Mural da Célula</p>
                  <p className="text-xs text-muted-foreground">
                    Aumenta o alcance do chamado
                  </p>
                </div>
                <Switch
                  checked={newChamado.publicarNoMural}
                  onCheckedChange={(v) =>
                    setNewChamado((p) => ({ ...p, publicarNoMural: v }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateChamado} disabled={isCreating}>
              {isCreating ? <LoadingSpinner size="sm" /> : "Criar Chamado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Candidatura with Task Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Aceitar Candidatura
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {acceptingCandidatura && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  {acceptingCandidatura.profile?.nickname || acceptingCandidatura.profile?.full_name}
                </p>
                {acceptingCandidatura.mensagem && (
                  <p className="text-sm text-muted-foreground mt-1">
                    "{acceptingCandidatura.mensagem}"
                  </p>
                )}
              </div>
            )}

            {/* Create Task Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Criar tarefa no Squad</p>
                  <p className="text-xs text-muted-foreground">
                    Adiciona o voluntário ao squad e cria uma tarefa
                  </p>
                </div>
              </div>
              <Switch
                checked={createTaskOnAccept}
                onCheckedChange={setCreateTaskOnAccept}
              />
            </div>

            {createTaskOnAccept && (
              <div className="space-y-4 border-t pt-4">
                {/* Squad Selection */}
                <div className="space-y-2">
                  <Label>Squad *</Label>
                  <Select
                    value={taskData.squadId}
                    onValueChange={(v) => setTaskData((p) => ({ ...p, squadId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um squad..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSquads.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableSquads.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum squad ativo. Crie um em /admin/squads
                    </p>
                  )}
                </div>

                {/* Task Title */}
                <div className="space-y-2">
                  <Label>Título da Tarefa</Label>
                  <Input
                    value={taskData.titulo}
                    onChange={(e) => setTaskData((p) => ({ ...p, titulo: e.target.value }))}
                  />
                </div>

                {/* Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={taskData.prioridade}
                      onValueChange={(v) =>
                        setTaskData((p) => ({ ...p, prioridade: v as SquadTaskPrioridade }))
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

                  {/* Deadline */}
                  <div className="space-y-2">
                    <Label>Prazo (opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={taskData.prazo_em}
                      onChange={(e) => setTaskData((p) => ({ ...p, prazo_em: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAcceptWithTask}
              disabled={isAccepting || (createTaskOnAccept && !taskData.squadId)}
            >
              {isAccepting ? (
                <LoadingSpinner size="sm" />
              ) : createTaskOnAccept ? (
                "Aceitar + Criar Tarefa"
              ) : (
                "Aceitar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Governance History Sheet */}
      <GovernanceHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entityType={historyEntityType}
        entityId={historyEntityId}
        entityTitle={historyEntityTitle}
      />
    </div>
  );
}
