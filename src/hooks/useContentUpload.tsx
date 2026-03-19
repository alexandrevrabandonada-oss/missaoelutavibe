import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ContentType = "MATERIAL" | "SHAREPACK" | "TEMPLATE";
export type AssetKind = "image" | "video" | "audio" | "document" | "other";
export type ContentAssetRole = "PRIMARY" | "THUMBNAIL" | "CARD_1x1" | "CARD_4x5" | "STORY_9x16" | "THUMB_16x9" | "ATTACHMENT";

function getKindFromMime(mimeType: string): AssetKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text/") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  )
    return "document";
  return "other";
}

function getRoleFromKind(kind: AssetKind): ContentAssetRole {
  switch (kind) {
    case "image":
    case "video":
      return "PRIMARY";
    case "document":
      return "ATTACHMENT";
    default:
      return "ATTACHMENT";
  }
}

function getStoragePath(type: ContentType, kind: AssetKind): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  switch (type) {
    case "MATERIAL":
      return `materiais/${year}-${month}`;
    case "SHAREPACK":
      return `sharepacks/${year}-${month}`;
    case "TEMPLATE":
      return `templates/${year}-${month}`;
    default:
      return `uploads/${year}-${month}`;
  }
}

interface UploadInput {
  file: File;
  type: ContentType;
  tags?: string[];
  parentContentId?: string;
  title?: string;
  caption?: string;
}

export function useContentUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, tags = [], parentContentId, title, caption }: UploadInput) => {
      if (!user) throw new Error("Usuário não autenticado");

      const mimeType = file.type;
      const kind = getKindFromMime(mimeType);
      const role = getRoleFromKind(kind);
      const storagePath = getStoragePath(type, kind);
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const fullPath = `${storagePath}/${fileName}`;
      const fileTitle = title || file.name.replace(/\.[^/.]+$/, "");

      // 1. Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("assets-public")
        .upload(fullPath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Create asset record
      const { data: asset, error: assetError } = await supabase
        .from("assets")
        .insert({
          title: fileTitle,
          kind,
          bucket: "assets-public",
          path: fullPath,
          mime_type: mimeType,
          size: file.size,
          status: "DRAFT",
          created_by: user.id,
        })
        .select()
        .single();

      if (assetError) throw assetError;

      // 3. Create content_item
      const { data: contentItem, error: contentError } = await supabase
        .from("content_items")
        .insert({
          type,
          title: fileTitle,
          status: "DRAFT",
          tags,
          scope_tipo: "global",
          created_by: user.id,
          parent_content_id: parentContentId || null,
          legenda_whatsapp: caption || null,
        })
        .select()
        .single();

      if (contentError) throw contentError;

      // 4. Link asset to content_item
      const { error: linkError } = await supabase
        .from("content_assets")
        .insert({
          content_id: contentItem.id,
          asset_id: asset.id,
          role,
          ordem: 0,
        });

      if (linkError) throw linkError;

      return { contentItem, asset };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Conteúdo criado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Upload error:", error);
      toast.error("Erro no upload", { description: error.message });
    },
  });

  return {
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}

// Hook to migrate existing orphan assets to content_items
export function useMigrateOrphanAssets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Get all assets that are not linked to any content_item
      const { data: allAssets, error: assetsError } = await supabase
        .from("assets")
        .select("id, title, kind, tags, status, created_by");

      if (assetsError) throw assetsError;

      // 2. Get all already linked asset IDs
      const { data: linkedAssets, error: linkedError } = await supabase
        .from("content_assets")
        .select("asset_id");

      if (linkedError) throw linkedError;

      const linkedIds = new Set(linkedAssets?.map((la) => la.asset_id) || []);

      // 3. Filter orphan assets
      const orphanAssets = allAssets?.filter((a) => !linkedIds.has(a.id)) || [];

      if (orphanAssets.length === 0) {
        return { migrated: 0 };
      }

      // 4. Create content_items for each orphan asset
      let migrated = 0;
      for (const asset of orphanAssets) {
        // Determine type based on kind
        const type: ContentType = asset.kind === "document" ? "MATERIAL" : "SHAREPACK";
        const role: ContentAssetRole = asset.kind === "document" ? "ATTACHMENT" : "PRIMARY";

        // Create content_item
        const { data: contentItem, error: contentError } = await supabase
          .from("content_items")
          .insert({
            type,
            title: asset.title,
            status: asset.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
            tags: asset.tags || [],
            scope_tipo: "global",
            created_by: asset.created_by,
          })
          .select()
          .single();

        if (contentError) {
          console.error("Error creating content item for asset:", asset.id, contentError);
          continue;
        }

        // Link asset
        const { error: linkError } = await supabase
          .from("content_assets")
          .insert({
            content_id: contentItem.id,
            asset_id: asset.id,
            role,
            ordem: 0,
          });

        if (linkError) {
          console.error("Error linking asset:", asset.id, linkError);
          continue;
        }

        migrated++;
      }

      return { migrated, total: orphanAssets.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["content-items"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success(`${result.migrated} arquivo(s) migrado(s) com sucesso!`);
    },
    onError: (error: Error) => {
      console.error("Migration error:", error);
      toast.error("Erro na migração", { description: error.message });
    },
  });
}
