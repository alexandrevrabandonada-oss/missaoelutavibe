import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { CATEGORIAS, Material, MaterialCategoria } from "@/hooks/useMateriais";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Copy,
  Check,
  Image,
  Video,
  FileText,
  Calendar,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function MaterialDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);

  const { isLoading: authLoading, hasAccess } = useRequireApproval({
    pendingRedirect: "/voluntario/ajuda",
  });

  const { data: material, isLoading } = useQuery({
    queryKey: ["material", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materiais_base")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Material;
    },
    enabled: !!id && hasAccess,
  });

  const handleCopyLegenda = async () => {
    if (!material?.legenda_pronta) return;
    await navigator.clipboard.writeText(material.legenda_pronta);
    setCopied(true);
    toast({ title: "Legenda copiada para a área de transferência!" });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    if (!material?.arquivo_url) return;
    
    if (material.formato === "link") {
      window.open(material.arquivo_url, "_blank");
    } else {
      const link = document.createElement("a");
      link.href = material.arquivo_url;
      link.download = material.titulo;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (authLoading || isLoading) {
    return <FullPageLoader text="Carregando material..." />;
  }

  if (!hasAccess) {
    return null;
  }

  if (!material) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4">Material não encontrado</h1>
        <Button onClick={() => navigate("/materiais")}>Voltar aos materiais</Button>
      </div>
    );
  }

  const FormatoIcon = FORMATO_ICONS[material.formato] || FileText;
  const isImage = ["png", "jpg"].includes(material.formato);
  const isVideo = material.formato === "mp4";

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/materiais")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 animate-slide-up">
        {/* Category and format badges */}
        <div className="flex items-center gap-2">
          <Badge className={CATEGORIA_COLORS[material.categoria]}>
            {CATEGORIAS.find((c) => c.value === material.categoria)?.label}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <FormatoIcon className="h-3 w-3" />
            {material.formato.toUpperCase()}
          </Badge>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black">{material.titulo}</h1>

        {/* Preview */}
        {material.arquivo_url && (
          <div className="card-luta overflow-hidden">
            {isImage && (
              <img
                src={material.arquivo_url}
                alt={material.titulo}
                className="w-full max-h-[400px] object-contain rounded-lg"
              />
            )}
            {isVideo && (
              <video
                src={material.arquivo_url}
                controls
                className="w-full max-h-[400px] rounded-lg"
              />
            )}
            {!isImage && !isVideo && (
              <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                <FormatoIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {material.descricao && (
          <div className="card-luta">
            <h2 className="font-bold mb-2">Descrição</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{material.descricao}</p>
          </div>
        )}

        {/* Tags */}
        {material.tags && material.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {material.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Ready caption */}
        {material.legenda_pronta && (
          <div className="card-luta border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold flex items-center gap-2">
                <Copy className="h-4 w-4 text-primary" />
                Legenda Pronta
              </h2>
              <Button
                size="sm"
                variant={copied ? "default" : "outline"}
                onClick={handleCopyLegenda}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap border border-border rounded-lg p-3 bg-background">
              {material.legenda_pronta}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {material.arquivo_url && (
            <Button className="flex-1" onClick={handleDownload}>
              {material.formato === "link" ? (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Link
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Arquivo
                </>
              )}
            </Button>
          )}
        </div>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          Adicionado em {format(new Date(material.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </main>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Fábrica de Base
      </p>
    </div>
  );
}
