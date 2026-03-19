import { useState } from "react";
import {
  FileImage,
  FileVideo,
  FileText,
  FileAudio,
  File,
  MoreVertical,
  ExternalLink,
  Download,
  Copy,
  Trash2,
  CheckCircle,
  Clock,
  Archive,
  Package,
  FileCode,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ContentWithAssets, usePublishContent, useArchiveContent, ContentType, ContentStatus } from "@/hooks/useContentItems";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ContentItemGridProps {
  items: ContentWithAssets[];
  isLoading?: boolean;
  showStatusActions?: boolean;
  onAddVariation?: (contentId: string) => void;
}

function getIconForType(type: ContentType) {
  switch (type) {
    case "MATERIAL":
      return FileText;
    case "SHAREPACK":
      return Package;
    case "TEMPLATE":
      return FileCode;
    default:
      return File;
  }
}

function getIconForKind(kind: string) {
  switch (kind) {
    case "image":
      return FileImage;
    case "video":
      return FileVideo;
    case "audio":
      return FileAudio;
    case "document":
      return FileText;
    default:
      return File;
  }
}

function getTypeLabel(type: ContentType): string {
  switch (type) {
    case "MATERIAL":
      return "Material";
    case "SHAREPACK":
      return "Sharepack";
    case "TEMPLATE":
      return "Template";
    default:
      return type;
  }
}

function getAssetUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function ContentItemCard({
  item,
  showStatusActions,
  onAddVariation,
}: {
  item: ContentWithAssets;
  showStatusActions?: boolean;
  onAddVariation?: (contentId: string) => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const publishContent = usePublishContent();
  const archiveContent = useArchiveContent();
  const queryClient = useQueryClient();

  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete content_assets
      await supabase.from("content_assets").delete().eq("content_id", id);
      // Then delete content_item
      const { error } = await supabase.from("content_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      toast.success("Conteúdo excluído!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir", { description: error.message });
    },
  });

  // Get primary asset for preview
  const primaryAsset = item.content_assets?.find(
    (ca) => ca.role === "PRIMARY" && ca.asset
  )?.asset;

  const TypeIcon = getIconForType(item.type as ContentType);
  const AssetIcon = primaryAsset ? getIconForKind(primaryAsset.kind) : File;
  const isImage = primaryAsset?.kind === "image";
  const previewUrl = primaryAsset ? getAssetUrl(primaryAsset.bucket, primaryAsset.path) : null;

  const handleCopyLink = async () => {
    if (previewUrl) {
      await navigator.clipboard.writeText(previewUrl);
      toast.success("Link copiado!");
    }
  };

  const handleDownload = () => {
    if (previewUrl && primaryAsset) {
      const link = document.createElement("a");
      link.href = previewUrl;
      link.download = primaryAsset.title;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md",
          item.status === "DRAFT" && "border-amber-500/50"
        )}
      >
        {/* Preview Area */}
        <div className="relative aspect-square bg-muted">
          {isImage && previewUrl ? (
            <img
              src={previewUrl}
              alt={item.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <TypeIcon className="h-12 w-12 text-muted-foreground" />
              {primaryAsset && (
                <span className="text-xs text-muted-foreground capitalize">
                  {primaryAsset.kind}
                </span>
              )}
            </div>
          )}

          {/* Type Badge */}
          <Badge
            variant="secondary"
            className="absolute right-2 top-2"
          >
            {getTypeLabel(item.type as ContentType)}
          </Badge>

          {/* Status Badge */}
          {item.status === "DRAFT" && (
            <Badge
              variant="outline"
              className="absolute left-2 top-2 border-amber-500 bg-amber-500/10 text-amber-700"
            >
              <Clock className="mr-1 h-3 w-3" />
              Rascunho
            </Badge>
          )}
          {item.status === "ARCHIVED" && (
            <Badge variant="secondary" className="absolute left-2 top-2">
              <Archive className="mr-1 h-3 w-3" />
              Arquivado
            </Badge>
          )}

          {/* Actions Overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            {previewUrl && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open(previewUrl, "_blank")}
                  aria-label="Abrir arquivo"
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDownload}
                  aria-label="Baixar arquivo"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-medium leading-tight">
              {item.title}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  aria-label="Mais opções"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {previewUrl && (
                  <>
                    <DropdownMenuItem onClick={() => window.open(previewUrl, "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar link
                    </DropdownMenuItem>
                  </>
                )}

                {/* Add Variation (for SHAREPACK) */}
                {item.type === "SHAREPACK" && onAddVariation && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onAddVariation(item.id)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Enviar variação
                    </DropdownMenuItem>
                  </>
                )}

                {showStatusActions && (
                  <>
                    <DropdownMenuSeparator />
                    {item.status !== "PUBLISHED" && (
                      <DropdownMenuItem
                        onClick={() => publishContent.mutate(item.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Aprovar
                      </DropdownMenuItem>
                    )}
                    {item.status !== "ARCHIVED" && (
                      <DropdownMenuItem
                        onClick={() => archiveContent.mutate(item.id)}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Arquivar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Asset count */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{item.content_assets?.length || 0} arquivo(s)</span>
            {item.parent_content_id && (
              <>
                <span>•</span>
                <span className="text-primary">Variação</span>
              </>
            )}
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {item.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conteúdo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O conteúdo "{item.title}" será
              removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContentMutation.mutate(item.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteContentMutation.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ContentItemGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-square" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContentItemGrid({
  items,
  isLoading,
  showStatusActions,
  onAddVariation,
}: ContentItemGridProps) {
  if (isLoading) {
    return <ContentItemGridSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <Package className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Nenhum conteúdo encontrado</p>
        <p className="text-sm text-muted-foreground">
          Envie arquivos acima para criar conteúdo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ContentItemCard
          key={item.id}
          item={item}
          showStatusActions={showStatusActions}
          onAddVariation={onAddVariation}
        />
      ))}
    </div>
  );
}
