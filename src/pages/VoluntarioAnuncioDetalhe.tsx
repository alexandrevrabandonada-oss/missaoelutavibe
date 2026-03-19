import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAnuncioDetail, useMarkAnuncioAsRead } from "@/hooks/useAnuncios";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { 
  ArrowLeft, 
  Megaphone,
  Calendar,
  MapPin,
  Globe,
  Building2,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VoluntarioAnuncioDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isLoading: authLoading, hasAccess } = useRequireApproval();
  const { anuncio, isLoading } = useAnuncioDetail(id);
  const markAsRead = useMarkAnuncioAsRead();

  // Mark as read when viewing
  useEffect(() => {
    if (anuncio?.id) {
      markAsRead.mutate(anuncio.id);
    }
  }, [anuncio?.id]);

  if (authLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background texture-concrete">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="h-5 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!anuncio) {
    return (
      <div className="min-h-screen flex flex-col bg-background texture-concrete">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold">Anúncio</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Anúncio não encontrado</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/voluntario/anuncios")}
            >
              Ver todos os anúncios
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const getEscopoIcon = (escopo: string) => {
    switch (escopo) {
      case "GLOBAL":
        return <Globe className="h-4 w-4" />;
      case "REGIAO":
        return <MapPin className="h-4 w-4" />;
      case "CIDADE":
        return <Building2 className="h-4 w-4" />;
      case "CELULA":
        return <Users className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getEscopoLabel = () => {
    switch (anuncio.escopo) {
      case "GLOBAL":
        return "Nacional";
      case "REGIAO":
        return anuncio.regiao || "Regional";
      case "CIDADE":
        return anuncio.cidade || "Municipal";
      case "CELULA":
        return anuncio.cells?.name || "Célula";
      default:
        return "Nacional";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Anúncio
            </h1>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-6 animate-slide-up">
        {/* Title & Meta */}
        <div>
          <h1 className="text-2xl font-bold mb-3">{anuncio.titulo}</h1>
          
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              {getEscopoIcon(anuncio.escopo)}
              {getEscopoLabel()}
            </Badge>
            {anuncio.publicado_em && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(anuncio.publicado_em), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {anuncio.tags && anuncio.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {anuncio.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="card-luta prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap">{anuncio.texto}</div>
        </div>

        {/* Back button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/voluntario/anuncios")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Anúncios
        </Button>
      </main>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}
