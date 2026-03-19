import { useState, useRef } from "react";
import { useMateriais, CATEGORIAS, FORMATOS, MaterialCategoria, MaterialFormato, MaterialStatus, Material } from "@/hooks/useMateriais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Upload,
  Archive,
  Eye,
  FileText,
  Image,
  Video,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<MaterialStatus, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-yellow-500/20 text-yellow-600" },
  aprovado: { label: "Aprovado", color: "bg-green-500/20 text-green-600" },
  arquivado: { label: "Arquivado", color: "bg-muted text-muted-foreground" },
};

const FORMATO_ICONS: Record<string, React.ElementType> = {
  png: Image,
  jpg: Image,
  pdf: FileText,
  mp4: Video,
  link: ExternalLink,
  texto: FileText,
};

interface FormData {
  categoria: MaterialCategoria;
  titulo: string;
  descricao: string;
  tags: string;
  formato: MaterialFormato;
  arquivo_url: string;
  legenda_pronta: string;
  status: MaterialStatus;
}

const initialFormData: FormData = {
  categoria: "arte",
  titulo: "",
  descricao: "",
  tags: "",
  formato: "png",
  arquivo_url: "",
  legenda_pronta: "",
  status: "rascunho",
};

export default function AdminMateriaisPanel() {
  const {
    allMateriais,
    isLoadingAll,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    uploadFile,
    isCreating,
    isUpdating,
    isDeleting,
  } = useMateriais();

  const [showDialog, setShowDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MaterialStatus | "all">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMateriais = filterStatus === "all"
    ? allMateriais
    : allMateriais.filter((m) => m.status === filterStatus);

  const handleOpenCreate = () => {
    setEditingMaterial(null);
    setFormData(initialFormData);
    setShowDialog(true);
  };

  const handleOpenEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      categoria: material.categoria,
      titulo: material.titulo,
      descricao: material.descricao || "",
      tags: (material.tags || []).join(", "),
      formato: material.formato,
      arquivo_url: material.arquivo_url || "",
      legenda_pronta: material.legenda_pronta || "",
      status: material.status,
    });
    setShowDialog(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const url = await uploadFile(file);
    setIsUploading(false);

    if (url) {
      setFormData((prev) => ({ ...prev, arquivo_url: url }));
    }
  };

  const handleSubmit = () => {
    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingMaterial) {
      updateMaterial({
        id: editingMaterial.id,
        categoria: formData.categoria,
        titulo: formData.titulo,
        descricao: formData.descricao || undefined,
        tags,
        formato: formData.formato,
        arquivo_url: formData.arquivo_url || undefined,
        legenda_pronta: formData.legenda_pronta || undefined,
        status: formData.status,
      });
    } else {
      createMaterial({
        categoria: formData.categoria,
        titulo: formData.titulo,
        descricao: formData.descricao || undefined,
        tags,
        formato: formData.formato,
        arquivo_url: formData.arquivo_url || undefined,
        legenda_pronta: formData.legenda_pronta || undefined,
        status: formData.status,
      });
    }

    setShowDialog(false);
    setEditingMaterial(null);
    setFormData(initialFormData);
  };

  const handleQuickApprove = (material: Material) => {
    updateMaterial({ id: material.id, status: "aprovado" });
  };

  const handleQuickArchive = (material: Material) => {
    updateMaterial({ id: material.id, status: "arquivado" });
  };

  const handleDelete = (material: Material) => {
    if (confirm(`Tem certeza que deseja excluir "${material.titulo}"?`)) {
      deleteMaterial(material.id);
    }
  };

  if (isLoadingAll) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Materiais de Base</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie artes, vídeos, panfletos e textos prontos
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Material
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-luta text-center">
          <p className="text-2xl font-black text-yellow-600">
            {allMateriais.filter((m) => m.status === "rascunho").length}
          </p>
          <p className="text-xs text-muted-foreground">Rascunhos</p>
        </div>
        <div className="card-luta text-center">
          <p className="text-2xl font-black text-green-600">
            {allMateriais.filter((m) => m.status === "aprovado").length}
          </p>
          <p className="text-xs text-muted-foreground">Aprovados</p>
        </div>
        <div className="card-luta text-center">
          <p className="text-2xl font-black text-muted-foreground">
            {allMateriais.filter((m) => m.status === "arquivado").length}
          </p>
          <p className="text-xs text-muted-foreground">Arquivados</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunhos</SelectItem>
            <SelectItem value="aprovado">Aprovados</SelectItem>
            <SelectItem value="arquivado">Arquivados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="card-luta overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMateriais.map((material) => {
              const FormatoIcon = FORMATO_ICONS[material.formato] || FileText;
              const statusInfo = STATUS_LABELS[material.status];

              return (
                <TableRow key={material.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {material.titulo}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CATEGORIAS.find((c) => c.value === material.categoria)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <FormatoIcon className="h-4 w-4" />
                      <span className="text-xs">{material.formato.toUpperCase()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(material.created_at), "dd/MM/yy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {material.status === "rascunho" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-600"
                          onClick={() => handleQuickApprove(material)}
                          title="Aprovar"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {material.status === "aprovado" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleQuickArchive(material)}
                          title="Arquivar"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {material.arquivo_url && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => window.open(material.arquivo_url!, "_blank")}
                          title="Ver arquivo"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(material)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(material)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredMateriais.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum material encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? "Editar Material" : "Novo Material"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Título */}
            <div>
              <label className="text-sm font-medium mb-1 block">Título *</label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
                placeholder="Nome do material"
              />
            </div>

            {/* Categoria e Formato */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria *</label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, categoria: v as MaterialCategoria }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Formato *</label>
                <Select
                  value={formData.formato}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, formato: v as MaterialFormato }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATOS.map((fmt) => (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        {fmt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                placeholder="Breve descrição do material"
                rows={2}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium mb-1 block">Tags</label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="campanha, redes sociais, mobilização (separar por vírgula)"
              />
            </div>

            {/* Arquivo */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                {formData.formato === "link" ? "URL do Link" : "Arquivo"}
              </label>
              {formData.formato === "link" || formData.formato === "texto" ? (
                <Input
                  value={formData.arquivo_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, arquivo_url: e.target.value }))}
                  placeholder={formData.formato === "link" ? "https://..." : "Deixe em branco se não tiver arquivo"}
                />
              ) : (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept={
                      formData.formato === "png" ? "image/png" :
                      formData.formato === "jpg" ? "image/jpeg" :
                      formData.formato === "pdf" ? "application/pdf" :
                      formData.formato === "mp4" ? "video/mp4" : "*/*"
                    }
                  />
                  <div className="flex gap-2">
                    <Input
                      value={formData.arquivo_url}
                      onChange={(e) => setFormData((prev) => ({ ...prev, arquivo_url: e.target.value }))}
                      placeholder="URL do arquivo ou faça upload"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Legenda Pronta */}
            <div>
              <label className="text-sm font-medium mb-1 block">Legenda Pronta</label>
              <Textarea
                value={formData.legenda_pronta}
                onChange={(e) => setFormData((prev) => ({ ...prev, legenda_pronta: e.target.value }))}
                placeholder="Texto pronto para copiar e colar nas redes"
                rows={3}
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, status: v as MaterialStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="aprovado">Aprovado (visível para voluntários)</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.titulo || isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingMaterial ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
