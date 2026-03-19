import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye, ExternalLink, FileText, Image, Video, File } from "lucide-react";
import { ContentSignalsBar } from "./ContentSignalsBar";
import { type ContentWithAssets, getPrimaryAssetUrl, getAssetUrl } from "@/hooks/useContentItems";
import { cn } from "@/lib/utils";

interface MaterialCardProps {
  content: ContentWithAssets;
  onView?: () => void;
}

const KIND_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  document: FileText,
  other: File,
};

export function MaterialCard({ content, onView }: MaterialCardProps) {
  const primaryUrl = getPrimaryAssetUrl(content);
  const primaryAsset = content.content_assets?.find((ca) => ca.role === "PRIMARY")?.asset;
  const IconComponent = primaryAsset?.kind ? KIND_ICONS[primaryAsset.kind] || File : File;

  const handleDownload = () => {
    if (!primaryAsset) return;
    const url = getAssetUrl(primaryAsset.bucket, primaryAsset.path);
    const link = document.createElement("a");
    link.href = url;
    link.download = primaryAsset.title || "download";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = primaryAsset?.kind === "image";
  const isVideo = primaryAsset?.kind === "video";

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail / Preview */}
      <div
        className={cn(
          "relative aspect-video bg-muted flex items-center justify-center",
          "group cursor-pointer"
        )}
        onClick={onView}
      >
        {isImage && primaryUrl ? (
          <img
            src={primaryUrl}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : isVideo && primaryUrl ? (
          <video
            src={primaryUrl}
            className="w-full h-full object-cover"
            muted
          />
        ) : (
          <IconComponent className="h-12 w-12 text-muted-foreground" />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={onView}>
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
        </div>

        {/* Status badge */}
        {content.status !== "PUBLISHED" && (
          <Badge
            variant={content.status === "DRAFT" ? "secondary" : "outline"}
            className="absolute top-2 right-2"
          >
            {content.status === "DRAFT" ? "Rascunho" : "Arquivado"}
          </Badge>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">{content.title}</h3>
        {content.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {content.description}
          </p>
        )}
        {content.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {content.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {content.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{content.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-3 pt-0 flex flex-col gap-2">
        <ContentSignalsBar contentId={content.id} size="sm" />
        
        <div className="flex gap-2 w-full">
          {primaryAsset && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-1" />
              Baixar
            </Button>
          )}
          {primaryUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(primaryUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
