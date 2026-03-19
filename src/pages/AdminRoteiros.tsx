import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Eye, 
  FileText,
  Send,
  Archive,
  CheckCircle,
  Clock,
  Copy,
  MessageCircle,
  History,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  useRoteirosAdmin,
  useRoteirosMutations,
  useRoteirosMetrics,
  Roteiro,
  RoteiroObjetivo,
  RoteiroStatus,
  RoteiroEscopoTipo,
  OBJETIVO_LABELS,
  OBJETIVO_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  ESCOPO_LABELS,
  CreateRoteiroInput,
} from "@/hooks/useRoteiros";
import { useCells } from "@/hooks/useCells";
import { GovernanceHistorySheet } from "@/components/admin/GovernanceHistorySheet";
import { useLogGovernanceAction } from "@/hooks/useGovernanceAudit";

export default function AdminRoteiros() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCoordinator } = useUserRoles();
  const [activeTab, setActiveTab] = useState<RoteiroStatus>("revisao");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoteiro, setEditingRoteiro] = useState<Roteiro | null>(null);
  const [previewRoteiro, setPreviewRoteiro] = useState<Roteiro | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishingRoteiro, setPublishingRoteiro] = useState<Roteiro | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string>("");
  
  // Governance History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRoteiro, setHistoryRoteiro] = useState<Roteiro | null>(null);
  const { mutate: logGovernanceAction } = useLogGovernanceAction();

  const { data: roteiros, isLoading } = useRoteirosAdmin(activeTab);
  const { data: metrics } = useRoteirosMetrics();
  const { createRoteiro, updateRoteiro, deleteRoteiro, publishToMural } = useRoteirosMutations();
  const { cells } = useCells();

  // Form state
  const [formData, setFormData] = useState<CreateRoteiroInput>({
    titulo: "",
    objetivo: "convidar",
    texto_base: "",
    versoes_json: { curta: "", media: "", longa: "" },
    tags: [],
    status: "rascunho",
    escopo_tipo: "global",
    escopo_estado: null,
    escopo_cidade: null,
    escopo_celula_id: null,
  });

  if (!user || !isCoordinator()) {
    navigate("/admin");
    return null;
  }

  const handleOpenEditor = (roteiro?: Roteiro) => {
    if (roteiro) {
      setEditingRoteiro(roteiro);
      // Cast to any for new columns not yet in types
      const roteiroAny = roteiro as any;
      setFormData({
        titulo: roteiro.titulo,
        objetivo: roteiro.objetivo,
        texto_base: roteiro.texto_base,
        versoes_json: roteiro.versoes_json,
        tags: roteiro.tags,
        status: roteiro.status,
        escopo_tipo: roteiro.escopo_tipo,
        escopo_estado: roteiro.escopo_estado,
        escopo_cidade: roteiro.escopo_cidade,
        escopo_celula_id: roteiro.escopo_celula_id,
        objections: roteiroAny.objections || [],
        next_steps: roteiroAny.next_steps || [],
      } as any);
    } else {
      setEditingRoteiro(null);
      setFormData({
        titulo: "",
        objetivo: "convidar",
        texto_base: "",
        versoes_json: { curta: "", media: "", longa: "" },
        tags: [],
        status: "rascunho",
        escopo_tipo: "global",
        escopo_estado: null,
        escopo_cidade: null,
        escopo_celula_id: null,
        objections: [],
        next_steps: [],
      } as any);
    }
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!formData.titulo || !formData.texto_base) {
      toast({ title: "Preencha título e texto base", variant: "destructive" });
      return;
    }

    if (editingRoteiro) {
      await updateRoteiro.mutateAsync({ id: editingRoteiro.id, ...formData });
    } else {
      await createRoteiro.mutateAsync(formData);
    }
    setIsEditorOpen(false);
  };

  const handleStatusChange = async (roteiro: Roteiro, newStatus: RoteiroStatus) => {
    await updateRoteiro.mutateAsync({ id: roteiro.id, status: newStatus });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este roteiro?")) {
      await deleteRoteiro.mutateAsync(id);
    }
  };

  const handlePublishToMural = async () => {
    if (!publishingRoteiro || !selectedCellId) {
      toast({ title: "Selecione uma célula", variant: "destructive" });
      return;
    }
    await publishToMural.mutateAsync({ roteiroId: publishingRoteiro.id, cellId: selectedCellId });
    // Log governance action
    logGovernanceAction({
      entityType: "roteiro_conversa",
      entityId: publishingRoteiro.id,
      action: "published_to_mural",
      meta: { titulo: publishingRoteiro.titulo, cellId: selectedCellId },
    });
    setPublishDialogOpen(false);
    setPublishingRoteiro(null);
    setSelectedCellId("");
  };

  const getTabCount = (status: RoteiroStatus) => {
    if (status === activeTab) {
      return roteiros?.length || 0;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Roteiros de Conversa</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie os roteiros para voluntários
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenEditor()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Roteiro
          </Button>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{metrics.total_roteiros}</div>
                <p className="text-xs text-muted-foreground">Roteiros Aprovados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{metrics.roteiros_revisao}</div>
                <p className="text-xs text-muted-foreground">Em Revisão</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{metrics.acoes_periodo}</div>
                <p className="text-xs text-muted-foreground">Ações (7 dias)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{metrics.usuarios_ativos}</div>
                <p className="text-xs text-muted-foreground">Usuários Ativos</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Roteiros */}
        {metrics?.top_roteiros && metrics.top_roteiros.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top Roteiros (7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.top_roteiros.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span className="font-medium">{r.titulo}</span>
                      <Badge variant="outline" className="text-xs">
                        {OBJETIVO_LABELS[r.objetivo as RoteiroObjetivo]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Copy className="h-3 w-3" />
                        {r.total_acoes}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {r.usos}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RoteiroStatus)}>
          <TabsList>
            <TabsTrigger value="revisao" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Revisão
              {getTabCount("revisao") !== null && (
                <Badge variant="secondary" className="ml-1">
                  {getTabCount("revisao")}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="aprovado" className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Aprovados
            </TabsTrigger>
            <TabsTrigger value="rascunho" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Rascunhos
            </TabsTrigger>
            <TabsTrigger value="arquivado" className="flex items-center gap-1">
              <Archive className="h-4 w-4" />
              Arquivados
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : roteiros && roteiros.length > 0 ? (
              <div className="space-y-4">
                {roteiros.map((roteiro) => (
                  <Card key={roteiro.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{roteiro.titulo}</span>
                            <Badge className={OBJETIVO_COLORS[roteiro.objetivo]}>
                              {OBJETIVO_LABELS[roteiro.objetivo]}
                            </Badge>
                            <Badge variant="outline">
                              {ESCOPO_LABELS[roteiro.escopo_tipo]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {roteiro.texto_base}
                          </p>
                          {roteiro.tags && roteiro.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {roteiro.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setHistoryRoteiro(roteiro);
                              setHistoryOpen(true);
                            }}
                            aria-label={`Ver histórico de ${roteiro.titulo}`}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewRoteiro(roteiro)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditor(roteiro)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {roteiro.status === "revisao" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600"
                              onClick={() => handleStatusChange(roteiro, "aprovado")}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {roteiro.status === "aprovado" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600"
                              onClick={() => {
                                setPublishingRoteiro(roteiro);
                                setPublishDialogOpen(true);
                              }}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {roteiro.status !== "arquivado" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-orange-600"
                              onClick={() => handleStatusChange(roteiro, "arquivado")}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(roteiro.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum roteiro nesta categoria
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Editor Dialog */}
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRoteiro ? "Editar Roteiro" : "Novo Roteiro"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Convite para evento presencial"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Objetivo</Label>
                  <Select
                    value={formData.objetivo}
                    onValueChange={(v) => setFormData({ ...formData, objetivo: v as RoteiroObjetivo })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OBJETIVO_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as RoteiroStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Escopo</Label>
                <Select
                  value={formData.escopo_tipo}
                  onValueChange={(v) => setFormData({ ...formData, escopo_tipo: v as RoteiroEscopoTipo })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESCOPO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Texto Base</Label>
                <Textarea
                  value={formData.texto_base}
                  onChange={(e) => setFormData({ ...formData, texto_base: e.target.value })}
                  placeholder="Escreva o roteiro aqui..."
                  rows={6}
                />
              </div>

              <div>
                <Label>Tags (separadas por vírgula)</Label>
                <Input
                  value={formData.tags?.join(", ") || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Ex: evento, presencial, iniciante"
                />
              </div>

              {/* Objections JSON Editor */}
              <div>
                <Label className="flex items-center gap-2">
                  Objeções (JSON)
                  <span className="text-xs text-muted-foreground">
                    [{`{key, label, reply_text}`}]
                  </span>
                </Label>
                <Textarea
                  value={
                    (formData as any).objections 
                      ? JSON.stringify((formData as any).objections, null, 2)
                      : '[\n  {"key": "sem_tempo", "label": "Não tenho tempo", "reply_text": "Resposta..."}\n]'
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({ ...formData, objections: parsed } as any);
                    } catch {
                      // Invalid JSON, keep raw text for editing
                    }
                  }}
                  placeholder='[{"key": "...", "label": "...", "reply_text": "..."}]'
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>

              {/* Next Steps JSON Editor */}
              <div>
                <Label className="flex items-center gap-2">
                  Próximos Passos (JSON)
                  <span className="text-xs text-muted-foreground">
                    [{`{key, label, action}`}]
                  </span>
                </Label>
                <Textarea
                  value={
                    (formData as any).next_steps
                      ? JSON.stringify((formData as any).next_steps, null, 2)
                      : '[\n  {"key": "agendar", "label": "Agendar follow-up", "action": "schedule_followup"}\n]'
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({ ...formData, next_steps: parsed } as any);
                    } catch {
                      // Invalid JSON, keep raw text for editing
                    }
                  }}
                  placeholder='[{"key": "...", "label": "...", "action": "schedule_followup|invite_plus1|save_contact|whatsapp|open_today"}]'
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createRoteiro.isPending || updateRoteiro.isPending}
                >
                  {createRoteiro.isPending || updateRoteiro.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewRoteiro} onOpenChange={() => setPreviewRoteiro(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewRoteiro?.titulo}
                <Badge className={OBJETIVO_COLORS[previewRoteiro?.objetivo as RoteiroObjetivo]}>
                  {OBJETIVO_LABELS[previewRoteiro?.objetivo as RoteiroObjetivo]}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                {previewRoteiro?.texto_base}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (previewRoteiro) {
                      navigator.clipboard.writeText(previewRoteiro.texto_base);
                      toast({ title: "Copiado!" });
                    }
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  className="text-green-600"
                  onClick={() => {
                    if (previewRoteiro) {
                      const text = encodeURIComponent(previewRoteiro.texto_base);
                      window.open(`https://wa.me/?text=${text}`, "_blank");
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Testar no WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Publish to Mural Dialog */}
        <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publicar no Mural</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione a célula onde o roteiro será publicado como material.
              </p>
              <div>
                <Label>Célula</Label>
                <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma célula" />
                  </SelectTrigger>
                  <SelectContent>
                    {cells?.map((cell) => (
                      <SelectItem key={cell.id} value={cell.id}>
                        {cell.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handlePublishToMural}
                  disabled={publishToMural.isPending}
                >
                  {publishToMural.isPending ? "Publicando..." : "Publicar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Governance History Sheet */}
        <GovernanceHistorySheet
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          entityType="roteiro_conversa"
          entityId={historyRoteiro?.id || null}
          entityTitle={historyRoteiro?.titulo}
        />
      </div>
    </div>
  );
}
