import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle, Send, Archive, Share2, Eye, AlertCircle, Wand2, Image, Printer, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { 
  useFabricaAdmin, 
  OBJETIVO_LABELS, 
  OBJETIVO_ICONS, 
  STATUS_LABELS,
  FabricaTemplate,
  FabricaObjetivo,
  FabricaStatus 
} from "@/hooks/useFabrica";
import { 
  SharePackEditor, 
  SharePackFormData, 
  AttachmentsByVariant,
  hasRequiredSharePackVariant 
} from "@/components/admin/SharePackEditor";
import { TemplateGeneratorModal } from "@/components/fabrica/TemplateGeneratorModal";
import { PrintKitModal, PRINT_FORMATS } from "@/components/fabrica/PrintKitModal";
import { GeneratedImage, TEMPLATE_FORMATS } from "@/components/fabrica/template-engine/types";
import { GovernanceHistorySheet } from "@/components/admin/GovernanceHistorySheet";
import { useLogGovernanceAction } from "@/hooks/useGovernanceAudit";
import { useStorage } from "@/hooks/useStorage";
import { toast } from "sonner";

const SCOPE_OPTIONS = [
  { value: "global", label: "Global (todos)" },
  { value: "estado", label: "Estado" },
  { value: "cidade", label: "Cidade" },
  { value: "celula", label: "Célula" },
];

