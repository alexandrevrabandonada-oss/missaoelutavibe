import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Share2, Package, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useContentItems, ContentWithAssets } from "@/hooks/useContentItems";
import { ShareMaterialModal } from "@/components/content/ShareMaterialModal";
import { PilotBanner } from "@/components/pilot/PilotBanner";

// Theme tag mapping for display
const THEME_LABELS: Record<string, { emoji: string; label: string }> = {
  convite: { emoji: "📩", label: "Convite" },
  escuta: { emoji: "👂", label: "Escuta" },
  denuncia: { emoji: "⚠️", label: "Denúncia" },
  registro: { emoji: "📸", label: "Registro" },
  organizacao: { emoji: "🤝", label: "Organização" },
  cuidado: { emoji: "🫶", label: "Cuidado" },
  cidade: { emoji: "🏙️", label: "Cidade" },
  saude: { emoji: "🏥", label: "Saúde" },
  transporte: { emoji: "🚌", label: "Transporte" },
  poluicao: { emoji: "🌱", label: "Poluição" },
};

function MaterialItem({
  item,
  onShare,
}: {
  item: ContentWithAssets;
  onShare: (item: ContentWithAssets) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const mainTag = item.tags?.find((t) => t !== "canonical" && THEME_LABELS[t]);
  const themeInfo = mainTag ? THEME_LABELS[mainTag] : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {themeInfo && (
                <span className="text-lg">{themeInfo.emoji}</span>
              )}
              <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
            </div>
            {item.hook && (
              <p className="text-xs text-muted-foreground">{item.hook}</p>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => onShare(item)}
            className="flex-shrink-0"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Compartilhar
          </Button>
        </div>

        {item.description && (
          <>
            <p className={`text-sm text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>
              {item.description}
            </p>
            {item.description.length > 120 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-primary hover:underline"
              >
                {expanded ? "Ver menos" : "Ver mais"}
              </button>
            )}
          </>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags
              .filter((t) => t !== "canonical")
              .slice(0, 3)
              .map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {THEME_LABELS[tag]?.label || tag}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VoluntarioBase() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [shareItem, setShareItem] = useState<ContentWithAssets | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [autoShareTriggered, setAutoShareTriggered] = useState(false);

  // Fetch all published MATERIAL content
  const { data: items = [], isLoading } = useContentItems({
    status: "PUBLISHED",
    type: "MATERIAL",
  });

  // Split canonical vs rest
  const canonical = items.filter((i) => i.tags?.includes("canonical"));
  const rest = items.filter((i) => !i.tags?.includes("canonical"));

  // Auto-open share modal for pilot step 3
  useEffect(() => {
    if (
      searchParams.get("pilot_share") === "1" &&
      !autoShareTriggered &&
      canonical.length > 0
    ) {
      setAutoShareTriggered(true);
      setShareItem(canonical[0]);
      // Clean up URL
      searchParams.delete("pilot_share");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, canonical, autoShareTriggered, setSearchParams]);

  // Search filter
  const filterBySearch = (list: ContentWithAssets[]) => {
    if (!search || search.length < 2) return list;
    const q = search.toLowerCase();
    return list.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.tags?.some((t) => t.toLowerCase().includes(q))
    );
  };

  const filteredCanonical = filterBySearch(canonical);
  const filteredRest = filterBySearch(rest);

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
        <div className="container flex items-center gap-3 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/voluntario")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">📦 Base de Materiais</h1>
            <p className="text-xs text-muted-foreground">
              {items.length} materiais prontos para compartilhar
            </p>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-6 pb-20">
        {/* Pilot Banner */}
        <PilotBanner />

        {/* Canonical Section — dominant in pilot mode */}
        {filteredCanonical.length > 0 && (
          <section>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  ⭐ Recomendados do Piloto
                  <Badge variant="secondary" className="text-[10px]">
                    {filteredCanonical.length} itens
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Compartilhe 1 material para completar sua trilha do dia
                </p>
              </CardHeader>
            </Card>
            <div className="space-y-3 mt-3">
              {filteredCanonical.map((item) => (
                <MaterialItem
                  key={item.id}
                  item={item}
                  onShare={setShareItem}
                />
              ))}
            </div>
          </section>
        )}

        {/* Non-canonical — collapsed by default */}
        {filteredRest.length > 0 && (
          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-2 font-medium">
              Ver mais materiais ({filteredRest.length})
            </summary>
            <div className="mt-3 space-y-3">
              {/* Search — only inside "Ver mais" */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar materiais..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {(showAll ? filteredRest : filteredRest.slice(0, 4)).map((item) => (
                <MaterialItem
                  key={item.id}
                  item={item}
                  onShare={setShareItem}
                />
              ))}
              {filteredRest.length > 4 && !showAll && (
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => setShowAll(true)}
                >
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Ver todos ({filteredRest.length - 4} restantes)
                </Button>
              )}
            </div>
          </details>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Nenhum material disponível</p>
            <p className="text-sm text-muted-foreground">
              Materiais serão adicionados em breve
            </p>
          </div>
        )}
      </main>

      {/* Share Modal */}
      <ShareMaterialModal
        open={!!shareItem}
        onOpenChange={(open) => !open && setShareItem(null)}
        title={shareItem?.title || ""}
        whatsappText={shareItem?.legenda_whatsapp}
        instagramCaption={shareItem?.legenda_instagram}
        description={shareItem?.description}
      />
    </div>
  );
}
