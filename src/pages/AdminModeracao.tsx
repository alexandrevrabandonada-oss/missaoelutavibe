import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  RefreshCw,
  Shield,
  Flag,
  EyeOff,
  Eye,
  Ban,
  VolumeX,
  AlertTriangle,
  Check,
  X,
  Clock,
  User,
  FileText,
  Plus,
  Trash2,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  useModerationQueue,
  useHiddenContent,
  useActiveSanctions,
  useModerationTemplates,
  useModerateAction,
  useDirectModerateAction,
  useRemoveSanction,
  useCreateTemplate,
  useDeleteTemplate,
  ModerationFilters,
  REPORT_CATEGORIES,
  SANCTION_ACTIONS,
} from "@/hooks/useModeracao";
import { useSignalBursts, useResolveBurst, SIGNAL_TYPE_LABELS } from "@/hooks/useAntiBrigading";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function AdminModeracao() {
  const navigate = useNavigate();
  const { isCoordinator, isAdmin, getScope, isLoading: rolesLoading } = useUserRoles();
  const userScope = getScope();

  // Scope selection
  const [scopeTipo, setScopeTipo] = useState<"celula" | "cidade">(
    userScope.type === "celula" ? "celula" : "cidade"
  );
  const scopeId = userScope.type === "celula" ? userScope.cellId! : userScope.cidade || "";

  // Filters
  const [filters, setFilters] = useState<ModerationFilters>({ status: "open" });

  // Data hooks
  const { data: queue, isLoading: queueLoading, refetch: refetchQueue } = useModerationQueue(
    scopeTipo,
    scopeId,
    filters
  );
  const { data: hiddenContent, isLoading: hiddenLoading, refetch: refetchHidden } = useHiddenContent(
    scopeTipo,
    scopeId
  );
  const { data: sanctions, isLoading: sanctionsLoading, refetch: refetchSanctions } = useActiveSanctions(
    scopeTipo,
    scopeId
  );
  const { data: templates, refetch: refetchTemplates } = useModerationTemplates(scopeTipo, scopeId);

  // Signal bursts (anti-brigading)
  const { data: bursts, isLoading: burstsLoading, refetch: refetchBursts } = useSignalBursts(
    scopeTipo,
    scopeId,
    "ativo"
  );

  // Mutations
  const moderateAction = useModerateAction();
  const directModerate = useDirectModerateAction();
  const removeSanction = useRemoveSanction();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const resolveBurst = useResolveBurst();

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    reportId?: string;
    targetType?: string;
    targetId?: string;
    action?: string;
    durationHours?: number;
  }>({ open: false });
  const [actionNote, setActionNote] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Template dialog state
  const [templateDialog, setTemplateDialog] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");

  const refetchAll = () => {
    refetchQueue();
    refetchHidden();
    refetchSanctions();
    refetchTemplates();
    refetchBursts();
  };

  if (rolesLoading) {
    return <FullPageLoader text="Carregando..." />;
  }

  if (!isCoordinator()) {
    navigate("/voluntario/hoje");
    return null;
  }

  const handleModerateAction = (actionType: string, durationHours?: number) => {
    if (actionDialog.reportId) {
      moderateAction.mutate(
        {
          reportId: actionDialog.reportId,
          actionType,
          payload: {
            note: actionNote || undefined,
            duration_hours: durationHours,
            template_id: selectedTemplate || undefined,
          },
        },
        {
          onSuccess: () => {
            setActionDialog({ open: false });
            setActionNote("");
            setSelectedTemplate(null);
          },
        }
      );
    } else if (actionDialog.targetType && actionDialog.targetId) {
      directModerate.mutate(
        {
          scopeTipo,
          scopeId,
          targetType: actionDialog.targetType,
          targetId: actionDialog.targetId,
          actionType,
          payload: {
            note: actionNote || undefined,
            duration_hours: durationHours,
          },
        },
        {
          onSuccess: () => {
            setActionDialog({ open: false });
            setActionNote("");
          },
        }
      );
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplateTitle.trim() || !newTemplateBody.trim()) return;
    createTemplate.mutate(
      {
        scopeTipo,
        scopeId: scopeId || undefined,
        title: newTemplateTitle,
        body: newTemplateBody,
      },
      {
        onSuccess: () => {
          setTemplateDialog(false);
          setNewTemplateTitle("");
          setNewTemplateBody("");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
          <div className="flex gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={refetchAll}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="space-y-6 animate-slide-up">
          {/* Title */}
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm uppercase tracking-wider font-bold">Central de Moderação</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Gerencie reports, conteúdo oculto e sanções do escopo.
            </p>
          </div>

          {/* Scope selector for admins */}
          {isAdmin() && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Escopo:</span>
              <Select
                value={scopeTipo}
                onValueChange={(val) => setScopeTipo(val as "celula" | "cidade")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="celula">Célula</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="queue" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="queue" className="text-xs">
                <Flag className="h-3 w-3 mr-1" />
                Fila ({queue?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="bursts" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Rajadas ({bursts?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="hidden" className="text-xs">
                <EyeOff className="h-3 w-3 mr-1" />
                Ocultos ({hiddenContent?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="sanctions" className="text-xs">
                <Ban className="h-3 w-3 mr-1" />
                Sanções ({sanctions?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Templates
              </TabsTrigger>
            </TabsList>

            {/* Queue Tab */}
            <TabsContent value="queue" className="space-y-4 mt-4">
              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <Select
                  value={filters.status || "open"}
                  onValueChange={(val) => setFilters({ ...filters, status: val })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abertos</SelectItem>
                    <SelectItem value="resolvido">Resolvidos</SelectItem>
                    <SelectItem value="descartado">Descartados</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.order_by || "recent"}
                  onValueChange={(val) =>
                    setFilters({ ...filters, order_by: val as "recent" | "most_reported" })
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="most_reported">Mais reportados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {queueLoading ? (
                <div className="text-center text-muted-foreground py-8">Carregando...</div>
              ) : queue?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    Nenhum report pendente!
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {queue?.map((item) => (
                    <Card key={item.report_id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {REPORT_CATEGORIES.find((c) => c.value === item.categoria)?.emoji}{" "}
                                {REPORT_CATEGORIES.find((c) => c.value === item.categoria)?.label ||
                                  item.categoria}
                              </Badge>
                              {item.report_count > 1 && (
                                <Badge variant="destructive" className="text-xs">
                                  {item.report_count} reports
                                </Badge>
                              )}
                              {item.assigned_nickname && (
                                <Badge variant="secondary" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  {item.assigned_nickname}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm line-clamp-2">{item.content_preview}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Por {item.author_nickname || "Anônimo"} •{" "}
                              {formatDistanceToNow(new Date(item.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground italic mt-1">
                              Motivo: {item.motivo}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1">
                            {/* Quick actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Ações
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionDialog({
                                      open: true,
                                      reportId: item.report_id,
                                      action: "ocultar",
                                    });
                                  }}
                                >
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  Ocultar Post
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    moderateAction.mutate({
                                      reportId: item.report_id,
                                      actionType: "resolver",
                                    });
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Resolver
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    moderateAction.mutate({
                                      reportId: item.report_id,
                                      actionType: "descartar",
                                    });
                                  }}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Descartar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionDialog({
                                      open: true,
                                      reportId: item.report_id,
                                      action: "warning",
                                    });
                                  }}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Advertência
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionDialog({
                                      open: true,
                                      reportId: item.report_id,
                                      action: "mute",
                                      durationHours: 24,
                                    });
                                  }}
                                >
                                  <VolumeX className="h-4 w-4 mr-2" />
                                  Mute 24h
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionDialog({
                                      open: true,
                                      reportId: item.report_id,
                                      action: "mute",
                                      durationHours: 168,
                                    });
                                  }}
                                >
                                  <VolumeX className="h-4 w-4 mr-2" />
                                  Mute 7 dias
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionDialog({
                                      open: true,
                                      reportId: item.report_id,
                                      action: "ban",
                                      durationHours: 168,
                                    });
                                  }}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Ban 7 dias
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Bursts Tab (Anti-Brigading) */}
            <TabsContent value="bursts" className="space-y-4 mt-4">
              {burstsLoading ? (
                <div className="text-center text-muted-foreground py-8">Carregando...</div>
              ) : bursts?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    Nenhuma rajada detectada!
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {bursts?.map((burst) => (
                    <Card key={burst.id} className="border-orange-500/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-500">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Rajada detectada
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {SIGNAL_TYPE_LABELS[burst.signal_type]?.emoji}{" "}
                                {SIGNAL_TYPE_LABELS[burst.signal_type]?.label}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium line-clamp-2">
                              {burst.title || "Conteúdo sem título"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {burst.signals_count} sinais de {burst.unique_users} usuários em 10 min
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Detectado{" "}
                              {formatDistanceToNow(new Date(burst.detected_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  burst.target_type === "mission"
                                    ? `/voluntario/missao/${burst.target_id}`
                                    : `/voluntario/celula/${scopeId}/mural/${burst.target_id}`
                                )
                              }
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Ações
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    resolveBurst.mutate({ burstId: burst.id, action: "resolvido" })
                                  }
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Marcar resolvido
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    resolveBurst.mutate({ burstId: burst.id, action: "ignorado" })
                                  }
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Ignorar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Hidden Content Tab */}
            <TabsContent value="hidden" className="space-y-4 mt-4">
              {hiddenLoading ? (
                <div className="text-center text-muted-foreground py-8">Carregando...</div>
              ) : hiddenContent?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum conteúdo oculto.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {hiddenContent?.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {item.content_type === "post" ? "Post" : "Comentário"}
                              </Badge>
                            </div>
                            <p className="text-sm line-clamp-2">{item.content_preview}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Por {item.author_nickname || "Anônimo"} • Oculto{" "}
                              {formatDistanceToNow(new Date(item.hidden_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              directModerate.mutate({
                                scopeTipo,
                                scopeId,
                                targetType: item.content_type,
                                targetId: item.id,
                                actionType: "mostrar",
                              });
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Mostrar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Sanctions Tab */}
            <TabsContent value="sanctions" className="space-y-4 mt-4">
              {sanctionsLoading ? (
                <div className="text-center text-muted-foreground py-8">Carregando...</div>
              ) : sanctions?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhuma sanção ativa.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sanctions?.map((sanction) => (
                    <Card key={sanction.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant={sanction.kind === "ban" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {sanction.kind === "warning"
                                  ? "⚠️ Advertência"
                                  : sanction.kind === "mute"
                                  ? "🔇 Mute"
                                  : "🚫 Ban"}
                              </Badge>
                              {sanction.ends_at && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Até {format(new Date(sanction.ends_at), "dd/MM HH:mm")}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">
                              {sanction.user_nickname || "Usuário"}
                            </p>
                            {sanction.reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Motivo: {sanction.reason}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Por {sanction.moderator_nickname} •{" "}
                              {formatDistanceToNow(new Date(sanction.starts_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              removeSanction.mutate({ sanctionId: sanction.id });
                            }}
                          >
                            Remover
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setTemplateDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Template
                </Button>
              </div>

              {templates?.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum template cadastrado.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {templates?.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{template.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {template.body}
                            </p>
                            <Badge variant="outline" className="text-xs mt-2">
                              {template.scope_tipo === "global" ? "Global" : template.scope_tipo}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate.mutate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "ocultar"
                ? "Ocultar Conteúdo"
                : actionDialog.action === "warning"
                ? "Aplicar Advertência"
                : actionDialog.action === "mute"
                ? `Aplicar Mute (${actionDialog.durationHours}h)`
                : actionDialog.action === "ban"
                ? `Aplicar Ban (${actionDialog.durationHours}h)`
                : "Ação de Moderação"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {templates && templates.length > 0 && (
              <div>
                <label className="text-sm font-medium">Template</label>
                <Select
                  value={selectedTemplate || "none"}
                  onValueChange={(val) => {
                    if (val === "none") {
                      setSelectedTemplate(null);
                      setActionNote("");
                    } else {
                      setSelectedTemplate(val);
                      const t = templates.find((t) => t.id === val);
                      if (t) setActionNote(t.body);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Nota (interno)</label>
              <Textarea
                placeholder="Justificativa ou observação..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false })}>
              Cancelar
            </Button>
            <Button
              variant={
                actionDialog.action === "ban" || actionDialog.action === "mute"
                  ? "destructive"
                  : "default"
              }
              onClick={() =>
                handleModerateAction(actionDialog.action!, actionDialog.durationHours)
              }
              disabled={moderateAction.isPending || directModerate.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Template</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                placeholder="Ex: Aviso de spam"
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Texto</label>
              <Textarea
                placeholder="Texto padrão para a nota de moderação..."
                value={newTemplateBody}
                onChange={(e) => setNewTemplateBody(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={
                createTemplate.isPending || !newTemplateTitle.trim() || !newTemplateBody.trim()
              }
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