export default function AdminFabrica() {
  const navigate = useNavigate();
  const { 
    templates, 
    isLoading, 
    create, 
    update, 
    delete: deleteTemplate,
    approve,
    requestReview,
    archive,
    publishToMural,
    isCreating,
    isUpdating,
    isApproving,
    effectiveScope,
  } = useFabricaAdmin();

  const [activeTab, setActiveTab] = useState<string>("todos");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FabricaTemplate | null>(null);
  const [publishOnApprove, setPublishOnApprove] = useState(false);
  
  // Template Generator state
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorTemplate, setGeneratorTemplate] = useState<FabricaTemplate | null>(null);
  
  // Print Kit state
  const [printKitOpen, setPrintKitOpen] = useState(false);
  const [printKitTemplate, setPrintKitTemplate] = useState<FabricaTemplate | null>(null);

  // Governance History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTemplate, setHistoryTemplate] = useState<FabricaTemplate | null>(null);
  const { mutate: logGovernanceAction } = useLogGovernanceAction();

  // Form state
  const [form, setForm] = useState({
    titulo: "",
    scope_tipo: "global",
    scope_id: "",
    objetivo: "outro" as FabricaObjetivo,
    texto_base: "",
    instrucoes: "",
    hashtags: "",
    tema_tags: "",
  });

  // Share Pack state
  const [sharePack, setSharePack] = useState<SharePackFormData>({
    whatsapp_text: "",
    instagram_caption: "",
    tiktok_caption: "",
    hook: "",
    cta: "",
  });
  const [attachmentsByVariant, setAttachmentsByVariant] = useState<AttachmentsByVariant>({});

  const resetForm = () => {
    setForm({
      titulo: "",
      scope_tipo: effectiveScope.tipo,
      scope_id: effectiveScope.id || "",
      objetivo: "outro",
      texto_base: "",
      instrucoes: "",
      hashtags: "",
      tema_tags: "",
    });
    setSharePack({
      whatsapp_text: "",
      instagram_caption: "",
      tiktok_caption: "",
      hook: "",
      cta: "",
    });
    setAttachmentsByVariant({});
    setEditingTemplate(null);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: FabricaTemplate) => {
    setEditingTemplate(template);
    setForm({
      titulo: template.titulo,
      scope_tipo: template.scope_tipo,
      scope_id: template.scope_id || "",
      objetivo: template.objetivo,
      texto_base: template.texto_base || "",
      instrucoes: template.instrucoes || "",
      hashtags: (template.hashtags || []).join(", "),
      tema_tags: (template.tema_tags || []).join(", "),
    });
    // Load share pack data
    const spJson = (template as any).share_pack_json || {};
    setSharePack({
      whatsapp_text: spJson.whatsapp_text || "",
      instagram_caption: spJson.instagram_caption || "",
      tiktok_caption: spJson.tiktok_caption || "",
      hook: spJson.hook || "",
      cta: spJson.cta || "",
    });
    setAttachmentsByVariant((template as any).attachments_by_variant || {});
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const hashtags = form.hashtags
      .split(",")
      .map(h => h.trim())
      .filter(Boolean)
      .slice(0, 5); // Max 5 for IG

    const tema_tags = form.tema_tags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    // Build share_pack_json
    const share_pack_json = {
      whatsapp_text: sharePack.whatsapp_text || null,
      instagram_caption: sharePack.instagram_caption || null,
      tiktok_caption: sharePack.tiktok_caption || null,
      hook: sharePack.hook || null,
      cta: sharePack.cta || null,
    };

    const payload = {
      titulo: form.titulo,
      scope_tipo: form.scope_tipo,
      scope_id: form.scope_tipo === "global" ? null : form.scope_id || null,
      objetivo: form.objetivo,
      texto_base: form.texto_base || null,
      instrucoes: form.instrucoes || null,
      hashtags,
      tema_tags,
      share_pack_json,
      attachments_by_variant: attachmentsByVariant,
    };

    if (editingTemplate) {
      await update({ id: editingTemplate.id, ...payload });
    } else {
      await create(payload);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  // Share Pack variant file helpers
  const handleAddVariantFile = (variant: string, url: string, filename: string) => {
    setAttachmentsByVariant(prev => ({
      ...prev,
      [variant]: [...(prev[variant as keyof AttachmentsByVariant] || []), { url, filename }],
    }));
  };

  const handleRemoveVariantFile = (variant: string, index: number) => {
    setAttachmentsByVariant(prev => ({
      ...prev,
      [variant]: (prev[variant as keyof AttachmentsByVariant] || []).filter((_, i) => i !== index),
    }));
  };

  const handleApprove = async (template: FabricaTemplate) => {
    await approve(template.id);
    if (publishOnApprove) {
      await publishToMural({ templateId: template.id });
    }
  };

  const handleDelete = async (template: FabricaTemplate) => {
    if (!confirm(`Excluir "${template.titulo}"?`)) return;
    await deleteTemplate(template.id);
  };

  // Abre o gerador de imagens
  const openGenerator = (template: FabricaTemplate) => {
    setGeneratorTemplate(template);
    setGeneratorOpen(true);
  };

  // Salva imagens geradas no template
  const handleSaveGeneratedImages = async (images: GeneratedImage[]) => {
    if (!generatorTemplate) return;

    // Adiciona as imagens geradas às variantes correspondentes
    const currentAttachments = (generatorTemplate as any).attachments_by_variant || {};
    const newAttachments = { ...currentAttachments };

    for (const img of images) {
      const variantKey = TEMPLATE_FORMATS[img.format].variantKey;
      const existingFiles = newAttachments[variantKey] || [];
      
      // Adiciona a nova imagem (usando data URL diretamente)
      newAttachments[variantKey] = [
        ...existingFiles,
        { url: img.dataUrl, filename: img.filename }
      ];
    }

    // Atualiza o template com as novas imagens
    await update({ 
      id: generatorTemplate.id, 
      attachments_by_variant: newAttachments 
    } as any);

    toast.success(`✅ ${images.length} imagem(ns) salva(s) no template!`);
  };

  // Abre o kit de impressão
  const openPrintKit = (template: FabricaTemplate) => {
    setPrintKitTemplate(template);
    setPrintKitOpen(true);
  };

  // Salva imagens de impressão no template
  const handleSavePrintImages = async (images: { format: string; dataUrl: string; filename: string }[]) => {
    if (!printKitTemplate) return;

    // Adiciona as imagens de impressão às variantes correspondentes
    const currentAttachments = (printKitTemplate as any).attachments_by_variant || {};
    const newAttachments = { ...currentAttachments };

    for (const img of images) {
      const variantKey = PRINT_FORMATS[img.format as keyof typeof PRINT_FORMATS].variantKey;
      const existingFiles = newAttachments[variantKey] || [];
      
      // Adiciona a nova imagem (usando data URL diretamente)
      newAttachments[variantKey] = [
        ...existingFiles,
        { url: img.dataUrl, filename: img.filename }
      ];
    }

    // Atualiza o template com as novas imagens
    await update({ 
      id: printKitTemplate.id, 
      attachments_by_variant: newAttachments 
    } as any);

    toast.success(`✅ ${images.length} imagem(ns) de impressão salva(s)!`);
  };

  const filterTemplates = (status: FabricaStatus | "todos") => {
    if (status === "todos") return templates;
    return templates.filter(t => t.status === status);
  };

  const statusCounts = {
    todos: templates.length,
    rascunho: templates.filter(t => t.status === "rascunho").length,
    revisao: templates.filter(t => t.status === "revisao").length,
    aprovado: templates.filter(t => t.status === "aprovado").length,
    arquivado: templates.filter(t => t.status === "arquivado").length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">📦 Fábrica de Base</h1>
              <p className="text-xs text-muted-foreground">Gerenciar templates de conteúdo</p>
            </div>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="todos">
              Todos ({statusCounts.todos})
            </TabsTrigger>
            <TabsTrigger value="rascunho">
              📝 ({statusCounts.rascunho})
            </TabsTrigger>
            <TabsTrigger value="revisao">
              👁️ ({statusCounts.revisao})
            </TabsTrigger>
            <TabsTrigger value="aprovado">
              ✅ ({statusCounts.aprovado})
            </TabsTrigger>
            <TabsTrigger value="arquivado">
              📦 ({statusCounts.arquivado})
            </TabsTrigger>
          </TabsList>

          {(["todos", "rascunho", "revisao", "aprovado", "arquivado"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
              {filterTemplates(tab).length === 0 && (
                <Card className="text-center py-8">
                  <CardContent>
                    <p className="text-muted-foreground">Nenhum template nesta categoria.</p>
                  </CardContent>
                </Card>
              )}

              {filterTemplates(tab).map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{OBJETIVO_ICONS[template.objetivo]}</span>
                          <CardTitle className="text-base">{template.titulo}</CardTitle>
                          <Badge variant={template.status === "aprovado" ? "default" : "secondary"} className="text-xs">
                            {STATUS_LABELS[template.status]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {template.scope_tipo === "global" ? "🌐 Global" : `📍 ${template.scope_tipo}: ${template.scope_id}`}
                          </Badge>
                          {/* Share Pack status */}
                          {hasRequiredSharePackVariant((template as any).attachments_by_variant) ? (
                            <Badge variant="outline" className="text-xs text-green-500 border-green-500">
                              📦 Share Pack
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              📦 Sem variante
                            </Badge>
                          )}
                          {template.tema_tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {template.texto_base && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {template.texto_base}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setHistoryTemplate(template);
                          setHistoryOpen(true);
                        }}
                        aria-label={`Ver histórico de ${template.titulo}`}
                      >
                        <History className="h-3 w-3 mr-1" />
                        Histórico
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(template)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>

                      {template.status === "rascunho" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => requestReview(template.id)}>
                            <Send className="h-3 w-3 mr-1" />
                            Enviar p/ Revisão
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}

                      {(template.status === "rascunho" || template.status === "revisao") && (
                        <Button size="sm" onClick={() => handleApprove(template)} disabled={isApproving}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aprovar
                        </Button>
                      )}

                      {template.status === "aprovado" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openGenerator(template)}>
                            <Wand2 className="h-3 w-3 mr-1" />
                            Gerar Imagens
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openPrintKit(template)}>
                            <Printer className="h-3 w-3 mr-1" />
                            Kit Impressão
                          </Button>
                        </>
                      )}

                      {template.status === "aprovado" && !template.mural_post_id && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={async () => {
                            await publishToMural({ templateId: template.id });
                            logGovernanceAction({
                              entityType: "fabrica_template",
                              entityId: template.id,
                              action: "published_to_mural",
                              meta: { titulo: template.titulo },
                            });
                          }}
                        >
                          <Share2 className="h-3 w-3 mr-1" />
                          Publicar no Mural
                        </Button>
                      )}

                      {template.status === "aprovado" && template.mural_post_id && (
                        <Badge variant="secondary" className="text-xs">
                          📢 No mural
                        </Badge>
                      )}

                      {template.status === "aprovado" && (
                        <Button variant="ghost" size="sm" onClick={() => archive(template.id)}>
                          <Archive className="h-3 w-3 mr-1" />
                          Arquivar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input 
                value={form.titulo} 
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex: Denúncia do Leite"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Escopo</Label>
                <Select value={form.scope_tipo} onValueChange={(v) => setForm({ ...form, scope_tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.scope_tipo !== "global" && (
                <div>
                  <Label>ID do Escopo</Label>
                  <Input 
                    value={form.scope_id} 
                    onChange={(e) => setForm({ ...form, scope_id: e.target.value })}
                    placeholder="Ex: São Paulo"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Objetivo</Label>
              <Select value={form.objetivo} onValueChange={(v) => setForm({ ...form, objetivo: v as FabricaObjetivo })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OBJETIVO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {OBJETIVO_ICONS[key as FabricaObjetivo]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Texto Base / Legenda</Label>
              <Textarea 
                value={form.texto_base} 
                onChange={(e) => setForm({ ...form, texto_base: e.target.value })}
                placeholder="Texto que o voluntário vai copiar..."
                rows={4}
              />
            </div>

            <div>
              <Label>Hashtags (máx. 5, separadas por vírgula)</Label>
              <Input 
                value={form.hashtags} 
                onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
                placeholder="#exemplo, #campanha"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Limite de 5 hashtags para Instagram
              </p>
            </div>

            <div>
              <Label>Tags de Tema (separadas por vírgula)</Label>
              <Input 
                value={form.tema_tags} 
                onChange={(e) => setForm({ ...form, tema_tags: e.target.value })}
                placeholder="saúde, educação, economia"
              />
            </div>

            <div>
              <Label>Instruções (onde postar, cuidados)</Label>
              <Textarea 
                value={form.instrucoes} 
                onChange={(e) => setForm({ ...form, instrucoes: e.target.value })}
                placeholder="Postar no Instagram e Twitter. Evite usar entre 22h-6h..."
                rows={2}
              />
            </div>

            {!editingTemplate && (
              <div className="flex items-center gap-2">
                <Switch 
                  id="publish-on-approve" 
                  checked={publishOnApprove}
                  onCheckedChange={setPublishOnApprove}
                />
                <Label htmlFor="publish-on-approve" className="text-sm">
                  Publicar no mural ao aprovar
                </Label>
              </div>
            )}

            {/* Share Pack Editor */}
            <SharePackEditor
              sharePack={sharePack}
              onSharePackChange={(data) => setSharePack({ ...sharePack, ...data })}
              attachmentsByVariant={attachmentsByVariant}
              onVariantFilesChange={(variant, files) => setAttachmentsByVariant(prev => ({ ...prev, [variant]: files }))}
              onAddVariantFile={handleAddVariantFile}
              onRemoveVariantFile={handleRemoveVariantFile}
              templateTitulo={form.titulo}
              templateId={editingTemplate?.id}
              baseText={form.texto_base}
              hashtags={form.hashtags.split(",").map(h => h.trim()).filter(Boolean)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!form.titulo || isCreating || isUpdating}>
              {editingTemplate ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Generator Modal */}
      {generatorTemplate && (
        <TemplateGeneratorModal
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
          templateTitle={generatorTemplate.titulo}
          templateId={generatorTemplate.id}
          baseText={generatorTemplate.texto_base || ""}
          onSaveAttachments={handleSaveGeneratedImages}
        />
      )}

      {/* Print Kit Modal */}
      {printKitTemplate && (
        <PrintKitModal
          open={printKitOpen}
          onOpenChange={setPrintKitOpen}
          templateTitle={printKitTemplate.titulo}
          templateId={printKitTemplate.id}
          baseText={printKitTemplate.texto_base || ""}
          onSaveAttachments={handleSavePrintImages}
        />
      )}

      {/* Governance History Sheet */}
      <GovernanceHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        entityType="fabrica_template"
        entityId={historyTemplate?.id || null}
        entityTitle={historyTemplate?.titulo}
      />
    </div>
  );
}
