import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAnuncios, AnuncioStatus } from "@/hooks/useAnuncios";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Megaphone,
  Plus,
  Calendar,
  MapPin,
  Globe,
  Building2,
  Users,
  Eye,
  Edit2,
  FileText,
  Archive,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AdminAnuncios() {
  const navigate = useNavigate();
  const { isCoordinator, isLoading: rolesLoading } = useUserRoles();
  const [statusFilter, setStatusFilter] = useState<AnuncioStatus | "all">("all");
  const { anuncios, isLoading, refetch } = useAnuncios(
    statusFilter === "all" ? undefined : statusFilter
  );

  if (rolesLoading) {
    return <FullPageLoader />;
  }

  if (!isCoordinator()) {
    navigate("/voluntario");
    return null;
  }

  const getEscopoIcon = (escopo: string) => {
    switch (escopo) {
      case "GLOBAL":
        return <Globe className="h-3 w-3" />;
      case "REGIAO":
        return <MapPin className="h-3 w-3" />;
      case "CIDADE":
        return <Building2 className="h-3 w-3" />;
      case "CELULA":
        return <Users className="h-3 w-3" />;
      default:
        return <Globe className="h-3 w-3" />;
    }
  };

  const getEscopoLabel = (anuncio: typeof anuncios[0]) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "RASCUNHO":
        return <FileText className="h-3 w-3" />;
      case "PUBLICADO":
        return <Send className="h-3 w-3" />;
      case "ARQUIVADO":
        return <Archive className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "RASCUNHO":
        return "secondary" as const;
      case "PUBLICADO":
        return "default" as const;
      case "ARQUIVADO":
        return "outline" as const;
      default:
        return "secondary" as const;
    }
  };

  const statusCounts = {
    all: anuncios.length,
    RASCUNHO: anuncios.filter((a) => a.status === "RASCUNHO").length,
    PUBLICADO: anuncios.filter((a) => a.status === "PUBLICADO").length,
    ARQUIVADO: anuncios.filter((a) => a.status === "ARQUIVADO").length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Anúncios
            </h1>
            <p className="text-xs text-muted-foreground">
              Gerencie comunicados oficiais
            </p>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      {/* Filter tabs */}
      <div className="px-4 py-2 border-b border-border bg-background/95">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as AnuncioStatus | "all")}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              Todos ({statusCounts.all})
            </TabsTrigger>
            <TabsTrigger value="PUBLICADO" className="flex-1">
              Publicados ({statusCounts.PUBLICADO})
            </TabsTrigger>
            <TabsTrigger value="RASCUNHO" className="flex-1">
              Rascunhos ({statusCounts.RASCUNHO})
            </TabsTrigger>
            <TabsTrigger value="ARQUIVADO" className="flex-1">
              Arquivados ({statusCounts.ARQUIVADO})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <main className="flex-1 p-4 space-y-4 animate-slide-up">
        {/* New announcement button */}
        <Button 
          onClick={() => navigate("/admin/anuncios/novo")}
          className="w-full btn-luta"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Anúncio
        </Button>

        {/* Announcements list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-luta animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : anuncios.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {statusFilter === "all"
                ? "Nenhum anúncio criado ainda"
                : `Nenhum anúncio ${statusFilter === "PUBLICADO" ? "publicado" : statusFilter === "RASCUNHO" ? "em rascunho" : "arquivado"}`}
            </p>
            <Button 
              className="mt-4"
              onClick={() => navigate("/admin/anuncios/novo")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro anúncio
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {anuncios.map((anuncio) => (
              <div
                key={anuncio.id}
                className="card-luta hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Megaphone className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={getStatusVariant(anuncio.status)} className="text-[10px] gap-1">
                        {getStatusIcon(anuncio.status)}
                        {anuncio.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {getEscopoIcon(anuncio.escopo)}
                        <span className="ml-1">{getEscopoLabel(anuncio)}</span>
                      </Badge>
                    </div>
                    <p className="font-bold text-sm line-clamp-2">
                      {anuncio.titulo}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {anuncio.publicado_em
                          ? `Publicado em ${format(new Date(anuncio.publicado_em), "d MMM yyyy", { locale: ptBR })}`
                          : `Criado em ${format(new Date(anuncio.created_at), "d MMM yyyy", { locale: ptBR })}`}
                      </span>
                    </div>
                    {anuncio.tags && anuncio.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {anuncio.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 bg-muted rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => navigate(`/admin/anuncios/${anuncio.id}`)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <p className="signature-luta text-center py-4 safe-bottom">
        #ÉLUTA — Escutar • Cuidar • Organizar
      </p>
    </div>
  );
}
