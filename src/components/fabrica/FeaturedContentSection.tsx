import { Star, TrendingUp, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopContentWeek, CONTENT_SIGNAL_CONFIG } from "@/hooks/useContentSignals";
import { useContentItems, ContentWithAssets, getPrimaryAssetUrl } from "@/hooks/useContentItems";
import { cn } from "@/lib/utils";

interface FeaturedContentSectionProps {
  onSelectContent?: (content: ContentWithAssets) => void;
}

export function FeaturedContentSection({ onSelectContent }: FeaturedContentSectionProps) {
  // Top da Semana - ranked by signals
  const { data: topContent, isLoading: topLoading } = useTopContentWeek(undefined, 5);
  
  // Recomendados - items with 'featured' tag
  const { data: allItems, isLoading: featuredLoading } = useContentItems({
    status: "PUBLISHED",
    tag: "featured",
  });

  const featuredItems = allItems?.filter(
    item => item.type === "SHAREPACK" || item.type === "TEMPLATE"
  ).slice(0, 4) || [];

  // We need to get full content data for top items
  const { data: publishedItems } = useContentItems({ status: "PUBLISHED" });
  
  const getContentById = (id: string) => {
    return publishedItems?.find(item => item.id === id);
  };

  if (topLoading && featuredLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const hasTop = topContent && topContent.length > 0;
  const hasFeatured = featuredItems.length > 0;

  if (!hasTop && !hasFeatured) return null;

  return (
    <div className="space-y-4">
      {/* Top da Semana */}
      {hasTop && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top da Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topContent.slice(0, 5).map((item, index) => {
              const content = getContentById(item.content_id);
              const primaryUrl = content ? getPrimaryAssetUrl(content) : null;

              return (
                <button
                  key={item.content_id}
                  onClick={() => content && onSelectContent?.(content)}
                  className="flex items-center gap-3 w-full rounded-lg p-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    index === 0 ? "bg-yellow-500 text-yellow-950" :
                    index === 1 ? "bg-gray-400 text-gray-950" :
                    index === 2 ? "bg-amber-600 text-amber-950" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </span>
                  
                  <div className="h-10 w-10 rounded bg-muted overflow-hidden flex-shrink-0">
                    {primaryUrl ? (
                      <img src={primaryUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                        📦
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{CONTENT_SIGNAL_CONFIG.util.emoji} {item.util_count}</span>
                      <span>{CONTENT_SIGNAL_CONFIG.replicar.emoji} {item.replicar_count}</span>
                    </div>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recomendados */}
      {hasFeatured && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-yellow-500" />
              Recomendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {featuredItems.map(item => {
                const primaryUrl = getPrimaryAssetUrl(item);
                const isImage = item.content_assets?.some(
                  ca => ca.role === "PRIMARY" && ca.asset?.kind === "image"
                );

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectContent?.(item)}
                    className="group relative aspect-square rounded-lg bg-muted overflow-hidden"
                  >
                    {isImage && primaryUrl ? (
                      <img
                        src={primaryUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-2xl">
                          {item.type === "SHAREPACK" ? "📦" : "🎨"}
                        </span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                    </div>
                    
                    <Badge className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5">
                      <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
