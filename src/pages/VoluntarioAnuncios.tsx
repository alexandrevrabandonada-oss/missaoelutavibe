import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAnunciosVoluntario } from "@/hooks/useAnuncios";
import { useRequireApproval } from "@/hooks/useRequireApproval";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FullPageLoader } from "@/components/ui/LoadingSpinner";
import { 
  ArrowLeft, 
  Megaphone,
  Search,
  Calendar,
  MapPin,
  Globe,
  Building2,
  Users,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VoluntarioAnuncios() {
  const navigate = useNavigate();
  const { isLoading: authLoading, hasAccess } = useRequireApproval();
  const { anuncios, isLoading } = useAnunciosVoluntario();
  const [searchTag, setSearchTag] = useState("");

  if (authLoading) {
    return <FullPageLoader />;
  }

  if (!hasAccess) {
    return <FullPageLoader />;
  }

  // Filter by tag
  const filteredAnuncios = searchTag
    ? anuncios.filter((a) =>
        a.tags?.some((tag) =>
          tag.toLowerCase().includes(searchTag.toLowerCase())
        )
      )
    : anuncios;

  // Get all unique tags
  const allTags = Array.from(
    new Set(anuncios.flatMap((a) => a.tags || []))
  ).slice(0, 10);

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

  return (
    <div className="min-h-screen flex flex-col bg-background texture-concrete">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario/hoje")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Anúncios
            </h1>
            <p className="text-xs text-muted-foreground">
              Comunicados oficiais da coordenação
            </p>
          </div>
          <Logo size="sm" />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 animate-slide-up">
        {/* Search by tag */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tag..."
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchTag && (
              <Badge
                variant="default"
                className="cursor-pointer"
                onClick={() => setSearchTag("")}
              >
                {searchTag} ✕
              </Badge>
            )}
            {allTags
              .filter((tag) => tag !== searchTag)
              .map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => setSearchTag(tag)}
                >
                  #{tag}
                </Badge>
              ))}
          </div>
        )}

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
        ) : filteredAnuncios.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchTag
                ? "Nenhum anúncio encontrado com essa tag"
                : "Nenhum anúncio publicado ainda"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnuncios.map((anuncio) => (
              <button
                key={anuncio.id}
                onClick={() => navigate(`/voluntario/anuncios/${anuncio.id}`)}
                className="card-luta w-full text-left hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    !anuncio.is_read ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <Megaphone className={`h-5 w-5 ${
                      !anuncio.is_read ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {!anuncio.is_read && (
                        <Badge className="bg-primary/20 text-primary text-[10px]">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Novo
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {getEscopoIcon(anuncio.escopo)}
                        <span className="ml-1">{getEscopoLabel(anuncio)}</span>
                      </Badge>
                    </div>
                    <p className={`font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors ${
                      !anuncio.is_read ? "" : "text-muted-foreground"
                    }`}>
                      {anuncio.titulo}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {anuncio.publicado_em
                          ? format(new Date(anuncio.publicado_em), "d MMM yyyy", { locale: ptBR })
                          : "—"}
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
                        {anuncio.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{anuncio.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
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
