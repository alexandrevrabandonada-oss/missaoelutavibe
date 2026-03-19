import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type AssetKind = "image" | "video" | "document" | "audio" | "other";
export type AssetStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface Asset {
  id: string;
  title: string;
  kind: AssetKind;
  bucket: string;
  path: string;
  mime_type: string | null;
  size: number | null;
  tags: string[];
  status: AssetStatus;
  thumb_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface UseAssetsOptions {
  status?: AssetStatus | "all";
  kind?: AssetKind | "all";
  search?: string;
  tag?: string;
}

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

function getStoragePath(kind: AssetKind): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  switch (kind) {
    case "image":
    case "video":
      return `sharepacks/${year}-${month}`;
    case "document":
      return `materiais`;
    default:
      return `sharepacks/${year}-${month}`;
  }
}

export function useAssets(options: UseAssetsOptions = {}) {
  const { status = "all", kind = "all", search = "", tag } = options;

  return useQuery({
    queryKey: ["assets", status, kind, search, tag],
    queryFn: async () => {
      let query = supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (status !== "all") {
        query = query.eq("status", status);
      }

      if (kind !== "all") {
        query = query.eq("kind", kind);
      }

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      if (tag) {
        query = query.contains("tags", [tag]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Asset[];
    },
  });
}

export function useAssetUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Usuário não autenticado");

      const mimeType = file.type;
      const kind = getKindFromMime(mimeType);
      const storagePath = getStoragePath(kind);
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const fullPath = `${storagePath}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("assets-public")
        .upload(fullPath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create asset record
      const { data: asset, error: insertError } = await supabase
        .from("assets")
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
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

      if (insertError) throw insertError;

      return asset as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({
        title: "Arquivo enviado",
        description: "O arquivo foi enviado e está aguardando aprovação.",
      });
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    },
  });

  const uploadMultiple = async (files: File[]) => {
    const results = [];
    for (const file of files) {
      try {
        const result = await uploadMutation.mutateAsync(file);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }
    return results;
  };

  return {
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    uploadMultiple,
    isUploading: uploadMutation.isPending,
    uploadProgress,
  };
}

export function useAssetActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: AssetStatus;
    }) => {
      const { error } = await supabase
        .from("assets")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({
        title: "Status atualizado",
        description: "O status do arquivo foi alterado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<Asset, "title" | "tags" | "status">>;
    }) => {
      const { error } = await supabase
        .from("assets")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o arquivo.",
        variant: "destructive",
      });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (asset: Asset) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(asset.bucket)
        .remove([asset.path]);

      if (storageError) {
        console.warn("Storage delete error:", storageError);
      }

      // Delete record
      const { error } = await supabase.from("assets").delete().eq("id", asset.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi removido.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o arquivo.",
        variant: "destructive",
      });
    },
  });

  const getPublicUrl = (asset: Asset): string => {
    const { data } = supabase.storage.from(asset.bucket).getPublicUrl(asset.path);
    return data.publicUrl;
  };

  const copyLink = async (asset: Asset) => {
    const url = getPublicUrl(asset);
    await navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado",
      description: "O link foi copiado para a área de transferência.",
    });
  };

  const downloadAsset = (asset: Asset) => {
    const url = getPublicUrl(asset);
    const link = document.createElement("a");
    link.href = url;
    link.download = asset.title;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    updateStatus: updateStatusMutation.mutate,
    updateAsset: updateAssetMutation.mutate,
    deleteAsset: deleteAssetMutation.mutate,
    getPublicUrl,
    copyLink,
    downloadAsset,
    isUpdating: updateStatusMutation.isPending || updateAssetMutation.isPending,
    isDeleting: deleteAssetMutation.isPending,
  };
}
