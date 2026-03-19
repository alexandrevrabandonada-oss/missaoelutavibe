import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { useMateriais, CATEGORIAS, MaterialCategoria } from "@/hooks/useMateriais";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  Search,
  Image,
  Video,
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
  FolderOpen,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const FORMATO_ICONS: Record<string, React.ElementType> = {
  png: Image,
  jpg: Image,
  pdf: FileText,
  mp4: Video,
  link: ExternalLink,
  texto: FileText,
};

const CATEGORIA_COLORS: Record<string, string> = {
  arte: "bg-pink-500/20 text-pink-500",
  video: "bg-purple-500/20 text-purple-500",
  panfleto: "bg-orange-500/20 text-orange-500",
  logo: "bg-blue-500/20 text-blue-500",
  texto: "bg-green-500/20 text-green-500",
  outro: "bg-muted text-muted-foreground",
};

export default function Materiais() {
  const navigate = useNavigate();
  const { isLoading: authLoading, hasAccess } = useRequireApproval({ 
    pendingRedirect: "/voluntario/ajuda" 
  });
  
  const [categoriaFilter, setCategoriaFilter] = useState<MaterialCategoria | "all">("all");
  const [searchTag, setSearchTag] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { materiais, isLoading } = useMateriais({
    categoria: categoriaFilter !== "all" ? categoriaFilter : undefined,
    tag: searchTag || undefined,
  });

  const handleCopyLegenda = async (id: string, legenda: string) => {
    await navigator.clipboard.writeText(legenda);
    setCopiedId(id);
    toast({ title: "Legenda copiada!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (url: string, titulo: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = titulo;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || isLoading) {
    return <FullPageLoader text="Carregando materiais..." />;
  }

  if (!hasAccess) {
    return null;
  }

  // Extract unique tags from all materials
  const allTags = [...new Set(materiais.flatMap((m) => m.tags || []))];

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-sm font-bold uppercase tracking-wider text-primary">
              Materiais
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="p-4 space-y-4 border-b border-border">
        <div className="flex gap-2">
          <Select
            value={categoriaFilter}
            onValueChange={(v) => setCategoriaFilter(v as MaterialCategoria | "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIAS.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tag..."
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 10).map((tag) => (
              <Badge
                key={tag}
                variant={searchTag === tag ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSearchTag(searchTag === tag ? "" : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Materials Grid */}
      <main className="flex-1 p-4">
        {materiais.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Nenhum material encontrado</h2>
            <p className="text-muted-foreground">
              {searchTag || categoriaFilter !== "all"
                ? "Tente ajustar os filtros."
                : "Os materiais estarão disponíveis em breve."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materiais.map((material) => {
              const FormatoIcon = FORMATO_ICONS[material.formato] || FileText;
              
              return (
                <div
                  key={material.id}
                  className="card-luta hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/materiais/${material.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={CATEGORIA_COLORS[material.categoria]}>
                      {CATEGORIAS.find((c) => c.value === material.categoria)?.label}
                    </Badge>
                    <FormatoIcon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{material.titulo}</h3>
                  
                  {material.descricao && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {material.descricao}
                    </p>
                  )}

                  {material.tags && material.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {material.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto">
                    {material.arquivo_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (material.formato === "link") {
                            window.open(material.arquivo_url!, "_blank");
                          } else {
                            handleDownload(material.arquivo_url!, material.titulo);
                          }
                        }}
                      >
                        {material.formato === "link" ? (
                          <>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Abrir
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Baixar
                          </>
                        )}
                      </Button>
                    )}

                    {material.legenda_pronta && (
                      <Button
                        size="sm"
                        variant={copiedId === material.id ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLegenda(material.id, material.legenda_pronta!);
                        }}
                      >
                        {copiedId === material.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Fábrica de Base
      </p>
    </div>
  );
}
