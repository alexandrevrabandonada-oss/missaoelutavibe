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
import { Asset, AssetKind, useAssetActions } from "@/hooks/useAssets";
import { Skeleton } from "@/components/ui/skeleton";

interface AssetGridProps {
  assets: Asset[];
  isLoading?: boolean;
  showStatusActions?: boolean;
}

function getIconForKind(kind: AssetKind) {
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

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetCard({
  asset,
  showStatusActions,
}: {
  asset: Asset;
  showStatusActions?: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { getPublicUrl, copyLink, downloadAsset, updateStatus, deleteAsset, isDeleting } =
    useAssetActions();

  const Icon = getIconForKind(asset.kind as AssetKind);
  const publicUrl = getPublicUrl(asset);
  const isImage = asset.kind === "image";

  return (
    <>
      <div
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md",
          asset.status === "DRAFT" && "border-amber-500/50"
        )}
      >
        {/* Preview Area */}
        <div className="relative aspect-square bg-muted">
          {isImage ? (
            <img
              src={publicUrl}
              alt={asset.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Status Badge */}
          {asset.status === "DRAFT" && (
            <Badge
              variant="outline"
              className="absolute left-2 top-2 border-amber-500 bg-amber-500/10 text-amber-700"
            >
              <Clock className="mr-1 h-3 w-3" />
              Aguardando aprovação
            </Badge>
          )}
          {asset.status === "ARCHIVED" && (
            <Badge variant="secondary" className="absolute left-2 top-2">
              <Archive className="mr-1 h-3 w-3" />
              Arquivado
            </Badge>
          )}

          {/* Actions Overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(publicUrl, "_blank")}
              aria-label="Abrir arquivo"
            >
              <ExternalLink className="mr-1 h-4 w-4" />
              Ver
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadAsset(asset)}
              aria-label="Baixar arquivo"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-medium leading-tight">
              {asset.title}
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
                <DropdownMenuItem onClick={() => window.open(publicUrl, "_blank")}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadAsset(asset)}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyLink(asset)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar link
                </DropdownMenuItem>

                {showStatusActions && (
                  <>
                    <DropdownMenuSeparator />
                    {asset.status !== "PUBLISHED" && (
                      <DropdownMenuItem
                        onClick={() => updateStatus({ id: asset.id, status: "PUBLISHED" })}
                      >
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Aprovar
                      </DropdownMenuItem>
                    )}
                    {asset.status !== "ARCHIVED" && (
                      <DropdownMenuItem
                        onClick={() => updateStatus({ id: asset.id, status: "ARCHIVED" })}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Arquivar
                      </DropdownMenuItem>
                    )}
                    {asset.status === "ARCHIVED" && (
                      <DropdownMenuItem
                        onClick={() => updateStatus({ id: asset.id, status: "DRAFT" })}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Voltar para rascunho
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

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{asset.kind}</span>
            <span>•</span>
            <span>{formatFileSize(asset.size)}</span>
          </div>

          {asset.tags && asset.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {asset.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {asset.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{asset.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo "{asset.title}" será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAsset(asset)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AssetGridSkeleton() {
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

export function AssetGrid({ assets, isLoading, showStatusActions }: AssetGridProps) {
  if (isLoading) {
    return <AssetGridSkeleton />;
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <File className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Nenhum arquivo encontrado</p>
        <p className="text-sm text-muted-foreground">
          Arraste arquivos ou clique no botão acima para adicionar.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          showStatusActions={showStatusActions}
        />
      ))}
    </div>
  );
}
