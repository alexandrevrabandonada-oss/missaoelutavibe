import { useState } from "react";
import { X, Download, Copy, Share2, PlusCircle, ExternalLink, ChevronDown, FileImage, FileVideo, FileText, File, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ContentWithAssets, getAssetUrl, ContentAssetRole } from "@/hooks/useContentItems";
import { ContentSignalsBar } from "@/components/content/ContentSignalsBar";
import { toast } from "sonner";

interface ContentDetailDrawerProps {
  content: ContentWithAssets | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddVariation?: (contentId: string) => void;
}

const ROLE_LABELS: Record<ContentAssetRole, string> = {
  PRIMARY: "Principal",
  THUMBNAIL: "Miniatura",
  CARD_1x1: "1:1 (Quadrado)",
  CARD_4x5: "4:5 (Instagram)",
  STORY_9x16: "9:16 (Stories)",
  THUMB_16x9: "16:9 (YouTube)",
  ATTACHMENT: "Anexo",
};

const ROLE_ORDER: ContentAssetRole[] = [
  "PRIMARY",
  "CARD_1x1",
  "CARD_4x5",
  "STORY_9x16",
  "THUMB_16x9",
  "THUMBNAIL",
  "ATTACHMENT",
];

function getIconForKind(kind: string) {
  switch (kind) {
    case "image": return FileImage;
    case "video": return FileVideo;
    case "document": return FileText;
    default: return File;
  }
}

export function ContentDetailDrawer({
  content,
  open,
  onOpenChange,
  onAddVariation,
}: ContentDetailDrawerProps) {
  if (!content) return null;

  const assets = content.content_assets || [];
  const primaryAsset = assets.find(a => a.role === "PRIMARY")?.asset;
  const primaryUrl = primaryAsset ? getAssetUrl(primaryAsset.bucket, primaryAsset.path) : null;
  const isImage = primaryAsset?.kind === "image";

  // Group assets by role for download dropdown
  const assetsByRole = ROLE_ORDER.reduce((acc, role) => {
    const roleAssets = assets.filter(a => a.role === role && a.asset);
    if (roleAssets.length > 0) {
      acc.push({ role, assets: roleAssets });
    }
    return acc;
  }, [] as { role: ContentAssetRole; assets: typeof assets }[]);

  const handleCopyCaption = async () => {
    const text = content.legenda_whatsapp || content.description || "";
    const hashtags = content.hashtags?.length ? "\n\n" + content.hashtags.join(" ") : "";
    
    await navigator.clipboard.writeText(text + hashtags);
    toast.success("Legenda copiada!");
  };

  const handleDownloadAsset = (asset: NonNullable<typeof primaryAsset>) => {
    const url = getAssetUrl(asset.bucket, asset.path);
    const link = document.createElement("a");
    link.href = url;
    link.download = asset.title || "arquivo";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    for (const ca of assets) {
      if (ca.asset) {
        handleDownloadAsset(ca.asset);
      }
    }
    toast.success(`${assets.length} arquivo(s) baixado(s)!`);
  };

  const handleShare = async () => {
    if (!primaryUrl) {
      toast.error("Nenhum arquivo para compartilhar");
      return;
    }

    // Try native share
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.legenda_whatsapp || content.description || "",
          url: primaryUrl,
        });
        return;
      } catch (e) {
        // User cancelled or not supported
      }
    }

    // Fallback: copy link
    await navigator.clipboard.writeText(primaryUrl);
    toast.success("Link copiado!");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <span className="truncate">{content.title}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Preview */}
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
            {isImage && primaryUrl ? (
              <img
                src={primaryUrl}
                alt={content.title}
                className="w-full h-full object-contain"
              />
            ) : primaryUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                {(() => {
                  const Icon = getIconForKind(primaryAsset?.kind || "other");
                  return <Icon className="h-16 w-16 text-muted-foreground" />;
                })()}
                <p className="text-sm text-muted-foreground capitalize">{primaryAsset?.kind}</p>
                <Button size="sm" variant="secondary" onClick={() => window.open(primaryUrl, "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Abrir
                </Button>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              {content.type === "SHAREPACK" ? "📦 Sharepack" : content.type === "TEMPLATE" ? "🎨 Template" : "📄 Material"}
            </Badge>
            {content.parent_content_id && (
              <Badge variant="outline" className="text-primary">Variação</Badge>
            )}
            {content.tags?.map(tag => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>

          {/* Caption */}
          {(content.legenda_whatsapp || content.description) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Legenda</p>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm whitespace-pre-wrap">
                  {content.legenda_whatsapp || content.description}
                </p>
              </div>
            </div>
          )}

          {/* Hashtags */}
          {content.hashtags && content.hashtags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Hashtags</p>
              <div className="flex flex-wrap gap-1">
                {content.hashtags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Hook / CTA */}
          {(content.hook || content.cta) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Dica de uso</p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                {content.hook && <p className="font-medium">{content.hook}</p>}
                {content.cta && <p className="text-muted-foreground">{content.cta}</p>}
              </div>
            </div>
          )}

          {/* Signals */}
          <ContentSignalsBar contentId={content.id} />

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {/* Download Dropdown */}
            {assets.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar arquivos ({assets.length})
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {assets.length > 1 && (
                    <>
                      <DropdownMenuItem onClick={handleDownloadAll}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar todos ({assets.length})
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {assetsByRole.map(({ role, assets: roleAssets }) => (
                    <div key={role}>
                      {roleAssets.map((ca, idx) => {
                        if (!ca.asset) return null;
                        const Icon = getIconForKind(ca.asset.kind);
                        return (
                          <DropdownMenuItem
                            key={ca.id}
                            onClick={() => handleDownloadAsset(ca.asset!)}
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {ROLE_LABELS[role]}
                            {roleAssets.length > 1 && ` (${idx + 1})`}
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Copy & Share */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleCopyCaption}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar legenda
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </div>

            {/* Variation */}
            {content.type === "SHAREPACK" && onAddVariation && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  onAddVariation(content.id);
                  onOpenChange(false);
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Enviar variação deste pacote
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
