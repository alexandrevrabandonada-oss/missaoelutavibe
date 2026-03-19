import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  useAnuncioDetail, 
  useAnuncioMutations, 
  useAnuncioMetrics,
  AnuncioFormData,
  AnuncioEscopo,
  AnuncioStatus,
} from "@/hooks/useAnuncios";
import { getPlaybook } from "@/lib/coordinatorPlaybooks";
import { useCells } from "@/hooks/useCells";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { 
  ArrowLeft, 
  Megaphone,
  Save,
  Send,
  Archive,
  Trash2,
  Globe,
  MapPin,
  Building2,
  Users,
  Eye,
  X,
  Plus,
} from "lucide-react";

const REGIOES = [
  "Norte",
  "Nordeste",
  "Centro-Oeste",
  "Sudeste",
  "Sul",
];

const CIDADES_EXEMPLO = [
  "São Paulo",
  "Rio de Janeiro",
  "Belo Horizonte",
  "Salvador",
  "Fortaleza",
  "Brasília",
  "Curitiba",
  "Recife",
];

export default function AdminAnuncioEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;
  
  // Prefill from coordinator alerts
  const isPrefill = searchParams.get("prefill") === "1";
  const prefillKey = searchParams.get("key") || "";
  const prefillScopeKind = searchParams.get("scope_kind") || "";
  const prefillScopeValue = searchParams.get("scope_value") || "";
  const { isCoordinator, isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { anuncio, isLoading: anuncioLoading } = useAnuncioDetail(id);
  const { metrics } = useAnuncioMetrics(id);
  const { cells } = useCells();
  const { create, update, delete: deleteMutation } = useAnuncioMutations();

  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [escopo, setEscopo] = useState<AnuncioEscopo>("GLOBAL");
  const [regiao, setRegiao] = useState<string>("");
  const [cidade, setCidade] = useState<string>("");
  const [celulaId, setCelulaId] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Apply prefill from coordinator alerts (only once)
  useEffect(() => {
    if (isPrefill && !prefillApplied && !isEditing && prefillKey) {
      const playbook = getPlaybook(prefillKey);
      if (playbook) {
        setTitulo(playbook.announcementTitle);
        setTexto(playbook.announcementBody);
        
        // Set scope based on prefill params
        if (prefillScopeKind === "city" && prefillScopeValue) {
          setEscopo("CIDADE");
          setCidade(prefillScopeValue);
        } else if (prefillScopeKind === "cell" && prefillScopeValue) {
          setEscopo("CELULA");
          setCelulaId(prefillScopeValue);
        } else if (prefillScopeKind === "region" && prefillScopeValue) {
          setEscopo("REGIAO");
          setRegiao(prefillScopeValue);
        }
        // Add alert key as tag
        setTags([prefillKey]);
        setPrefillApplied(true);
      }
    }
  }, [isPrefill, prefillApplied, isEditing, prefillKey, prefillScopeKind, prefillScopeValue]);

  // Load existing data when editing
  useEffect(() => {
    if (anuncio) {
      setTitulo(anuncio.titulo);
      setTexto(anuncio.texto);
      setEscopo(anuncio.escopo);
      setRegiao(anuncio.regiao || "");
      setCidade(anuncio.cidade || "");
      setCelulaId(anuncio.celula_id || "");
      setTags(anuncio.tags || []);
    }
  }, [anuncio]);

  if (rolesLoading || (isEditing && anuncioLoading)) {
    return <FullPageLoader />;
  }

  if (!isCoordinator()) {
    navigate("/voluntario/hoje");
    return null;
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const getFormData = (): AnuncioFormData => ({
    titulo,
    texto,
    escopo,
    tags,
    regiao: escopo === "REGIAO" ? regiao : null,
    cidade: escopo === "CIDADE" ? cidade : null,
    celula_id: escopo === "CELULA" ? celulaId : null,
  });

  const isValid = () => {
    if (!titulo.trim() || !texto.trim()) return false;
    if (escopo === "REGIAO" && !regiao) return false;
    if (escopo === "CIDADE" && !cidade) return false;
    if (escopo === "CELULA" && !celulaId) return false;
    return true;
  };

  const handleSaveDraft = async () => {
    if (!isValid()) return;
    
    if (isEditing) {
      await update.mutateAsync({ id, ...getFormData(), status: "RASCUNHO" });
    } else {
      await create.mutateAsync({ ...getFormData(), status: "RASCUNHO" });
    }
    navigate("/admin/anuncios");
  };

  const handlePublish = async () => {
    if (!isValid()) return;
    
    if (isEditing) {
      await update.mutateAsync({ id, ...getFormData(), status: "PUBLICADO" });
    } else {
      await create.mutateAsync({ ...getFormData(), status: "PUBLICADO" });
    }
    navigate("/admin/anuncios");
  };

  const handleArchive = async () => {
    if (!id) return;
    await update.mutateAsync({ id, ...getFormData(), status: "ARQUIVADO" });
    navigate("/admin/anuncios");
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteMutation.mutateAsync(id);
    navigate("/admin/anuncios");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/anuncios")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              {isEditing ? "Editar Anúncio" : "Novo Anúncio"}
            </h1>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 animate-slide-up">
        {/* Metrics for existing announcements */}
        {isEditing && anuncio?.status === "PUBLICADO" && metrics && (
          <div className="card-luta bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              <div>
                <p className="font-bold">{metrics.totalLidos} visualizações</p>
                <p className="text-xs text-muted-foreground">
                  Voluntários que abriram este anúncio
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            placeholder="Título do anúncio..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <Label htmlFor="texto">Conteúdo *</Label>
          <Textarea
            id="texto"
            placeholder="Escreva o conteúdo do anúncio..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
          />
        </div>

        {/* Scope */}
        <div className="space-y-2">
          <Label>Escopo *</Label>
          <Select value={escopo} onValueChange={(v) => setEscopo(v as AnuncioEscopo)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GLOBAL">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Nacional (todos)
                </div>
              </SelectItem>
              <SelectItem value="REGIAO">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Região
                </div>
              </SelectItem>
              <SelectItem value="CIDADE">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Cidade
                </div>
              </SelectItem>
              <SelectItem value="CELULA">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Célula
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conditional scope fields */}
        {escopo === "REGIAO" && (
          <div className="space-y-2">
            <Label>Região *</Label>
            <Select value={regiao} onValueChange={setRegiao}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a região" />
              </SelectTrigger>
              <SelectContent>
                {REGIOES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {escopo === "CIDADE" && (
          <div className="space-y-2">
            <Label>Cidade *</Label>
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a cidade" />
              </SelectTrigger>
              <SelectContent>
                {CIDADES_EXEMPLO.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {escopo === "CELULA" && (
          <div className="space-y-2">
            <Label>Célula *</Label>
            <Select value={celulaId} onValueChange={setCelulaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a célula" />
              </SelectTrigger>
              <SelectContent>
                {cells.map((cell) => (
                  <SelectItem key={cell.id} value={cell.id}>
                    {cell.name} — {cell.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
            />
            <Button type="button" variant="outline" onClick={handleAddTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={handlePublish}
            disabled={!isValid() || create.isPending || update.isPending}
            className="w-full btn-luta"
          >
            <Send className="h-4 w-4 mr-2" />
            {create.isPending || update.isPending ? "Salvando..." : "Publicar Anúncio"}
          </Button>

          <Button
            onClick={handleSaveDraft}
            disabled={!isValid() || create.isPending || update.isPending}
            variant="outline"
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>

          {isEditing && anuncio?.status === "PUBLICADO" && (
            <Button
              onClick={handleArchive}
              disabled={update.isPending}
              variant="outline"
              className="w-full"
            >
              <Archive className="h-4 w-4 mr-2" />
              Arquivar
            </Button>
          )}

          {isEditing && isAdmin() && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Anúncio
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O anúncio será permanentemente removido.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </main>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}
